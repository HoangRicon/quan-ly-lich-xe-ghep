import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";
import { TenantProvider } from "@/contexts/tenant-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect("/login");
  }

  return (
    <TenantProvider accountId={session.accountId}>
      {children}
    </TenantProvider>
  );
}
