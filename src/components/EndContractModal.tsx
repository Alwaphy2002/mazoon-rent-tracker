"use client";

import { useState } from "react";
import { endContract } from "@/app/actions";
import { Button, ErrorText, Field, TextArea, TextInput } from "@/components/ui";
import { formatSAR } from "@/lib/format";

export function EndContractModal({
  contractId,
  tenantName,
  depositAmount,
  onClose,
  onDone,
}: {
  contractId: string;
  tenantName: string;
  depositAmount: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [refundAmount, setRefundAmount] = useState(String(depositAmount));
  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [refundNotes, setRefundNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await endContract({
      contractId,
      refundAmount: parseFloat(refundAmount) || 0,
      refundDate,
      refundNotes,
    });
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
        <h3 className="font-bold text-ink text-lg">إنهاء عقد {tenantName}</h3>
        <p className="text-sm text-ink-soft">
          مبلغ التأمين المسجل: {formatSAR(depositAmount)}. حدد المبلغ المسترد للمستأجر (كامل أو
          جزء منه حسب حالة الوحدة).
        </p>
        <Field label="مبلغ التأمين المسترد">
          <TextInput
            type="number"
            min={0}
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
          />
        </Field>
        <Field label="تاريخ الاسترداد">
          <TextInput
            type="date"
            value={refundDate}
            onChange={(e) => setRefundDate(e.target.value)}
          />
        </Field>
        <Field label="ملاحظات الاسترداد (اختياري)">
          <TextArea value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" type="button">
            إلغاء
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={loading} className="flex-1" type="button">
            {loading ? "جارٍ الإنهاء..." : "تأكيد إنهاء العقد"}
          </Button>
        </div>
      </div>
    </div>
  );
}
