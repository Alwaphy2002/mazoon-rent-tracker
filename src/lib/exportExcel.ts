import * as XLSX from "xlsx";
import type { ContractWithUnits } from "@/lib/types";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import { formatDate, contractEndDate, nextDueDate } from "@/lib/dates";

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
