import { requireUser } from "@/lib/auth";
import { getIncomeSummaryPublic, getPaidTenantsPublic, getRefundSummaryPublic } from "@/lib/data";
import { UNIT_TYPE_LABELS, type UnitType } from "@/lib/types";
import { formatSAR } from "@/lib/format";
import { formatDate, currentMonthKey } from "@/lib/dates";
import { Card, PageTitle, StatTile } from "@/components/ui";

export default async function InfoPage() {
  await requireUser();

  const monthKey = currentMonthKey();
  const [summary, paidTenants, refunds] = await Promise.all([
    getIncomeSummaryPublic(monthKey),
    getPaidTenantsPublic(monthKey),
    getRefundSummaryPublic(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <PageTitle>المعلومات العامة</PageTitle>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="إجمالي الدخل الشهري (بدون التأمين)"
            value={formatSAR(summary.total_monthly_income)}
            tone="gold"
          />
          <StatTile label="إجمالي مبالغ التأمين" value={formatSAR(summary.total_deposits)} />
          <StatTile
            label="عدد المسددين هذا الشهر"
            value={String(summary.paid_count)}
            tone="success"
          />
          <StatTile
            label="عدد غير المسددين هذا الشهر"
            value={String(summary.unpaid_count)}
            tone="danger"
          />
        </div>
      </div>

      <div>
        <h2 className="font-bold text-ink text-lg mb-3">المستأجرون المسددون لهذا الشهر</h2>
        {paidTenants.length === 0 ? (
          <p className="text-ink-soft text-sm">لا يوجد مستأجرون مسددون بعد لهذا الشهر.</p>
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
