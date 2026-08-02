import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function RootPage() {
  const session = await requireUser();
  redirect(session.profile.role === "admin" ? "/tenants" : "/info");
}
