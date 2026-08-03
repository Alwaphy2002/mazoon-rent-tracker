import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  getIncomeSummaryPublic,
  getPaidTenantsPublic,
  getRefundSummaryPublic,
  getUnitOccupancy,
} from "@/lib/data";
import { UNIT_TYPE_LABELS, type UnitType } from "@/lib/types";
import { formatSAR } from "@/lib/format";
import { formatDate, currentMonthKey, monthKeyLabel, shiftMonthKey } from "@/lib/dates";
import { Card, PageTitle, StatTile } from "@/components/ui";
import { InfoExportButton } from "@/components/InfoExportButton";

export default async function InfoPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireUser();

  const { month } = await searchParams;
  const monthKey = month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonthKey();
  const isCurrentMonth = monthKey === currentMonthKey();

  const [summary, paidTenants, refunds, occupancy] = await Promise.all([
    getIncomeSummaryPublic(monthKey),
    getPaidTenantsPublic(monthKey),
    getRefundSummaryPublic(),
    getUnitOccupancy(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <PageTitle>المعلومات العامة</PageTitle>
          <InfoExportButton monthKey={monthKey} summary={summary} paidTenants={paidTenants} />
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <Link
            href={`/info?month=${shiftMonthKey(monthKey, -1)}`}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-ink hover:bg-[var(--color-gold-light)]/20"
          >
            ← الشهر السابق
          </Link>
          <span className="font-bold text-ink min-w-32 text-center">{monthKeyLabel(monthKey)}</span>
          {!isCurrentMonth ? (
            <Link
              href={`/info?month=${shiftMonthKey(monthKey, 1)}`}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-ink hover:bg-[var(--color-gold-light)]/20"
            >
              الشهر التالي →
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-ink-soft opacity-40">
              الشهر التالي →
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="إجمالي الدخل الشهري (بدون التأمين)"
            value={formatSAR(summary.total_monthly_income)}
            tone="gold"
          />
          <StatTile label="إجمالي مبالغ التأمين" value={formatSAR(summary.total_deposits)} />
          <StatTile label="عدد المسددين" value={String(summary.paid_count)} tone="success" />
          <StatTile label="عدد غير المسددين" value={String(summary.unpaid_count)} tone="danger" />
        </div>
      </div>

      <div>
        <h2 className="font-bold text-ink text-lg mb-3">إشغال الغرف والمحلات</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatTile label="عدد الوحدات المستأجرة" value={String(occupancy.rentedCount)} tone="success" />
          <StatTile label="عدد الوحدات الشاغرة" value={String(occupancy.vacantUnits.length)} tone="gold" />
        </div>
        {occupancy.vacantUnits.length > 0 && (
          <Card className="flex flex-wrap gap-2">
            {occupancy.vacantUnits.map((u) => (
              <span
                key={u.id}
                className="text-sm px-3 py-1.5 rounded-full bg-[var(--color-gold-light)]/25 text-[var(--color-gold-dark)] font-medium"
              >
                {u.code} — {UNIT_TYPE_LABELS[u.type]}
              </span>
            ))}
          </Card>
        )}
      </div>

      <div>
        <h2 className="font-bold text-ink text-lg mb-3">المستأجرون المسددون ({monthKeyLabel(monthKey)})</h2>
        {paidTenants.length === 0 ? (
          <p className="text-ink-soft text-sm">لا يوجد مستأجرون مسددون لهذا الشهر.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {paidTenants.map((t) => (
              <Card key={t.contract_id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink">{t.tenant_name}</p>
                  <p className="text-xs text-ink-soft">
                    {t.units
                      .map((u) => `${u.code} (${UNIT_TYPE_LABELS[u.type as UnitType]})`)
                      .join(" + ")}
                  </p>
                </div>
                <span className="font-semibold text-[var(--color-success)]">
                  {formatSAR(t.monthly_rent)}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-bold text-ink text-lg mb-3">استرداد التأمين للعقود المنتهية</h2>
        {refunds.length === 0 ? (
          <p className="text-ink-soft text-sm">لا توجد عمليات استرداد تأمين مسجّلة بعد.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {refunds.map((r) => {
              const full = (r.deposit_refund_amount ?? 0) >= r.deposit_amount;
              return (
                <Card key={r.contract_id} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="font-semibold text-ink">{r.tenant_name}</p>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        full
                          ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                          : "bg-[var(--color-gold-light)]/40 text-[var(--color-gold-dark)]"
                      }`}
                    >
                      {full ? "استرداد كامل" : "استرداد جزئي"}
                    </span>
                  </div>
                  <p className="text-sm text-ink-soft">
                    مبلغ التأمين الأصلي: {formatSAR(r.deposit_amount)} — المسترد:{" "}
                    {formatSAR(r.deposit_refund_amount ?? 0)}
                    {r.deposit_refund_date ? ` بتاريخ ${formatDate(r.deposit_refund_date)}` : ""}
                  </p>
                  {r.deposit_refund_notes && (
                    <p className="text-sm text-ink-soft">ملاحظات: {r.deposit_refund_notes}</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
