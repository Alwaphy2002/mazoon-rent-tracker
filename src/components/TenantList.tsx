"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ContractWithUnits } from "@/lib/types";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import { markPayment, updateNotes } from "@/app/actions";
import { formatSAR, buildWhatsAppReminderLink } from "@/lib/format";
import { formatDate, contractEndDate, nextDueDate, monthKeyLabel, currentMonthKey } from "@/lib/dates";
import { Badge, Button, Card, TextArea } from "@/components/ui";
import { EndContractModal } from "@/components/EndContractModal";

export function TenantList({
  contracts,
  showWhatsApp = false,
}: {
  contracts: ContractWithUnits[];
  showWhatsApp?: boolean;
}) {
  const router = useRouter();
  const [endingId, setEndingId] = useState<string | null>(null);

  if (contracts.length === 0) {
    return <p className="text-ink-soft text-center py-10">لا يوجد مستأجرون في هذه القائمة.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {contracts.map((c) => (
        <TenantCard
          key={c.id}
          contract={c}
          showWhatsApp={showWhatsApp}
          onEndContract={() => setEndingId(c.id)}
        />
      ))}

      {endingId && (
        <EndContractModal
          contractId={endingId}
          tenantName={contracts.find((c) => c.id === endingId)?.tenant_name ?? ""}
          depositAmount={contracts.find((c) => c.id === endingId)?.deposit_amount ?? 0}
          onClose={() => setEndingId(null)}
          onDone={() => {
            setEndingId(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TenantCard({
  contract,
  showWhatsApp,
  onEndContract,
}: {
  contract: ContractWithUnits;
  showWhatsApp: boolean;
  onEndContract: () => void;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(contract.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [togglingPayment, setTogglingPayment] = useState(false);

  const unitsLabel = contract.contract_units
    .map((cu) => `${cu.unit.code} (${UNIT_TYPE_LABELS[cu.unit.type]})`)
    .join(" + ");

  async function togglePayment() {
    setTogglingPayment(true);
    await markPayment(
      contract.id,
      contract.current_payment_status === "paid" ? "unpaid" : "paid"
    );
    setTogglingPayment(false);
    router.refresh();
  }

  async function saveNotes() {
    setSavingNotes(true);
    await updateNotes(contract.id, notes);
    setSavingNotes(false);
  }

  const whatsappLink = showWhatsApp
    ? buildWhatsAppReminderLink(
        contract.phone,
        contract.tenant_name,
        monthKeyLabel(currentMonthKey()),
        contract.monthly_rent
      )
    : null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-bold text-ink text-lg">{contract.tenant_name}</h3>
          <p className="text-sm text-ink-soft">{unitsLabel}</p>
        </div>
        <Badge status={contract.current_payment_status} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
        <InfoItem label="رقم الهوية" value={contract.national_id} />
        <InfoItem label="رقم الجوال" value={contract.phone} dir="ltr" />
        <InfoItem label="الإيجار الشهري" value={formatSAR(contract.monthly_rent)} />
        <InfoItem label="مبلغ التأمين" value={formatSAR(contract.deposit_amount)} />
        <InfoItem label="في حساب المالك" value={contract.owner_account || "—"} />
        <InfoItem
          label="مدة العقد"
          value={`${contract.duration_months} ${contract.duration_months === 1 ? "شهر" : "أشهر"}`}
        />
        <InfoItem label="تاريخ بداية العقد" value={formatDate(contract.start_date)} />
        <InfoItem
          label="تاريخ نهاية العقد"
          value={formatDate(contractEndDate(contract.start_date, contract.duration_months))}
        />
        <InfoItem label="تاريخ الاستحقاق القادم" value={formatDate(nextDueDate())} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">ملاحظات</span>
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (contract.notes ?? "")) saveNotes();
          }}
          className="text-sm"
        />
        {savingNotes && <span className="text-xs text-ink-soft">جارٍ الحفظ...</span>}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant={contract.current_payment_status === "paid" ? "secondary" : "primary"}
          onClick={togglePayment}
          disabled={togglingPayment}
        >
          {contract.current_payment_status === "paid"
            ? "تعليم كغير مسدد"
            : "تعليم كمسدد لهذا الشهر"}
        </Button>

        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-[#25D366] text-white hover:brightness-95"
          >
            تذكير عبر واتساب
          </a>
        )}

        <Button variant="danger" onClick={onEndContract}>
          إنهاء العقد
        </Button>
      </div>
    </Card>
  );
}

function InfoItem({ label, value, dir }: { label: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex flex-col">
      <span className="text-ink-soft text-xs">{label}</span>
      <span className="text-ink font-medium" dir={dir}>
        {value}
      </span>
    </div>
  );
}
