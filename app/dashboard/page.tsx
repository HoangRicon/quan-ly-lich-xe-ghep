import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard/reports");
}
