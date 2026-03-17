/**
 * Script reset password từ command line
 * 
 * Cách sử dụng:
 * 1. Reset password cho user:
 *    npx ts-node -T scripts/reset-password.ts --email admin@example.com --newpassword 123456
 * 
 * 2. Hoặc chạy trực tiếp với tsx:
 *    npx tsx scripts/reset-password.ts --email admin@example.com --newpassword 123456
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";
import crypto from "crypto";

const prisma = new PrismaClient();

interface Args {
  email?: string;
  newpassword?: string;
  token?: string;
}

async function main() {
  const args: Args = {};
  
  // Parse command line arguments
  process.argv.forEach((arg, index) => {
    if (arg === "--email" && process.argv[index + 1]) {
      args.email = process.argv[index + 1];
    }
    if (arg === "--newpassword" && process.argv[index + 1]) {
      args.newpassword = process.argv[index + 1];
    }
    if (arg === "--token" && process.argv[index + 1]) {
      args.token = process.argv[index + 1];
    }
  });

  console.log("\n=== Script Reset Password ===\n");

  // Case 1: Reset password by email directly
  if (args.email && args.newpassword) {
    await resetPasswordByEmail(args.email, args.newpassword);
  }
  // Case 2: Create reset token
  else if (args.email && !args.token) {
    await createResetToken(args.email);
  }
  // Case 3: Use reset token
  else if (args.token && args.newpassword) {
    await resetPasswordByToken(args.token, args.newpassword);
  }
  // Show usage
  else {
    showUsage();
  }

  await prisma.$disconnect();
}

async function resetPasswordByEmail(email: string, newPassword: string) {
  console.log(`Đang reset password cho user: ${email}`);
  console.log(`Password mới: ${newPassword}\n`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error("❌ User không tồn tại!");
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  
  // Lấy passwordVersion hiện tại và tăng lên 1
  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: { passwordVersion: true },
  });
  
  const newPasswordVersion = (currentUser?.passwordVersion || 0) + 1;
  
  await prisma.user.update({
    where: { email },
    data: { 
      passwordHash,
      passwordVersion: newPasswordVersion,
    },
  });

  console.log("✅ Đổi mật khẩu thành công!");
  console.log("✅ Tất cả phiên đăng nhập cũ đã bị vô hiệu hóa!");
}

async function createResetToken(email: string) {
  console.log(`Đang tạo reset token cho: ${email}\n`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error("❌ User không tồn tại!");
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.passwordReset.create({
    data: {
      email,
      token,
      expiresAt,
    },
  });

  const resetUrl = `http://localhost:3000/auth/reset-password?token=${token}`;

  console.log("✅ Tạo token thành công!");
  console.log(`\nToken: ${token}`);
  console.log(`Link reset: ${resetUrl}`);
  console.log(`\nHết hạn sau: 24 giờ`);
}

async function resetPasswordByToken(token: string, newPassword: string) {
  console.log(`Đang reset password với token...\n`);

  const passwordReset = await prisma.passwordReset.findUnique({
    where: { token },
  });

  if (!passwordReset) {
    console.error("❌ Token không hợp lệ!");
    return;
  }

  if (passwordReset.usedAt) {
    console.error("❌ Token đã được sử dụng!");
    return;
  }

  if (new Date() > passwordReset.expiresAt) {
    console.error("❌ Token đã hết hạn!");
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  
  // Lấy passwordVersion hiện tại và tăng lên 1
  const currentUser = await prisma.user.findUnique({
    where: { email: passwordReset.email },
    select: { passwordVersion: true },
  });
  
  const newPasswordVersion = (currentUser?.passwordVersion || 0) + 1;
  
  await prisma.user.update({
    where: { email: passwordReset.email },
    data: { 
      passwordHash,
      passwordVersion: newPasswordVersion,
    },
  });

  await prisma.passwordReset.update({
    where: { id: passwordReset.id },
    data: { usedAt: new Date() },
  });

  console.log(`✅ Đổi mật khẩu thành công cho: ${passwordReset.email}`);
  console.log("✅ Tất cả phiên đăng nhập cũ đã bị vô hiệu hóa!");
}

function showUsage() {
  console.log("Cách sử dụng:");
  console.log("1. Reset password trực tiếp (admin dùng):");
  console.log("   npx tsx scripts/reset-password.ts --email admin@example.com --newpassword 123456\n");
  console.log("2. Tạo link reset password:");
  console.log("   npx tsx scripts/reset-password.ts --email admin@example.com\n");
  console.log("3. Đổi password bằng token:");
  console.log("   npx tsx scripts/reset-password.ts --token <TOKEN> --newpassword 123456\n");
}

main().catch((error) => {
  console.error("Lỗi:", error);
  prisma.$disconnect();
  process.exit(1);
});
