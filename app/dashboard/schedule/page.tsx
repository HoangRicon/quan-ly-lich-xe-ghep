import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import ScheduleList from "@/components/schedule-list";

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-2 lg:p-4 pb-24 lg:pb-4">
          <ScheduleList />
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
