"use client";

import type { RpcIncomeSummary, RpcPaidTenant } from "@/lib/data";
import { exportIncomeSummaryToExcel } from "@/lib/exportExcel";
import { Button } from "@/components/ui";

export function InfoExportButton({
  monthKey,
  summary,
  paidTenants,
}: {
  monthKey: string;
  summary: RpcIncomeSummary;
  paidTenants: RpcPaidTenant[];
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => exportIncomeSummaryToExcel(monthKey, summary, paidTenants)}
    >
      تصدير Excel (الدخل + المستأجرون)
    </Button>
  );
}
