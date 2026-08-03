import { createClient } from "@/lib/supabase/server";
import { currentMonthKey } from "@/lib/dates";
import type { ContractWithUnits, Unit } from "@/lib/types";

export async function getActiveContracts(): Promise<ContractWithUnits[]> {
  const supabase = await createClient();
  const monthKey = currentMonthKey();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*, contract_units(*, unit:units(*))")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!contracts || contracts.length === 0) return [];

  const contractIds = contracts.map((c) => c.id as string);
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .in("contract_id", contractIds)
    .eq("month_key", monthKey);

  const paidSet = new Set(
    (payments ?? [])
      .filter((p) => p.status === "paid")
      .map((p) => p.contract_id as string)
  );

  // Contracts longer than 1 month are paid in full upfront at signing, so
  // they're always "paid" — only 1-month (month-to-month) contracts need
  // the monthly payments-table toggle.
  return (contracts as unknown as ContractWithUnits[]).map((c) => ({
    ...c,
    current_payment_status:
      c.duration_months > 1 || paidSet.has(c.id) ? "paid" : "unpaid",
  }));
}

export async function getAllUnits(): Promise<Unit[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("units").select("*").order("code");
  return (data as Unit[]) ?? [];
}

export async function getVacantUnits(): Promise<Unit[]> {
  const units = await getAllUnits();
  return units.filter((u) => u.status === "vacant");
}

export async function getUnitOccupancy(): Promise<{ rentedCount: number; vacantUnits: Unit[] }> {
  const units = await getAllUnits();
  return {
    rentedCount: units.filter((u) => u.status === "occupied").length,
    vacantUnits: units.filter((u) => u.status === "vacant"),
  };
}

export function splitByPaymentStatus(contracts: ContractWithUnits[]) {
  return {
    paid: contracts.filter((c) => c.current_payment_status === "paid"),
    unpaid: contracts.filter((c) => c.current_payment_status === "unpaid"),
  };
}

// ---------------------------------------------------------------
// The three functions below back the shared "info" page, which is
// visible to both the admin and the two view-only accounts. They
// call PII-free Postgres RPC functions (see supabase/schema.sql)
// instead of selecting straight from `contracts`, since viewers are
// not allowed to see national IDs, phone numbers, or notes.
// ---------------------------------------------------------------

export interface RpcIncomeSummary {
  total_monthly_income: number;
  total_deposits: number;
  paid_count: number;
  unpaid_count: number;
}

export async function getIncomeSummaryPublic(monthKey: string): Promise<RpcIncomeSummary> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_income_summary", { p_month_key: monthKey }).single();
  const row = data as Record<string, unknown> | null;
  return {
    total_monthly_income: Number(row?.total_monthly_income ?? 0),
    total_deposits: Number(row?.total_deposits ?? 0),
    paid_count: Number(row?.paid_count ?? 0),
    unpaid_count: Number(row?.unpaid_count ?? 0),
  };
}

export interface RpcPaidTenant {
  contract_id: string;
  tenant_name: string;
  monthly_rent: number;
  units: { code: string; type: string }[];
}

export async function getPaidTenantsPublic(monthKey: string): Promise<RpcPaidTenant[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_paid_tenants", { p_month_key: monthKey });
  return (data as RpcPaidTenant[]) ?? [];
}

export interface RpcRefundSummary {
  contract_id: string;
  tenant_name: string;
  deposit_amount: number;
  deposit_refund_amount: number | null;
  deposit_refund_date: string | null;
  deposit_refund_notes: string | null;
}

export async function getRefundSummaryPublic(): Promise<RpcRefundSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_refund_summary");
  return (data as RpcRefundSummary[]) ?? [];
}
