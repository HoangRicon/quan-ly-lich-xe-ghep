import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import ScheduleList from "@/components/schedule-list";

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Quản lý lịch trình</h1>
          </div>
          <ScheduleList />
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
