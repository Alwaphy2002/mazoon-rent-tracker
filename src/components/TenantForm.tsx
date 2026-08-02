"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTenant } from "@/app/actions";
import { UNIT_TYPE_LABELS, type Unit, type UnitType } from "@/lib/types";
import { formatSAR } from "@/lib/format";
import { nextDueDate, formatDate } from "@/lib/dates";
import { Button, Card, ErrorText, Field, Select, TextArea, TextInput } from "@/components/ui";

const TYPE_ORDER: UnitType[] = ["single", "suite1", "suite2", "shop"];

export function TenantForm({ vacantUnits }: { vacantUnits: Unit[] }) {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationMonths, setDurationMonths] = useState(12);
  const [depositAmount, setDepositAmount] = useState("");
  const [ownerAccount, setOwnerAccount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({}); // unitId -> rent portion string
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<UnitType, Unit[]>();
    for (const t of TYPE_ORDER) map.set(t, []);
    for (const u of vacantUnits) map.get(u.type)?.push(u);
    return map;
  }, [vacantUnits]);

  const totalRent = Object.values(selectedUnits).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  );

  function toggleUnit(unitId: string) {
    setSelectedUnits((prev) => {
      const next = { ...prev };
      if (unitId in next) {
        delete next[unitId];
      } else {
        next[unitId] = "";
      }
      return next;
    });
  }

  function setPortion(unitId: string, value: string) {
    setSelectedUnits((prev) => ({ ...prev, [unitId]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const unitIds = Object.keys(selectedUnits);
    if (unitIds.length === 0) {
      setError("يرجى اختيار غرفة أو محل واحد على الأقل");
      return;
    }

    setLoading(true);
    const result = await createTenant({
      tenantName,
      nationalId,
      phone,
      startDate,
      durationMonths,
      depositAmount: parseFloat(depositAmount) || 0,
      ownerAccount,
      notes,
      unitAllocations: unitIds.map((id) => ({
        unitId: id,
        rentPortion: parseFloat(selectedUnits[id]) || 0,
      })),
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/tenants");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <h2 className="font-bold text-ink">بيانات المستأجر</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="اسم المستأجر">
            <TextInput
              required
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
            />
          </Field>
          <Field label="رقم الهوية">
            <TextInput
              required
              inputMode="numeric"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
            />
          </Field>
          <Field label="رقم الجوال">
            <TextInput
              required
              inputMode="tel"
              dir="ltr"
              placeholder="05XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="في حساب المالك">
            <TextInput
              value={ownerAccount}
              onChange={(e) => setOwnerAccount(e.target.value)}
              placeholder="مثال: حساب الأهلي - أبو محمد"
            />
          </Field>
          <Field label="تاريخ استحقاق الإيجار والتأمين (بداية العقد)">
            <TextInput
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="مدة العقد (بالأشهر)">
            <Select
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} {m === 1 ? "شهر" : "أشهر"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="مبلغ التأمين">
            <TextInput
              type="number"
              min={0}
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="تاريخ الاستحقاق القادم">
            <TextInput readOnly disabled value={formatDate(nextDueDate())} />
          </Field>
        </div>
        <Field label="ملاحظات">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-ink">اختيار الغرفة / المحل</h2>
          <span className="text-sm text-ink-soft">
            يمكن اختيار أكثر من محل لدمجها لنفس المستأجر
          </span>
        </div>

        {TYPE_ORDER.map((type) => {
          const units = grouped.get(type) ?? [];
          if (units.length === 0) return null;
          return (
            <div key={type} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-ink-soft">{UNIT_TYPE_LABELS[type]}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {units.map((u) => {
                  const selected = u.id in selectedUnits;
                  return (
                    <div
                      key={u.id}
                      className={`rounded-lg border p-2 flex flex-col gap-1.5 transition ${
                        selected
                          ? "border-[var(--color-gold)] bg-[var(--color-gold-light)]/20"
                          : "border-[var(--color-border)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleUnit(u.id)}
                        className="text-sm font-semibold text-ink text-center"
                      >
                        {u.code}
                      </button>
                      {selected && (
                        <TextInput
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="الإيجار"
                          value={selectedUnits[u.id]}
                          onChange={(e) => setPortion(u.id, e.target.value)}
                          className="text-sm px-2 py-1.5"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {vacantUnits.length === 0 && (
          <p className="text-sm text-ink-soft">لا توجد غرف أو محلات شاغرة حاليًا.</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
          <span className="font-medium text-ink-soft">الإيجار الشهري الإجمالي</span>
          <span className="font-bold text-lg text-[var(--color-gold-dark)]">
            {formatSAR(totalRent)}
          </span>
        </div>
      </Card>

      <ErrorText>{error}</ErrorText>
      <Button type="submit" disabled={loading}>
        {loading ? "جارٍ الحفظ..." : "حفظ المستأجر"}
      </Button>
    </form>
  );
}
