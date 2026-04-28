import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // Create default account
  const defaultAccount = await prisma.account.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Organization",
      slug: "default",
    },
  });

  console.log(`Default account created: ${defaultAccount.name} (ID: ${defaultAccount.id})`);

  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@xeghep.com" },
    update: {},
    create: {
      email: "admin@xeghep.com",
      passwordHash,
      fullName: "Admin",
      role: "admin",
      accountId: defaultAccount.id,
    },
  });

  console.log("Admin user created successfully!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
