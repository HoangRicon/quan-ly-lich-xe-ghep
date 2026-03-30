import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import ScheduleList from "@/components/schedule-list";

export default function SchedulePage() {
  return (
    <div className="page-wrapper">
      <Sidebar>
        <Header />
        <div className="p-2 lg:p-4 pb-24 lg:pb-0">
          <ScheduleList />
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
