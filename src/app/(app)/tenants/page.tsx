import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getActiveContracts, splitByPaymentStatus } from "@/lib/data";
import { TenantList } from "@/components/TenantList";
import { ExportButton } from "@/components/ExportButton";
import { Button, PageTitle } from "@/components/ui";

export default async function TenantsPage() {
  await requireAdmin();
  const contracts = await getActiveContracts();
  const { paid, unpaid } = splitByPaymentStatus(contracts);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <PageTitle>بيان المستأجرين</PageTitle>
        <div className="flex flex-wrap gap-2">
          <ExportButton contracts={paid} filename="المستأجرون_المسددون" label="تصدير المسددين" />
          <ExportButton
            contracts={unpaid}
            filename="المستأجرون_غير_المسددين"
            label="تصدير غير المسددين"
          />
          <Link href="/tenants/new">
            <Button type="button">إضافة مستأجر</Button>
          </Link>
        </div>
      </div>
      <TenantList contracts={contracts} />
    </div>
  );
}
