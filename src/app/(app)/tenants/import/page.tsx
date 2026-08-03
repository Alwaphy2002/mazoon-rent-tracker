import { requireAdmin } from "@/lib/auth";
import { getVacantUnits } from "@/lib/data";
import { ImportTenants } from "@/components/ImportTenants";
import { PageTitle } from "@/components/ui";

export default async function ImportTenantsPage() {
  await requireAdmin();
  const vacantUnits = await getVacantUnits();

  return (
    <div>
      <PageTitle>استيراد المستأجرين من Excel</PageTitle>
      <ImportTenants vacantUnits={vacantUnits} />
    </div>
  );
}
