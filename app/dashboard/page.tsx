import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Sidebar,
  Header,
  MiniStatCards,
  RecentTrips,
  BottomNav,
} from "@/components/dashboard";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [trips, drivers, vehicles] = await Promise.all([
    prisma.trip.findMany({
      where: {
        departureTime: {
          gte: today,
          lt: tomorrow,
        },
      },
      take: 20,
      orderBy: { departureTime: "asc" },
      include: {
        driver: {
          select: { id: true, fullName: true, phone: true },
        },
        vehicle: {
          select: { id: true, name: true, licensePlate: true, vehicleType: true },
        },
        customers: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true },
            },
          },
          take: 1,
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "driver" },
      select: { id: true, fullName: true, phone: true },
    }),
    prisma.vehicle.findMany({
      where: { isActive: true },
      select: { id: true, name: true, licensePlate: true, vehicleType: true },
    }),
  ]);

  const [waitingCount, runningCount] = await Promise.all([
    prisma.trip.count({ where: { status: "scheduled", departureTime: { gte: today, lt: tomorrow } } }),
    prisma.trip.count({ where: { status: "in_progress", departureTime: { gte: today, lt: tomorrow } } }),
  ]);

  const driverAvailable = drivers.length;

  const formattedTrips = trips.map((trip) => ({
    id: trip.id,
    departure: trip.departure,
    destination: trip.destination,
    departureTime: trip.departureTime.toISOString(),
    status: trip.status,
    price: Number(trip.price),
    notes: trip.description || "",
    driver: trip.driver,
    vehicle: trip.vehicle,
    customer: trip.customers[0]?.customer,
  }));

  return {
    trips: formattedTrips,
    drivers,
    vehicles,
    stats: {
      waiting: waitingCount,
      running: runningCount,
      driverAvailable,
    },
  };
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { trips, drivers, vehicles, stats } = await getDashboardData();

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar>
        <Header user={{ name: session.fullName, email: session.email }} />
        
        <div className="p-4 lg:p-6 pb-24 lg:pb-6 space-y-4">
          {/* Welcome - Desktop only */}
          <div className="hidden lg:block mb-2">
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 mt-1">Chào mừng trở lại, {session.fullName || "Admin"}!</p>
          </div>

          {/* Stats Cards - Mobile Optimized */}
          <MiniStatCards stats={stats} />

          {/* Recent Trips */}
          <RecentTrips 
            initialTrips={trips}
            drivers={drivers}
            vehicles={vehicles}
          />
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
