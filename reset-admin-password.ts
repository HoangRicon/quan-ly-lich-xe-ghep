/**
 * Reset admin password - chạy trực tiếp với tsx
 * Usage: npx tsx reset-admin-password.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // Tìm admin user
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
  });

  if (!admin) {
    console.log("Không tìm thấy user có role=admin");
    console.log("Tìm thấy các user:");
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true },
      take: 20,
    });
    allUsers.forEach(u => console.log(`  - ${u.email} (${u.fullName}) [role=${u.role}]`));
    return;
  }

  const newPassword = "Admin@123456";
  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      passwordHash: hash,
      passwordVersion: { increment: 1 },
    },
  });

  console.log(`✅ Đã reset password cho: ${admin.email}`);
  console.log(`   Password mới: ${newPassword}`);
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); process.exit(0); });
