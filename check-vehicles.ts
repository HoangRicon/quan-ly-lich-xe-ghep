import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const vehicles = await prisma.vehicle.findMany();
  console.log("Vehicles:", vehicles.length);
  vehicles.forEach(v => console.log("-", v.name, v.licensePlate));

  if (vehicles.length === 0) {
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    if (admin) {
      await prisma.vehicle.create({
        data: {
          name: "Toyota Camry",
          licensePlate: "29A-12345",
          vehicleType: "car",
          capacity: 4,
          ownerId: admin.id,
          isActive: true,
        },
      });
      console.log("Created demo vehicle");
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
