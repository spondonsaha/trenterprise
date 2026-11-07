import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();
  return <AppShell user={user}>{children}</AppShell>;
}
