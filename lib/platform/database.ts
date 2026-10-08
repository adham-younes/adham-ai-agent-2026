import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { getCACertificates } from "node:tls";

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

export function postgresTls(value: string) {
  const hostname = new URL(value).hostname;
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return undefined;
  const configuredCa = process.env.POSTGRES_CA_CERT?.replace(/\\n/g, "\n")
    ?? (process.env.POSTGRES_CA_CERT_PATH ? readFileSync(process.env.POSTGRES_CA_CERT_PATH, "utf8") : undefined);
  return { rejectUnauthorized: true, ca: configuredCa ?? getCACertificates("default") };
}

export const database = connectionString
  ? (globalDatabase.agentPlatformPool ??=
      new Pool({
        connectionString: normalizePostgresUrl(connectionString),
        max: 2,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
        ssl: postgresTls(connectionString),
      }))
  : undefined;

export function hasDatabase(): boolean {
  return database !== undefined;
}
