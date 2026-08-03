import * as XLSX from "xlsx";
import type { Unit } from "@/lib/types";
import { UNIT_TYPE_LABELS } from "@/lib/types";

const HEADERS = {
  tenantName: "اسم المستأجر",
  nationalId: "رقم الهوية",
  phone: "رقم الجوال",
  unitCode: "رمز الغرفة أو المحل",
  rentPortion: "مبلغ إيجار هذه الوحدة",
  depositAmount: "مبلغ التأمين",
  startDate: "تاريخ بداية العقد (YYYY-MM-DD)",
  durationMonths: "مدة العقد بالأشهر",
  ownerAccount: "في حساب المالك",
  notes: "ملاحظات",
} as const;

export interface ImportRow {
  rowNumber: number;
  tenantName: string;
  nationalId: string;
  phone: string;
  unitCode: string;
  rentPortion: number;
  depositAmount: number;
  startDate: string;
  durationMonths: number;
  ownerAccount: string;
  notes: string;
}

export interface TenantPlan {
  tenantName: string;
  nationalId: string;
  phone: string;
  startDate: string;
  durationMonths: number;
  depositAmount: number;
  ownerAccount: string;
  notes: string;
  unitAllocations: { unitId: string; unitCode: string; rentPortion: number }[];
  errors: string[];
}

export function buildImportTemplate(vacantUnits: Unit[]) {
  const exampleRow = {
    [HEADERS.tenantName]: "محمد أحمد",
    [HEADERS.nationalId]: "1234567890",
    [HEADERS.phone]: "0512345678",
    [HEADERS.unitCode]: vacantUnits[0]?.code ?? "501",
    [HEADERS.rentPortion]: 1500,
    [HEADERS.depositAmount]: 1500,
    [HEADERS.startDate]: new Date().toISOString().slice(0, 10),
    [HEADERS.durationMonths]: 12,
    [HEADERS.ownerAccount]: "",
    [HEADERS.notes]: "لدمج عدة وحدات لنفس المستأجر، كرر رقم الهوية في صف إضافي بنفس الاسم",
  };

  const sheet = XLSX.utils.json_to_sheet([exampleRow]);
  sheet["!cols"] = Object.keys(exampleRow).map(() => ({ wch: 26 }));
  sheet["!dir"] = "rtl";

  const codesSheet = XLSX.utils.json_to_sheet(
    vacantUnits.map((u) => ({ "رمز الوحدة الشاغرة": u.code, النوع: UNIT_TYPE_LABELS[u.type] }))
  );
  codesSheet["!cols"] = [{ wch: 20 }, { wch: 20 }];
  codesSheet["!dir"] = "rtl";

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "بيانات المستأجرين");
  XLSX.utils.book_append_sheet(wb, codesSheet, "الوحدات الشاغرة");
  XLSX.writeFile(wb, "نموذج_استيراد_المستأجرين.xlsx");
}

function normalizeDate(v: unknown): string {
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  return String(v ?? "").trim();
}

export function parseImportFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        resolve(
          rows.map((r, i) => ({
            rowNumber: i + 2,
            tenantName: String(r[HEADERS.tenantName] ?? "").trim(),
            nationalId: String(r[HEADERS.nationalId] ?? "").trim(),
            phone: String(r[HEADERS.phone] ?? "").trim(),
            unitCode: String(r[HEADERS.unitCode] ?? "").trim(),
            rentPortion: Number(r[HEADERS.rentPortion] ?? 0),
            depositAmount: Number(r[HEADERS.depositAmount] ?? 0),
            startDate: normalizeDate(r[HEADERS.startDate]),
            durationMonths: Number(r[HEADERS.durationMonths] ?? 12),
            ownerAccount: String(r[HEADERS.ownerAccount] ?? "").trim(),
            notes: String(r[HEADERS.notes] ?? "").trim(),
          }))
        );
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// Groups rows by national ID so multiple units for the same tenant (merged
// shops) can be entered as separate rows and combined into one contract.
export function groupRows(rows: ImportRow[], unitsByCode: Map<string, Unit>): TenantPlan[] {
  const groups = new Map<string, ImportRow[]>();
  for (const r of rows) {
    if (!r.tenantName && !r.nationalId && !r.unitCode) continue;
    const key = r.nationalId || r.tenantName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const usedCodes = new Set<string>();
  const plans: TenantPlan[] = [];

  for (const groupRowsList of groups.values()) {
    const first = groupRowsList[0];
    const errors: string[] = [];
    const unitAllocations: TenantPlan["unitAllocations"] = [];

    if (!first.tenantName) errors.push("اسم المستأجر مفقود");
    if (!first.nationalId) errors.push("رقم الهوية مفقود");
    if (!first.phone) errors.push("رقم الجوال مفقود");
    if (!first.startDate) errors.push("تاريخ بداية العقد مفقود أو غير صالح");
    if (!(first.durationMonths >= 1 && first.durationMonths <= 12)) {
      errors.push("مدة العقد يجب أن تكون بين 1 و 12 شهرًا");
    }

    for (const r of groupRowsList) {
      if (!r.unitCode) {
        errors.push(`الصف ${r.rowNumber}: رمز الوحدة مفقود`);
        continue;
      }
      const unit = unitsByCode.get(r.unitCode);
      if (!unit) {
        errors.push(`الصف ${r.rowNumber}: الرمز "${r.unitCode}" غير موجود`);
        continue;
      }
      if (usedCodes.has(r.unitCode)) {
        errors.push(`الصف ${r.rowNumber}: الوحدة "${r.unitCode}" غير شاغرة أو مكررة في الملف`);
        continue;
      }
      usedCodes.add(r.unitCode);
      unitAllocations.push({ unitId: unit.id, unitCode: unit.code, rentPortion: r.rentPortion || 0 });
    }

    if (unitAllocations.length === 0) errors.push("لا توجد وحدة صالحة لهذا المستأجر");

    const depositAmount = groupRowsList.reduce((s, r) => s + (r.depositAmount || 0), 0);

    plans.push({
      tenantName: first.tenantName,
      nationalId: first.nationalId,
      phone: first.phone,
      startDate: first.startDate,
      durationMonths: first.durationMonths || 12,
      depositAmount,
      ownerAccount: first.ownerAccount,
      notes: first.notes,
      unitAllocations,
      errors,
    });
  }

  return plans;
}
