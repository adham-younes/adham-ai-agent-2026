import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL;

const globalDatabase = globalThis as typeof globalThis & {
  agentPlatformPool?: Pool;
};

export const database = connectionString
  ? (globalDatabase.agentPlatformPool ??=
      new Pool({
        connectionString,
        max: 2,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
        ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
      }))
  : undefined;

export function hasDatabase(): boolean {
  return database !== undefined;
}
