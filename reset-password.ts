import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.update({
    where: { email: "admin@xeghep.com" },
    data: { passwordHash: hash },
  });
  console.log("Password reset successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
