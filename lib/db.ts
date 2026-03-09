import { neon } from "@neondatabase/serverless";

export function createSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(databaseUrl);
}

export type Sql = ReturnType<typeof neon>;
