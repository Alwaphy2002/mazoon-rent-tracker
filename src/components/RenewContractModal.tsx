"use client";

import { useState } from "react";
import { renewContract } from "@/app/actions";
import { Button, ErrorText, Field, Select } from "@/components/ui";

export function RenewContractModal({
  contractId,
  tenantName,
  currentDurationMonths,
  onClose,
  onDone,
}: {
  contractId: string;
  tenantName: string;
  currentDurationMonths: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [additionalMonths, setAdditionalMonths] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await renewContract(contractId, additionalMonths);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-ink text-lg">تجديد عقد {tenantName}</h3>
        <p className="text-sm text-ink-soft">
          المدة الحالية للعقد: {currentDurationMonths}{" "}
          {currentDurationMonths === 1 ? "شهر" : "أشهر"}. المدة الجديدة تُضاف فوق المتبقي من
          العقد الحالي.
        </p>
        <Field label="عدد الأشهر الإضافية">
          <Select
            value={additionalMonths}
            onChange={(e) => setAdditionalMonths(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m} {m === 1 ? "شهر" : "أشهر"}
              </option>
            ))}
          </Select>
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" type="button">
            إلغاء
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="flex-1" type="button">
            {loading ? "جارٍ التجديد..." : "تأكيد التجديد"}
          </Button>
        </div>
      </div>
    </div>
  );
}
