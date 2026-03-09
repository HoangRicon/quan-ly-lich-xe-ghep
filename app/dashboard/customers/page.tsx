import { Sidebar, Header, BottomNav } from "@/components/dashboard";

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Quản lý khách hàng</h1>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-500">Trang quản lý khách hàng đang được xây dựng...</p>
          </div>
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
