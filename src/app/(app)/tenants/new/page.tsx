import { requireAdmin } from "@/lib/auth";
import { getVacantUnits } from "@/lib/data";
import { TenantForm } from "@/components/TenantForm";
import { PageTitle } from "@/components/ui";

export default async function NewTenantPage() {
  await requireAdmin();
  const vacantUnits = await getVacantUnits();

  return (
    <div>
      <PageTitle>إضافة مستأجر جديد</PageTitle>
      <TenantForm vacantUnits={vacantUnits} />
    </div>
  );
}
