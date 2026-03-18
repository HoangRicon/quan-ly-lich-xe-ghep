import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import ScheduleList from "@/components/schedule-list";

export default async function DashboardPage() {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar>
        <Header user={{ name: session.fullName, email: session.email }} />
        
        <div className="p-2 lg:p-4 pb-24 lg:pb-4">
          <ScheduleList />
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
