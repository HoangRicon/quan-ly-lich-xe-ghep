import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ROUTES = [
  { departure: "Hà Nội", destination: "Hải Phòng" },
  { departure: "Hà Nội", destination: "Hạ Long" },
  { departure: "Hà Nội", destination: "Nam Định" },
  { departure: "Hà Nội", destination: "Thái Bình" },
  { departure: "Hà Nội", destination: "Ninh Bình" },
  { departure: "Hà Nội", destination: "Hưng Yên" },
  { departure: "Hà Nội", destination: "Bắc Ninh" },
  { departure: "Hà Nội", destination: "Vĩnh Phúc" },
  { departure: "HCM", destination: "Đà Lạt" },
  { departure: "HCM", destination: "Vũng Tàu" },
  { departure: "HCM", destination: "Cần Thơ" },
  { departure: "HCM", destination: "Tiền Giang" },
  { departure: "HCM", destination: "Bình Dương" },
  { departure: "HCM", destination: "Đồng Nai" },
  { departure: "HCM", destination: "Long An" },
  { departure: "Đà Nẵng", destination: "Hội An" },
  { departure: "Đà Nẵng", destination: "Huế" },
  { departure: "Đà Nẵng", destination: "Quảng Nam" },
  { departure: "Cần Thơ", destination: "An Giang" },
  { departure: "Cần Thơ", destination: "Đồng Tháp" },
];

const NAMES = [
  "Nguyễn Văn Minh", "Trần Thị Lan", "Lê Hoàng Nam", "Phạm Thị Hương",
  "Hoàng Đức Anh", "Vũ Thị Mai", "Đặng Minh Tuấn", "Bùi Thị Ngọc",
  "Đỗ Văn Hùng", "Ngô Thị Thu", "Trịnh Đình Khoa", "Lý Thị Phương",
  "Phan Văn Đạt", "Võ Thị Hà", "Dương Minh Tâm", "Đinh Thu Hà",
  "Lưu Văn Quang", "Tạ Thị Linh", "Hồ Đức Phúc", "Nguyễn Thị Hồng",
  "Trần Văn Dũng", "Phạm Hoàng Sơn", "Lê Thu Hường", "Bùi Văn Tiến",
  "Đặng Hoàng Minh", "Nguyễn Thị Lan", "Trần Hoàng Giang", "Lê Văn Hùng",
  "Phạm Thị Hà", "Hoàng Văn Tùng", "Vũ Đức Cường", "Ngô Thị Nga",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack = 90, daysForward = 30) {
  const now = Date.now();
  const start = now - daysBack * 24 * 60 * 60 * 1000;
  const end = now + daysForward * 24 * 60 * 60 * 1000;
  return new Date(start + Math.random() * (end - start));
}

async function main() {
  console.log("Seeding 500 trips...\n");

  // Get default account
  const account = await prisma.account.findUnique({ where: { slug: "default" } });
  if (!account) {
    throw new Error("Default account not found. Run `npx tsx seed.js` first.");
  }

  // Get existing drivers (users with role driver)
  const drivers = await prisma.user.findMany({
    where: { accountId: account.id, role: "driver" },
    select: { id: true },
  });

  console.log(`Found ${drivers.length} drivers`);

  // Get existing customers
  const customers = await prisma.customer.findMany({
    where: { accountId: account.id },
    select: { id: true },
  });

  console.log(`Found ${customers.length} customers`);

  // Ensure we have enough customers
  if (customers.length < 50) {
    console.log(`Creating 100 customers...`);
    const newCustomers = [];
    for (let i = 0; i < 100; i++) {
      newCustomers.push({
        phone: `090${String(randomInt(1000000, 9999999))}`,
        name: randomChoice(NAMES),
        accountId: account.id,
      });
    }
    await prisma.customer.createMany({ data: newCustomers, skipDuplicates: true });
    const allCustomers = await prisma.customer.findMany({
      where: { accountId: account.id },
      select: { id: true },
    });
    customers.length = 0;
    customers.push(...allCustomers);
    console.log(`Now have ${customers.length} customers`);
  }

  // Status distribution
  const STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];
  const STATUS_WEIGHTS = [0.15, 0.20, 0.55, 0.10]; // 15% scheduled, 20% in_progress, 55% completed, 10% cancelled

  function weightedStatus(): string {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < STATUSES.length; i++) {
      cum += STATUS_WEIGHTS[i];
      if (r <= cum) return STATUSES[i];
    }
    return "completed";
  }

  const BATCH_SIZE = 50;
  const TOTAL = 500;
  let created = 0;

  for (let batch = 0; batch < Math.ceil(TOTAL / BATCH_SIZE); batch++) {
    const batchData = [];
    const count = Math.min(BATCH_SIZE, TOTAL - created);

    for (let i = 0; i < count; i++) {
      const route = randomChoice(ROUTES);
      const status = weightedStatus();
      const departureTime = randomDate(90, 30);

      // Price based on route
      const basePrice = randomInt(150000, 600000);
      const profitRate = randomInt(20, 45) / 100;
      const profit = Math.round(basePrice * profitRate);

      // Assign driver if not scheduled or if we have drivers
      const driverId =
        status !== "scheduled" && drivers.length > 0
          ? randomChoice(drivers).id
          : null;

      batchData.push({
        title: `${route.departure} → ${route.destination}`,
        departure: route.departure,
        destination: route.destination,
        departureTime,
        arrivalTime:
          status === "completed"
            ? new Date(departureTime.getTime() + randomInt(2, 8) * 60 * 60 * 1000)
            : null,
        price: basePrice,
        totalSeats: randomInt(1, 4),
        status,
        driverId,
        profit: status === "completed" ? profit : null,
        pointsEarned: status === "completed" ? randomInt(1, 5) : 0,
        profitRate,
        tripDirection: "oneway",
        tripType: "ghep",
        accountId: account.id,
        createdById: null,
      });
    }

    await prisma.trip.createMany({ data: batchData });
    created += count;
    process.stdout.write(`\rCreated ${created}/${TOTAL} trips...`);
  }

  console.log(`\n\nDone! Created ${TOTAL} trips.`);

  // Print stats
  const stats = await prisma.trip.groupBy({
    by: ["status"],
    _count: true,
    where: { accountId: account.id },
  });

  console.log("\nTrip status breakdown:");
  for (const s of stats) {
    console.log(`  ${s.status}: ${s._count}`);
  }

  const totalRevenue = await prisma.trip.aggregate({
    _sum: { price: true },
    where: { accountId: account.id, status: "completed" },
  });

  const totalProfit = await prisma.trip.aggregate({
    _sum: { profit: true },
    where: { accountId: account.id, status: "completed" },
  });

  console.log(
    `\nTotal completed revenue: ${Number(totalRevenue._sum.price ?? 0).toLocaleString("vi-VN")}đ`
  );
  console.log(
    `Total completed profit: ${Number(totalProfit._sum.profit ?? 0).toLocaleString("vi-VN")}đ`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
