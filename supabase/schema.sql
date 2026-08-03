-- ============================================================
-- مزون الشرق — نظام تحصيل الإيجار الشهري
-- Schema for Supabase (Postgres). Run this once in the
-- Supabase SQL editor on a fresh project.
-- ============================================================

-- ---------- Enums ----------
create type unit_type as enum ('single', 'suite1', 'suite2', 'shop');
create type unit_status as enum ('vacant', 'occupied');
create type contract_status as enum ('active', 'ended');
create type payment_status as enum ('paid', 'unpaid');
create type user_role as enum ('admin', 'viewer');

-- ---------- Profiles (extends auth.users with a role) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'viewer',
  username text unique,
  created_at timestamptz not null default now()
);

-- Lets the login page accept a short username instead of the full email.
-- Public (anon) callable by design — it only ever returns the email tied
-- to an existing username, nothing else.
create or replace function get_login_email(p_username text)
returns text
language sql stable
security definer set search_path = public
as $$
  select au.email
  from profiles p
  join auth.users au on au.id = p.id
  where p.username = p_username
  limit 1;
$$;

grant execute on function get_login_email(text) to anon;

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'viewer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Units (rooms & shops) ----------
create table units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,        -- e.g. '501' or 'محل 4'
  type unit_type not null,
  status unit_status not null default 'vacant',
  created_at timestamptz not null default now()
);

-- ---------- Contracts ----------
create table contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_name text not null,
  national_id text not null,
  phone text not null,
  start_date date not null,
  duration_months int not null check (duration_months between 1 and 12),
  monthly_rent numeric(12,2) not null check (monthly_rent >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  owner_account text,
  notes text,
  status contract_status not null default 'active',
  ended_at timestamptz,
  deposit_refund_amount numeric(12,2),
  deposit_refund_date date,
  deposit_refund_notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index contracts_status_idx on contracts(status);

-- ---------- Contract <-> Units (supports merging several shops/rooms under one tenant) ----------
create table contract_units (
  contract_id uuid not null references contracts(id) on delete cascade,
  unit_id uuid not null references units(id),
  rent_portion numeric(12,2) not null default 0,
  primary key (contract_id, unit_id)
);

-- ---------- Monthly payment records (full historical archive) ----------
create table payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  month_key text not null,              -- 'YYYY-MM'
  status payment_status not null default 'unpaid',
  marked_at timestamptz,
  marked_by uuid references profiles(id),
  unique (contract_id, month_key)
);

create index payments_contract_month_idx on payments(contract_id, month_key);

-- ============================================================
-- Row Level Security
-- ============================================================

create or replace function is_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table profiles enable row level security;
alter table units enable row level security;
alter table contracts enable row level security;
alter table contract_units enable row level security;
alter table payments enable row level security;

-- profiles: everyone can read their own row (needed to know their role);
-- admin can read/write every row.
create policy profiles_select_own on profiles
  for select using (id = auth.uid());
create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- units: any signed-in user can read; only admin can write.
create policy units_select on units
  for select using (auth.uid() is not null);
create policy units_admin_insert on units
  for insert with check (is_admin());
create policy units_admin_update on units
  for update using (is_admin()) with check (is_admin());
create policy units_admin_delete on units
  for delete using (is_admin());

-- contracts: contain tenant PII (national ID, phone, notes) — admin only.
-- Viewers get the aggregated, PII-free data through the RPC functions below.
create policy contracts_admin_select on contracts
  for select using (is_admin());
create policy contracts_admin_insert on contracts
  for insert with check (is_admin());
create policy contracts_admin_update on contracts
  for update using (is_admin()) with check (is_admin());
create policy contracts_admin_delete on contracts
  for delete using (is_admin());

-- contract_units
create policy contract_units_admin_select on contract_units
  for select using (is_admin());
create policy contract_units_admin_insert on contract_units
  for insert with check (is_admin());
create policy contract_units_admin_update on contract_units
  for update using (is_admin()) with check (is_admin());
create policy contract_units_admin_delete on contract_units
  for delete using (is_admin());

-- payments
create policy payments_admin_select on payments
  for select using (is_admin());
create policy payments_admin_insert on payments
  for insert with check (is_admin());
create policy payments_admin_update on payments
  for update using (is_admin()) with check (is_admin());
create policy payments_admin_delete on payments
  for delete using (is_admin());

-- ============================================================
-- Read-only summary functions for the "info" page
--
-- These run as security definer (bypassing RLS) but only ever
-- return aggregated, PII-free data (no national ID, phone, or
-- notes) — safe for the two view-only accounts to call directly.
-- ============================================================

create or replace function get_income_summary(p_month_key text)
returns table (
  total_monthly_income numeric,
  total_deposits numeric,
  active_count bigint,
  paid_count bigint,
  unpaid_count bigint
)
language sql stable
security definer set search_path = public
as $$
  -- A contract still counts toward rent income for a given month if it's
  -- active, or if it was ended during that same month (ending a contract
  -- shouldn't retroactively erase income already earned that month).
  -- Deposits held are different: once a contract ends the deposit is being
  -- returned, so it drops out of "total deposits held" immediately rather
  -- than lingering through the end of that month.
  with income_set as (
    select c.id, c.monthly_rent
    from contracts c
    where c.status = 'active'
       or (c.status = 'ended' and to_char(c.ended_at, 'YYYY-MM') = p_month_key)
  ),
  deposit_set as (
    select c.deposit_amount from contracts c where c.status = 'active'
  ),
  paid_ids as (
    select p.contract_id from payments p where p.month_key = p_month_key and p.status = 'paid'
  )
  select
    coalesce((select sum(monthly_rent) from income_set), 0),
    coalesce((select sum(deposit_amount) from deposit_set), 0),
    (select count(*) from income_set),
    (select count(*) from income_set where id in (select contract_id from paid_ids)),
    (select count(*) from income_set where id not in (select contract_id from paid_ids));
$$;

grant execute on function get_income_summary(text) to authenticated;

create or replace function get_paid_tenants(p_month_key text)
returns table (
  contract_id uuid,
  tenant_name text,
  monthly_rent numeric,
  units jsonb
)
language sql stable
security definer set search_path = public
as $$
  select
    c.id,
    c.tenant_name,
    c.monthly_rent,
    jsonb_agg(jsonb_build_object('code', u.code, 'type', u.type) order by u.code)
  from contracts c
  join payments p on p.contract_id = c.id and p.month_key = p_month_key and p.status = 'paid'
  join contract_units cu on cu.contract_id = c.id
  join units u on u.id = cu.unit_id
  where c.status = 'active'
     or (c.status = 'ended' and to_char(c.ended_at, 'YYYY-MM') = p_month_key)
  group by c.id, c.tenant_name, c.monthly_rent
  order by c.tenant_name;
$$;

grant execute on function get_paid_tenants(text) to authenticated;

create or replace function get_refund_summary()
returns table (
  contract_id uuid,
  tenant_name text,
  deposit_amount numeric,
  deposit_refund_amount numeric,
  deposit_refund_date date,
  deposit_refund_notes text
)
language sql stable
security definer set search_path = public
as $$
  select id, tenant_name, deposit_amount, deposit_refund_amount, deposit_refund_date, deposit_refund_notes
  from contracts
  where status = 'ended' and deposit_refund_amount is not null
  order by deposit_refund_date desc nulls last;
$$;

grant execute on function get_refund_summary() to authenticated;

-- ============================================================
-- Seed the building's rooms & shops
-- ============================================================

insert into units (code, type) values
  -- غرفة مفردة
  ('501','single'), ('502','single'), ('503','single'), ('504','single'),
  ('505','single'), ('506','single'), ('507','single'), ('508','single'),
  -- غرفة وصالة
  ('101','suite1'), ('102','suite1'), ('103','suite1'), ('104','suite1'),
  ('105','suite1'), ('106','suite1'), ('107','suite1'),
  ('202','suite1'), ('203','suite1'), ('204','suite1'), ('205','suite1'),
  ('206','suite1'), ('207','suite1'), ('209','suite1'),
  ('302','suite1'), ('303','suite1'), ('304','suite1'),
  ('307','suite1'), ('308','suite1'), ('309','suite1'),
  ('402','suite1'), ('403','suite1'), ('404','suite1'),
  ('407','suite1'), ('408','suite1'), ('409','suite1'),
  -- غرفتين وصالة
  ('201','suite2'), ('301','suite2'), ('305','suite2'), ('306','suite2'),
  ('310','suite2'), ('401','suite2'), ('405','suite2'), ('406','suite2'),
  ('410','suite2'), ('509','suite2'),
  -- محلات
  ('محل 4','shop'), ('محل 5','shop'), ('محل 6','shop'), ('محل 7','shop');

-- ============================================================
-- After running this file:
-- 1. Create your 3 users from Authentication > Users (or let them
--    sign up), then in the SQL editor run:
--      update profiles set role = 'admin' where id = '<admin-user-uuid>';
--    (the other two stay as 'viewer', which is the default)
-- ============================================================
