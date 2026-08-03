"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { Unit } from "@/lib/types";
import { buildImportTemplate, parseImportFile, groupRows, type TenantPlan } from "@/lib/excelImport";
import { createTenant } from "@/app/actions";
import { Button, Card } from "@/components/ui";
import { formatSAR } from "@/lib/format";

export function ImportTenants({ vacantUnits }: { vacantUnits: Unit[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState<TenantPlan[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ name: string; ok: boolean; message: string }[] | null>(
    null
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const unitsByCode = new Map(vacantUnits.map((u) => [u.code, u]));
  const validCount = plans?.filter((p) => p.errors.length === 0).length ?? 0;

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParseError(null);
    setResults(null);
    try {
      const rows = await parseImportFile(file);
      setPlans(groupRows(rows, unitsByCode));
    } catch {
      setParseError("تعذر قراءة الملف. تأكد أنه بصيغة Excel (.xlsx) وبنفس تنسيق النموذج.");
    }
  }

  async function handleConfirm() {
    if (!plans) return;
    setImporting(true);
    const validPlans = plans.filter((p) => p.errors.length === 0);
    const outcomes: { name: string; ok: boolean; message: string }[] = [];

    for (const p of validPlans) {
      const result = await createTenant({
        tenantName: p.tenantName,
        nationalId: p.nationalId,
        phone: p.phone,
        startDate: p.startDate,
        durationMonths: p.durationMonths,
        depositAmount: p.depositAmount,
        ownerAccount: p.ownerAccount,
        notes: p.notes,
        unitAllocations: p.unitAllocations.map((u) => ({
          unitId: u.unitId,
          rentPortion: u.rentPortion,
        })),
      });
      outcomes.push({
        name: p.tenantName,
        ok: !result.error,
        message: result.error ?? "تم الحفظ بنجاح",
      });
    }

    setImporting(false);
    setResults(outcomes);
    setPlans(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">
          حمّل النموذج، عبّي بيانات المستأجرين (صف لكل وحدة — لدمج عدة محلات لنفس المستأجر، أضف
          صفًا إضافيًا بنفس رقم الهوية)، ثم ارفع الملف للمعاينة قبل التأكيد.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => buildImportTemplate(vacantUnits)}>
            تحميل نموذج Excel
          </Button>
          <label className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-[var(--color-gold)] text-black cursor-pointer hover:bg-[var(--color-gold-dark)] hover:text-white transition">
            اختر ملف Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          </label>
        </div>
        {parseError && <p className="text-sm text-[var(--color-danger)]">{parseError}</p>}
      </Card>

      {plans && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-bold text-ink">معاينة قبل الاستيراد ({plans.length} مستأجر)</h2>
          <div className="flex flex-col gap-2">
            {plans.map((p, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 text-sm ${
                  p.errors.length > 0
                    ? "border-[var(--color-danger)] bg-[var(--color-danger-bg)]"
                    : "border-[var(--color-success)] bg-[var(--color-success-bg)]"
                }`}
              >
                <p className="font-semibold text-ink">
                  {p.tenantName || "(بدون اسم)"} — {p.nationalId || "—"}
                </p>
                {p.unitAllocations.length > 0 && (
                  <p className="text-ink-soft">
                    الوحدات: {p.unitAllocations.map((u) => u.unitCode).join(" + ")} — الإجمالي:{" "}
                    {formatSAR(p.unitAllocations.reduce((s, u) => s + u.rentPortion, 0))}
                  </p>
                )}
                {p.errors.length > 0 && (
                  <ul className="list-disc pr-5 text-[var(--color-danger)]">
                    {p.errors.map((err, j) => (
                      <li key={j}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <Button type="button" onClick={handleConfirm} disabled={importing || validCount === 0}>
            {importing ? "جارٍ الاستيراد..." : `تأكيد استيراد (${validCount} صالح)`}
          </Button>
        </Card>
      )}

      {results && (
        <Card className="flex flex-col gap-2">
          <h2 className="font-bold text-ink">نتيجة الاستيراد</h2>
          {results.map((r, i) => (
            <p key={i} className={r.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}>
              {r.ok ? "✅" : "❌"} {r.name} — {r.message}
            </p>
          ))}
        </Card>
      )}
    </div>
  );
}
