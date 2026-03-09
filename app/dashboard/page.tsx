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
  const [trips, drivers] = await Promise.all([
    prisma.trip.findMany({
      take: 5,
      orderBy: { departureTime: "desc" },
      include: {
        driver: {
          select: { id: true, fullName: true, phone: true },
        },
        vehicle: {
          select: { id: true, name: true, licensePlate: true },
        },
        customers: {
          include: {
            customer: {
              select: { name: true, phone: true },
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
  ]);

  const [waitingCount, runningCount] = await Promise.all([
    prisma.trip.count({ where: { status: "scheduled" } }),
    prisma.trip.count({ where: { status: "in_progress" } }),
  ]);

  const driverAvailable = drivers.length;

  const formattedTrips = trips.map((trip) => ({
    id: trip.id,
    departure: trip.departure,
    destination: trip.destination,
    departureTime: trip.departureTime.toISOString(),
    status: trip.status,
    driver: trip.driver,
    vehicle: trip.vehicle,
    customer: trip.customers[0]?.customer,
  }));

  return {
    trips: formattedTrips,
    drivers,
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

  const { trips, drivers, stats } = await getDashboardData();

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
          />
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
