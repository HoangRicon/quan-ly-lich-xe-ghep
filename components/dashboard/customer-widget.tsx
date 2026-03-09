import { Star, MapPin, Clock } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  phone: string;
  totalTrips: number;
  points: number;
  lastTrip: string;
  avatar?: string;
}

const mockCustomers: Customer[] = [
  {
    id: 1,
    name: "Nguyễn Thanh Hùng",
    phone: "0912 345 678",
    totalTrips: 45,
    points: 1250,
    lastTrip: "2 giờ trước",
  },
  {
    id: 2,
    name: "Trần Minh Đức",
    phone: "0987 654 321",
    totalTrips: 32,
    points: 890,
    lastTrip: "5 giờ trước",
  },
  {
    id: 3,
    name: "Lê Hoàng Nam",
    phone: "0934 567 890",
    totalTrips: 28,
    points: 720,
    lastTrip: "1 ngày trước",
  },
  {
    id: 4,
    name: "Phạm Gia Linh",
    phone: "0978 123 456",
    totalTrips: 21,
    points: 540,
    lastTrip: "2 ngày trước",
  },
];

export function CustomerWidget() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Khách hàng thân thiết</h2>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Xem tất cả
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {mockCustomers.map((customer) => (
          <div key={customer.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white font-semibold">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-800">{customer.name}</p>
                  <p className="text-xs text-slate-500">{customer.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-slate-800">{customer.points}</span>
                </div>
                <p className="text-xs text-slate-500">{customer.totalTrips} chuyến</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Lần cuối: {customer.lastTrip}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
