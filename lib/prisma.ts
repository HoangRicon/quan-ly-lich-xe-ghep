import type { PrismaClient as PrismaClientType } from "@prisma/client";
import { createRequire } from "node:module";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getMissingPrismaDelegates,
  hasRequiredPrismaDelegates,
} from "./prisma-client-guards";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

const requireFromHere = createRequire(import.meta.url);

type PrismaClientConstructor = new (options: {
  adapter: PrismaPg;
  log: ("query" | "error" | "warn")[];
}) => PrismaClientType;

function loadPrismaClientConstructor(refresh = false): PrismaClientConstructor {
  const clientPath = requireFromHere.resolve("@prisma/client");

  if (refresh) {
    delete requireFromHere.cache[clientPath];
  }

  const prismaModule = requireFromHere("@prisma/client") as {
    PrismaClient: PrismaClientConstructor;
  };

  return prismaModule.PrismaClient;
}

function createPrismaClient(refreshGeneratedClient = false) {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ 
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
    // Keep connections alive
    allowExitOnIdle: false,
  });

  // Validate connection on checkout
  pool.on('connect', () => {
    console.log('New database connection established');
  });

  // Handle connection errors
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  const adapter = new PrismaPg(pool);
  const PrismaClient = loadPrismaClientConstructor(refreshGeneratedClient);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

const cachedPrisma = globalForPrisma.prisma;
const shouldReuseCachedPrisma =
  cachedPrisma && hasRequiredPrismaDelegates(cachedPrisma);

if (cachedPrisma && !shouldReuseCachedPrisma) {
  console.warn(
    `Discarding stale PrismaClient cache; missing delegates: ${getMissingPrismaDelegates(
      cachedPrisma,
    ).join(", ")}`,
  );
  cachedPrisma.$disconnect().catch((error) => {
    console.warn("Failed to disconnect stale PrismaClient cache:", error);
  });
}

export const prisma = shouldReuseCachedPrisma ? cachedPrisma : createPrismaClient(true);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function getCurrentPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && hasRequiredPrismaDelegates(cached)) {
    return cached;
  }

  if (hasRequiredPrismaDelegates(prisma)) {
    return prisma;
  }

  const refreshedPrisma = createPrismaClient(true);
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = refreshedPrisma;
  }

  return refreshedPrisma;
}
