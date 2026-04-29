/**
 * Seed script cho trang Báo cáo (Reports)
 *
 * Chạy: npx prisma db seed
 *
 * Script này thêm dữ liệu test vào account 4 (Lê Cường) mà KHÔNG xóa dữ liệu cũ.
 * Tạo:
 * - Tài xế test (3 drivers với profitRate khác nhau)
 * - Khách hàng test (12 customers)
 * - Chuyến xe test phong phú (completed, scheduled, forecast, cancelled)
 * - Đủ loại status để test stats
 *
 * Mật khẩu tất cả user test: Test@123456
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL environment variable is not set");

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
    allowExitOnIdle: false,
  });

  pool.on("error", (err) => console.error("Unexpected pool error:", err));

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

const prisma = createPrismaClient();

const ACCOUNT_ID = 4; // Lê Cường
const TEST_PASSWORD = "Test@123456";
const SEED_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);

const NOW = new Date();
NOW.setHours(0, 0, 0, 0);

function daysAgo(n: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  d.setHours(8, 0, 0, 0);
  return d;
}

function withTime(base: Date, hour: number, min = 0) {
  const d = new Date(base);
  d.setHours(hour, min, 0, 0);
  return d;
}

async function upsertUser(data: {
  email: string;
  fullName: string | null;
  role: string;
  phone?: string;
  profitRate?: number;
  formulaIds?: number[];
}) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      email: data.email,
      passwordHash: SEED_PASSWORD_HASH,
      fullName: data.fullName,
      role: data.role,
      phone: data.phone || null,
      profitRate: data.profitRate ?? 1000,
      formulaIds: data.formulaIds || [],
      accountId: ACCOUNT_ID,
    },
  });
}

async function upsertCustomer(phone: string, name: string, email?: string) {
  return prisma.customer.upsert({
    where: { idx_customers_account_phone: { phone, accountId: ACCOUNT_ID } },
    update: {},
    create: {
      phone,
      name,
      email: email || null,
      accountId: ACCOUNT_ID,
    },
  });
}

async function upsertFormula(data: {
  name: string;
  tripType: string;
  seats?: number;
  minPrice?: number;
  maxPrice?: number;
  points: number;
}) {
  const existing = await prisma.pricingFormula.findFirst({ where: { name: data.name, accountId: null } });
  if (existing) return existing;
  return prisma.pricingFormula.create({
    data: {
      name: data.name,
      tripType: data.tripType,
      seats: data.seats ?? null,
      minPrice: data.minPrice ?? null,
      maxPrice: data.maxPrice ?? null,
      points: data.points,
      isActive: true,
      sortOrder: 1,
    },
  });
}

async function createTrip(data: {
  title: string;
  departure: string;
  destination: string;
  departureTime: Date;
  status: string;
  price: number;
  profit: number | null;
  driverId?: number | null;
  tripType?: string;
  tripDirection?: string;
  totalSeats?: number;
  pointsEarned?: number | null;
  matchedFormulaId?: number | null;
  notes?: string;
}) {
  return prisma.trip.create({
    data: {
      ...data,
      arrivalTime: new Date(data.departureTime.getTime() + 3 * 60 * 60 * 1000),
      createdById: null,
      accountId: ACCOUNT_ID,
    },
  });
}

async function attachCustomerToTrip(tripId: number, customerId: number, seats = 1, status = "confirmed") {
  await prisma.tripCustomer.create({
    data: {
      tripId,
      customerId,
      seats,
      status,
      accountId: ACCOUNT_ID,
    },
  });
  await prisma.customer.update({
    where: { id: customerId },
    data: { totalTrips: { increment: 1 } },
  });
}

async function main() {
  console.log("\n========================================");
  console.log("🚀 SEED: Thêm dữ liệu test vào account Lê Cường (ID=4)");
  console.log(`   Hôm nay: ${NOW.toISOString().split("T")[0]}`);
  console.log("========================================\n");

  // 1. Seed formulas
  console.log("📋 [1/6] Seed Pricing Formulas...");
  const formula4 = await upsertFormula({ name: "Ghép 4 chỗ", tripType: "ghep", seats: 4, minPrice: 100000, maxPrice: 500000, points: 1 });
  const formula7 = await upsertFormula({ name: "Ghép 7 chỗ", tripType: "ghep", seats: 7, minPrice: 150000, maxPrice: 700000, points: 1.5 });
  const formulaBao = await upsertFormula({ name: "Bao 4 chỗ", tripType: "bao", seats: 4, minPrice: 300000, maxPrice: 1000000, points: 2 });
  console.log(`  ✓ Formula: Ghép 4 (id=${formula4.id}), Ghép 7 (id=${formula7.id}), Bao (id=${formulaBao.id})`);

  // 2. Seed drivers
  console.log("\n👥 [2/6] Seed Drivers (account 4)...");
  const d1 = await upsertUser({
    email: "driver-lecuong-1@test.com",
    fullName: "Nguyễn Văn An",
    role: "driver",
    phone: "0919000001",
    profitRate: 700,
    formulaIds: [formula4.id, formula7.id],
  });
  const d2 = await upsertUser({
    email: "driver-lecuong-2@test.com",
    fullName: "Trần Văn Bình",
    role: "driver",
    phone: "0919000002",
    profitRate: 800,
    formulaIds: [formula4.id, formulaBao.id],
  });
  const d3 = await upsertUser({
    email: "driver-lecuong-3@test.com",
    fullName: "Lê Thị Chung",
    role: "driver",
    phone: "0919000003",
    profitRate: 750,
    formulaIds: [formula7.id],
  });
  console.log(`  ✓ Driver 1: id=${d1.id} Nguyễn Văn An (profitRate=700)`);
  console.log(`  ✓ Driver 2: id=${d2.id} Trần Văn Bình (profitRate=800)`);
  console.log(`  ✓ Driver 3: id=${d3.id} Lê Thị Chung (profitRate=750)`);

  // 3. Seed customers
  console.log("\n👤 [3/6] Seed Customers (account 4)...");
  const customerTemplates = [
    { name: "Phạm Hoàng Nam", phone: "0944000001", email: "nam.pham@mail.com" },
    { name: "Võ Thị Hương", phone: "0944000002", email: "huong.vo@mail.com" },
    { name: "Đặng Minh Tuấn", phone: "0944000003", email: "tuan.dang@mail.com" },
    { name: "Lý Thanh Hà", phone: "0944000004", email: "ha.ly@mail.com" },
    { name: "Bùi Đức Phú", phone: "0944000005", email: "phu.bui@mail.com" },
    { name: "Hoàng Kim Oanh", phone: "0944000006", email: "oanh.hoang@mail.com" },
    { name: "Ngô Quốc Trung", phone: "0944000007", email: "trung.ngo@mail.com" },
    { name: "Trịnh Thanh Thảo", phone: "0944000008", email: "thao.trinh@mail.com" },
    { name: "Đinh Văn Hùng", phone: "0944000009", email: "hung.dinh@mail.com" },
    { name: "Chu Thị Mai", phone: "0944000010", email: "mai.chu@mail.com" },
    { name: "Hồ Đăng Khoa", phone: "0944000011", email: "khoa.ho@mail.com" },
    { name: "Phan Thị Lan", phone: "0944000012", email: "lan.phan@mail.com" },
  ];
  const customers = await Promise.all(customerTemplates.map(c => upsertCustomer(c.phone, c.name, c.email)));
  console.log(`  ✓ ${customers.length} customers created`);

  // 4. Seed trips
  console.log("\n🚐 [4/6] Seed Trips (account 4)...");
  const today = new Date(NOW);

  // ✅ COMPLETED (kỳ hiện tại: hôm nay - 7 ngày tới)
  const t1 = await createTrip({
    title: "SG - Vũng Tàu sáng nay",
    departure: "Sài Gòn", destination: "Vũng Tàu",
    departureTime: withTime(today, 7, 0),
    status: "completed", price: 250000, profit: 175000,
    driverId: d1.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 1, matchedFormulaId: formula4.id,
  });
  await attachCustomerToTrip(t1.id, customers[0].id, 2);
  await attachCustomerToTrip(t1.id, customers[1].id, 1);

  const t2 = await createTrip({
    title: "Đà Lạt - SG chiều",
    departure: "Đà Lạt", destination: "Sài Gòn",
    departureTime: withTime(today, 14, 0),
    status: "completed", price: 450000, profit: 360000,
    driverId: d2.id, tripType: "bao", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 2, matchedFormulaId: formulaBao.id,
  });
  await attachCustomerToTrip(t2.id, customers[2].id, 2);
  await attachCustomerToTrip(t2.id, customers[3].id, 1);

  const t3 = await createTrip({
    title: "Cần Thơ - SG",
    departure: "Cần Thơ", destination: "Sài Gòn",
    departureTime: withTime(daysAgo(2), 6, 30),
    status: "completed", price: 180000, profit: 135000,
    driverId: d3.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 7, pointsEarned: 1.5, matchedFormulaId: formula7.id,
  });
  await attachCustomerToTrip(t3.id, customers[4].id, 2);
  await attachCustomerToTrip(t3.id, customers[5].id, 1);

  const t4 = await createTrip({
    title: "Nha Trang - SG",
    departure: "Nha Trang", destination: "Sài Gòn",
    departureTime: withTime(daysAgo(1), 13, 0),
    status: "completed", price: 350000, profit: 245000,
    driverId: d1.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 1, matchedFormulaId: formula4.id,
  });
  await attachCustomerToTrip(t4.id, customers[6].id, 2);

  const t5 = await createTrip({
    title: "Mỹ Tho - SG",
    departure: "Mỹ Tho", destination: "Sài Gòn",
    departureTime: withTime(daysAgo(3), 9, 0),
    status: "completed", price: 120000, profit: 96000,
    driverId: d2.id, tripType: "ghep", tripDirection: "roundtrip",
    totalSeats: 7, pointsEarned: 1.5, matchedFormulaId: formula7.id,
  });
  await attachCustomerToTrip(t5.id, customers[7].id, 3);
  await attachCustomerToTrip(t5.id, customers[8].id, 1);

  // 📊 FORECAST (assigned + NOT completed)
  const t6 = await createTrip({
    title: "SG - VT chiều mai",
    departure: "Sài Gòn", destination: "Vũng Tàu",
    departureTime: withTime(daysFromNow(1), 14, 0),
    status: "scheduled", price: 250000, profit: 175000,
    driverId: d1.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 1, matchedFormulaId: formula4.id,
  });
  await attachCustomerToTrip(t6.id, customers[0].id, 1);
  await attachCustomerToTrip(t6.id, customers[9].id, 2);

  const t7 = await createTrip({
    title: "Đà Lạt - SG ngày mai",
    departure: "Đà Lạt", destination: "Sài Gòn",
    departureTime: withTime(daysFromNow(2), 8, 0),
    status: "in_progress", price: 500000, profit: 375000,
    driverId: d3.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 7, pointsEarned: 1.5, matchedFormulaId: formula7.id,
  });
  await attachCustomerToTrip(t7.id, customers[1].id, 3);

  const t8 = await createTrip({
    title: "Cần Thơ - SG ngày kia",
    departure: "Cần Thơ", destination: "Sài Gòn",
    departureTime: withTime(daysFromNow(3), 7, 0),
    status: "scheduled", price: 200000, profit: 160000,
    driverId: d2.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 1, matchedFormulaId: formula4.id,
  });
  await attachCustomerToTrip(t8.id, customers[2].id, 1);
  await attachCustomerToTrip(t8.id, customers[3].id, 1);

  const t9 = await createTrip({
    title: "Nha Trang - SG tuần này",
    departure: "Nha Trang", destination: "Sài Gòn",
    departureTime: withTime(daysFromNow(4), 10, 0),
    status: "in_progress", price: 380000, profit: 266000,
    driverId: d1.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 7, pointsEarned: 1.5, matchedFormulaId: formula7.id,
  });
  await attachCustomerToTrip(t9.id, customers[4].id, 2);

  // 🔓 UNASSIGNED
  const t10 = await createTrip({
    title: "SG - Mỹ Tho (chưa gán)",
    departure: "Sài Gòn", destination: "Mỹ Tho",
    departureTime: withTime(daysFromNow(2), 11, 0),
    status: "scheduled", price: 150000, profit: null,
    driverId: null, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4,
  });
  await attachCustomerToTrip(t10.id, customers[5].id, 1);

  const t11 = await createTrip({
    title: "Biên Hòa - SG (chưa gán)",
    departure: "Biên Hòa", destination: "Sài Gòn",
    departureTime: withTime(daysFromNow(3), 8, 30),
    status: "scheduled", price: 100000, profit: null,
    driverId: null, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4,
  });
  await attachCustomerToTrip(t11.id, customers[6].id, 2);

  // ❌ CANCELLED
  const t12 = await createTrip({
    title: "SG - Vũng Tàu (đã hủy)",
    departure: "Sài Gòn", destination: "Vũng Tàu",
    departureTime: withTime(daysAgo(1), 10, 0),
    status: "cancelled", price: 250000, profit: null,
    driverId: null, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4,
    notes: "Khách hủy vì trời mưa",
  });

  // 🗓️ KỲ TRƯỚC (30 ngày trước → hôm qua) - để test revenueChange
  const t13 = await createTrip({
    title: "[Kỳ trước] SG - Vũng Tàu",
    departure: "Sài Gòn", destination: "Vũng Tàu",
    departureTime: withTime(daysAgo(10), 8, 0),
    status: "completed", price: 220000, profit: 154000,
    driverId: d1.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 1, matchedFormulaId: formula4.id,
  });
  await attachCustomerToTrip(t13.id, customers[7].id, 2);

  const t14 = await createTrip({
    title: "[Kỳ trước] Đà Lạt - SG",
    departure: "Đà Lạt", destination: "Sài Gòn",
    departureTime: withTime(daysAgo(15), 13, 30),
    status: "completed", price: 420000, profit: 336000,
    driverId: d2.id, tripType: "bao", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 2, matchedFormulaId: formulaBao.id,
  });
  await attachCustomerToTrip(t14.id, customers[8].id, 2);

  const t15 = await createTrip({
    title: "[Kỳ trước] Cần Thơ - SG",
    departure: "Cần Thơ", destination: "Sài Gòn",
    departureTime: withTime(daysAgo(20), 7, 0),
    status: "completed", price: 180000, profit: 135000,
    driverId: d3.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 7, pointsEarned: 1.5, matchedFormulaId: formula7.id,
  });
  await attachCustomerToTrip(t15.id, customers[9].id, 3);

  const t16 = await createTrip({
    title: "[Kỳ trước] Nha Trang - SG (scheduled)",
    departure: "Nha Trang", destination: "Sài Gòn",
    departureTime: withTime(daysAgo(8), 9, 0),
    status: "scheduled", price: 350000, profit: 262500,
    driverId: d1.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 1, matchedFormulaId: formula4.id,
  });
  await attachCustomerToTrip(t16.id, customers[10].id, 1);

  const t17 = await createTrip({
    title: "[Kỳ trước] Mỹ Tho - SG (scheduled)",
    departure: "Mỹ Tho", destination: "Sài Gòn",
    departureTime: withTime(daysAgo(12), 14, 0),
    status: "scheduled", price: 130000, profit: 97500,
    driverId: d2.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 1, matchedFormulaId: formula4.id,
  });
  await attachCustomerToTrip(t17.id, customers[11].id, 1);

  // 📅 TRƯỚC KỲ TRƯỚC (50 ngày trước - không ảnh hưởng stats)
  const t18 = await createTrip({
    title: "[Cũ] SG - Vũng Tàu (50 ngày trước)",
    departure: "Sài Gòn", destination: "Vũng Tàu",
    departureTime: withTime(daysAgo(50), 8, 0),
    status: "completed", price: 230000, profit: 161000,
    driverId: d1.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 4, pointsEarned: 1, matchedFormulaId: formula4.id,
  });
  await attachCustomerToTrip(t18.id, customers[0].id, 1);

  // 📅 HÔM NAY (filter "today")
  const t19 = await createTrip({
    title: "[Hôm nay] SG - Biên Hòa",
    departure: "Sài Gòn", destination: "Biên Hòa",
    departureTime: withTime(today, 16, 0),
    status: "scheduled", price: 90000, profit: 67500,
    driverId: d3.id, tripType: "ghep", tripDirection: "oneway",
    totalSeats: 7, pointsEarned: 1.5, matchedFormulaId: formula7.id,
  });
  await attachCustomerToTrip(t19.id, customers[1].id, 2);

  console.log(`  ✓ 19 trips created (id ${t1.id} → ${t19.id})`);

  // 5. Summary
  console.log("\n========================================");
  console.log("✅ SEED HOÀN TẤT!");
  console.log("========================================\n");

  const [totalTrips, completedTrips, assignedTrips, unassignedTrips] = await Promise.all([
    prisma.trip.count({ where: { accountId: ACCOUNT_ID } }),
    prisma.trip.count({ where: { accountId: ACCOUNT_ID, status: "completed" } }),
    prisma.trip.count({ where: { accountId: ACCOUNT_ID, driverId: { not: null }, status: { notIn: ["completed", "cancelled"] } } }),
    prisma.trip.count({ where: { accountId: ACCOUNT_ID, driverId: null, status: { not: "cancelled" } } }),
  ]);

  console.log("📊 THỐNG KÊ (account 4 - Lê Cường):");
  console.log(`   - Tổng chuyến: ${totalTrips}`);
  console.log(`   - Completed: ${completedTrips} (doanh thu thực tế = 1,350,000)`);
  console.log(`   - Forecast: ${assignedTrips} (doanh thu dự kiến = 1,330,000)`);
  console.log(`   - Unassigned: ${unassignedTrips}`);
  console.log("\n🔑 TÀI KHOẢN TEST:");
  console.log(`   Account ID: ${ACCOUNT_ID}`);
  console.log(`   Driver 1: driver-lecuong-1@test.com / ${TEST_PASSWORD} (Nguyễn Văn An, profitRate=700)`);
  console.log(`   Driver 2: driver-lecuong-2@test.com / ${TEST_PASSWORD} (Trần Văn Bình, profitRate=800)`);
  console.log(`   Driver 3: driver-lecuong-3@test.com / ${TEST_PASSWORD} (Lê Thị Chung, profitRate=750)`);
  console.log("\n💡 CÁCH TEST STATS:");
  console.log(`   1. Đăng nhập với tài khoản thuộc account 4 (Lê Cường)`);
  console.log(`   2. Vào trang Báo cáo`);
  console.log(`   3. Filter "Tất cả" → stats sẽ hiện dữ liệu test`);
  console.log(`   4. Test filter theo driver, ngày, trạng thái`);
  console.log("");
}

main()
  .catch((e) => {
    console.error("\n❌ LỖI SEED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
