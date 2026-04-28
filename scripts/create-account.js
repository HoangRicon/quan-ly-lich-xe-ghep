#!/usr/bin/env node
/**
 * Script: scripts/create-account.js
 * Tạo tài khoản (Account) mới cho ứng dụng Quản Lý Lịch Xe Ghép.
 *
 * Cách dùng:
 *   node scripts/create-account.js <name> [slug]
 *
 * Ví dụ:
 *   node scripts/create-account.js "Công ty ABC"
 *   node scripts/create-account.js "Công ty XYZ" "cong-ty-xyz"
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Lỗi: DATABASE_URL không được cấu hình trong .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Tạo tài khoản (Account) mới cho ứng dụng Xe Ghép.

Cách dùng:
  node scripts/create-account.js <name> [slug]

Ví dụ:
  node scripts/create-account.js "Công ty ABC"
  node scripts/create-account.js "Công ty XYZ" "cong-ty-xyz"

`);
    process.exit(0);
  }

  const name = args[0];
  const slugInput = args[1];
  const slug = slugInput || slugify(name);

  // Check slug uniqueness
  const existing = await prisma.account.findUnique({ where: { slug } });
  if (existing) {
    console.error(`Lỗi: Slug "${slug}" đã tồn tại. Vui lòng chọn slug khác.`);
    process.exit(1);
  }

  // Create account
  const account = await prisma.account.create({
    data: { name, slug },
  });
  console.log(`\nTai khoản đã được tạo:`);
  console.log(`  ID:   ${account.id}`);
  console.log(`  Tên:  ${account.name}`);
  console.log(`  Slug: ${account.slug}`);

  // Optionally create first user for this account
  const createUser = args.includes("--with-user");
  if (createUser || args.includes("-y")) {
    const userEmail = args.find(a => a.includes("@") && !a.includes("--"));
    if (!userEmail) {
      console.error("Cờ --with-user yêu cầu cung cấp email, vd: node scripts/create-account.js 'ABC' --with-user admin@abc.com");
      process.exit(1);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (existingUser) {
      console.error(`Lỗi: Email "${userEmail}" đã tồn tại.`);
      process.exit(1);
    }

    const password = args.find(a => a.startsWith("--pass="))?.split("=")[1] || "changeme123";
    const fullName = args.find(a => a.startsWith("--name="))?.split("=")[1] || userEmail.split("@")[0];
    const role = args.includes("--admin") ? "admin" : "user";

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName,
        role,
        accountId: account.id,
      },
    });

    console.log(`\nNguời dùng đầu tiên:`);
    console.log(`  ID:       ${user.id}`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Họ tên:  ${user.fullName}`);
    console.log(`  Vai trò:  ${user.role}`);
    console.log(`  Mật khẩu: ${password}`);
    console.log(`\n  ⚠️  Hãy đổi mật khẩu sau khi đăng nhập!`);
  }

  console.log(`\nHoàn tất! Tai khoản ID=${account.id} đã sẵn sàng sử dụng.`);
}

main()
  .catch((e) => {
    console.error("Lỗi:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
