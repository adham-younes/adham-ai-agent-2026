import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL;

export function normalizePostgresUrl(value: string): string {
  const url = new URL(value);

  // Supabase assigns each project to a specific shared-pooler cluster. A URL
  // with the correct project-qualified user but the wrong cluster fails with
  // "tenant/user not found". Keep the credential in Vercel and normalize the
  // non-secret routing metadata here so both the app pool and Mastra share the
  // same reliable production connection.
  const supabaseProjectRef = url.username.split(".").at(-1);
  if (
    supabaseProjectRef === "chkdoiqvffwjflbnvjrm" &&
    url.hostname.endsWith(".pooler.supabase.com")
  ) {
    url.hostname = "aws-1-eu-west-1.pooler.supabase.com";
  }

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
