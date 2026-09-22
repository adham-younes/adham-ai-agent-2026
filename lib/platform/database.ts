import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL;

export function normalizePostgresUrl(value: string): string {
  const url = new URL(value);
  url.searchParams.delete("ssl");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("uselibpqcompat");
  return url.toString();
}

const globalDatabase = globalThis as typeof globalThis & {
  agentPlatformPool?: Pool;
};

export const database = connectionString
  ? (globalDatabase.agentPlatformPool ??=
      new Pool({
        connectionString: normalizePostgresUrl(connectionString),
        max: 2,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
        ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
      }))
  : undefined;

export function hasDatabase(): boolean {
  return database !== undefined;
}
