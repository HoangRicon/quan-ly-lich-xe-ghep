import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import DriverList from "@/components/driver-list";

export default function DriversPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Quản lý tài xế</h1>
          </div>
          <DriverList />
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
