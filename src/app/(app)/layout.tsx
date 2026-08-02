import { requireUser } from "@/lib/auth";
import { NavShell } from "@/components/NavShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();

  return (
    <NavShell role={session.profile.role} fullName={session.profile.full_name ?? session.email ?? ""}>
      {children}
    </NavShell>
  );
}
