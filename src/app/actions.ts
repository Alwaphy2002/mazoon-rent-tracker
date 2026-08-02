"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentMonthKey } from "@/lib/dates";

function refreshTenantPages() {
  revalidatePath("/tenants");
  revalidatePath("/unpaid");
  revalidatePath("/info");
}

export interface CreateTenantInput {
  tenantName: string;
  nationalId: string;
  phone: string;
  startDate: string;
  durationMonths: number;
  depositAmount: number;
  ownerAccount: string;
  notes: string;
  unitAllocations: { unitId: string; rentPortion: number }[];
}

export async function createTenant(input: CreateTenantInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  if (input.unitAllocations.length === 0) {
    return { error: "يجب اختيار وحدة واحدة على الأقل" };
  }
  if (input.durationMonths < 1 || input.durationMonths > 12) {
    return { error: "مدة العقد يجب أن تكون بين 1 و 12 شهرًا" };
  }

  const monthlyRent = input.unitAllocations.reduce((s, u) => s + u.rentPortion, 0);

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      tenant_name: input.tenantName,
      national_id: input.nationalId,
      phone: input.phone,
      start_date: input.startDate,
      duration_months: input.durationMonths,
      monthly_rent: monthlyRent,
      deposit_amount: input.depositAmount,
      owner_account: input.ownerAccount || null,
      notes: input.notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (contractError || !contract) {
    return { error: contractError?.message ?? "تعذر إنشاء العقد" };
  }

  const contractUnitsRows = input.unitAllocations.map((u) => ({
    contract_id: contract.id,
    unit_id: u.unitId,
    rent_portion: u.rentPortion,
  }));
  const { error: cuError } = await supabase.from("contract_units").insert(contractUnitsRows);
  if (cuError) return { error: cuError.message };

  const unitIds = input.unitAllocations.map((u) => u.unitId);
  const { error: unitError } = await supabase
    .from("units")
    .update({ status: "occupied" })
    .in("id", unitIds);
  if (unitError) return { error: unitError.message };

  refreshTenantPages();
  return { error: null, contractId: contract.id as string };
}

export async function markPayment(contractId: string, status: "paid" | "unpaid") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "غير مصرح" };

  const monthKey = currentMonthKey();

  if (status === "paid") {
    const { error } = await supabase
      .from("payments")
      .upsert(
        {
          contract_id: contractId,
          month_key: monthKey,
          status: "paid",
          marked_at: new Date().toISOString(),
          marked_by: user.id,
        },
        { onConflict: "contract_id,month_key" }
      );
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("contract_id", contractId)
      .eq("month_key", monthKey);
    if (error) return { error: error.message };
  }

  refreshTenantPages();
  return { error: null };
}

export interface EndContractInput {
  contractId: string;
  refundAmount: number;
  refundDate: string;
  refundNotes: string;
}

export async function endContract(input: EndContractInput) {
  const supabase = await createClient();

  const { data: contractUnits } = await supabase
    .from("contract_units")
    .select("unit_id")
    .eq("contract_id", input.contractId);

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      deposit_refund_amount: input.refundAmount,
      deposit_refund_date: input.refundDate,
      deposit_refund_notes: input.refundNotes || null,
    })
    .eq("id", input.contractId);

  if (error) return { error: error.message };

  const unitIds = (contractUnits ?? []).map((cu) => cu.unit_id as string);
  if (unitIds.length > 0) {
    const { error: unitError } = await supabase
      .from("units")
      .update({ status: "vacant" })
      .in("id", unitIds);
    if (unitError) return { error: unitError.message };
  }

  refreshTenantPages();
  return { error: null };
}

export async function updateNotes(contractId: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update({ notes: notes || null })
    .eq("id", contractId);
  if (error) return { error: error.message };
  refreshTenantPages();
  return { error: null };
}
