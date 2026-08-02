export type UnitType = "single" | "suite1" | "suite2" | "shop";
export type UnitStatus = "vacant" | "occupied";
export type ContractStatus = "active" | "ended";
export type PaymentStatus = "paid" | "unpaid";
export type UserRole = "admin" | "viewer";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Unit {
  id: string;
  code: string;
  type: UnitType;
  status: UnitStatus;
  created_at: string;
}

export interface Contract {
  id: string;
  tenant_name: string;
  national_id: string;
  phone: string;
  start_date: string;
  duration_months: number;
  monthly_rent: number;
  deposit_amount: number;
  owner_account: string | null;
  notes: string | null;
  status: ContractStatus;
  ended_at: string | null;
  deposit_refund_amount: number | null;
  deposit_refund_date: string | null;
  deposit_refund_notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ContractUnit {
  contract_id: string;
  unit_id: string;
  rent_portion: number;
}

export interface Payment {
  id: string;
  contract_id: string;
  month_key: string;
  status: PaymentStatus;
  marked_at: string | null;
  marked_by: string | null;
}

export interface ContractWithUnits extends Contract {
  contract_units: (ContractUnit & { unit: Unit })[];
  current_payment_status: PaymentStatus;
}

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  single: "غرفة مفردة",
  suite1: "غرفة وصالة",
  suite2: "غرفتين وصالة",
  shop: "محل",
};
