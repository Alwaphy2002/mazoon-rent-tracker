import { requireAdmin } from "@/lib/auth";
import { getActiveContracts, splitByPaymentStatus } from "@/lib/data";
import { TenantList } from "@/components/TenantList";
import { ExportButton } from "@/components/ExportButton";
import { PageTitle } from "@/components/ui";

export default async function UnpaidPage() {
  await requireAdmin();
  const contracts = await getActiveContracts();
  const { unpaid } = splitByPaymentStatus(contracts);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <PageTitle>المستأجرون غير المسددين ({unpaid.length})</PageTitle>
        <ExportButton contracts={unpaid} filename="المستأجرون_غير_المسددين" />
      </div>
      <TenantList contracts={unpaid} />
    </div>
  );
}
