import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  Sidebar,
  Header,
  StatCards,
  ScheduleTable,
  CustomerWidget,
  AlertCards,
  BottomNav,
} from "@/components/dashboard";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header user={{ name: session.fullName, email: session.email }} />
        
        <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 mt-1">Chào mừng trở lại, {session.fullName || "Admin"}!</p>
          </div>

          {/* Stats Cards */}
          <StatCards />

          {/* Alert Cards */}
          <AlertCards />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Schedule Table - Takes 2 columns */}
            <div className="lg:col-span-2">
              <ScheduleTable />
            </div>

            {/* Customer Widget */}
            <div>
              <CustomerWidget />
            </div>
          </div>
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
