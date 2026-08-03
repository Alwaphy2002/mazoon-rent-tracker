import * as XLSX from "xlsx";
import type { ContractWithUnits, UnitType } from "@/lib/types";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import { formatDate, contractEndDate, nextDueDate, monthKeyLabel } from "@/lib/dates";
import type { RpcIncomeSummary, RpcPaidTenant } from "@/lib/data";

export function exportContractsToExcel(contracts: ContractWithUnits[], filename: string) {
  const rows = contracts.map((c) => ({
    "اسم المستأجر": c.tenant_name,
    "رقم الهوية": c.national_id,
    "رقم الجوال": c.phone,
    "الوحدات": c.contract_units
      .map((cu) => `${cu.unit.code} (${UNIT_TYPE_LABELS[cu.unit.type]})`)
      .join(" + "),
    "مبلغ الإيجار الشهري": c.monthly_rent,
    "مبلغ التأمين": c.deposit_amount,
    "في حساب المالك": c.owner_account ?? "",
    "تاريخ بداية العقد": formatDate(c.start_date),
    "مدة العقد (أشهر)": c.duration_months,
    "تاريخ نهاية العقد": formatDate(contractEndDate(c.start_date, c.duration_months)),
    "تاريخ الاستحقاق القادم": formatDate(nextDueDate()),
    "حالة السداد لهذا الشهر": c.current_payment_status === "paid" ? "مسدد" : "غير مسدد",
    "ملاحظات": c.notes ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 22 }));
  worksheet["!dir"] = "rtl";

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المستأجرين");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportIncomeSummaryToExcel(
  monthKey: string,
  summary: RpcIncomeSummary,
  paidTenants: RpcPaidTenant[]
) {
  const summaryRows = [
    { البيان: "الشهر", القيمة: monthKeyLabel(monthKey) },
    { البيان: "إجمالي الدخل الشهري (ريال، بدون التأمين)", القيمة: summary.total_monthly_income },
    { البيان: "إجمالي مبالغ التأمين المحتجزة (ريال)", القيمة: summary.total_deposits },
    { البيان: "عدد المسددين", القيمة: summary.paid_count },
    { البيان: "عدد غير المسددين", القيمة: summary.unpaid_count },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 34 }, { wch: 20 }];
  summarySheet["!dir"] = "rtl";

  const tenantRows = paidTenants.map((t) => ({
    "اسم المستأجر": t.tenant_name,
    "الوحدات": t.units.map((u) => `${u.code} (${UNIT_TYPE_LABELS[u.type as UnitType]})`).join(" + "),
    "الإيجار الشهري": t.monthly_rent,
  }));
  const tenantSheet = XLSX.utils.json_to_sheet(tenantRows);
  tenantSheet["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 16 }];
  tenantSheet["!dir"] = "rtl";

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "الملخص");
  XLSX.utils.book_append_sheet(workbook, tenantSheet, "المستأجرون المسددون");
  XLSX.writeFile(workbook, `تقرير_الدخل_${monthKeyLabel(monthKey)}.xlsx`);
}
