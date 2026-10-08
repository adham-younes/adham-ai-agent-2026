import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const VISITOR_COOKIE = "adham_visitor";
export const SESSION_COOKIE = "adham_session";
export const VISITOR_MAX_AGE = 365 * 24 * 60 * 60;

function isLocalDevelopment(): boolean {
  return process.env.EVE_DEV === "1" || process.env.NODE_ENV !== "production";
}

function signingKey(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (isLocalDevelopment()) return "local-visitor-development-key";
  throw new Error("BETTER_AUTH_SECRET is required to sign visitor identities");
}

function signature(value: string): string {
  return createHmac("sha256", signingKey()).update(value).digest("base64url");
}

function validSignature(payload: string, supplied: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(signature(payload)), Buffer.from(supplied));
}

export function createVisitorToken(expiresAt = Date.now() + VISITOR_MAX_AGE * 1000): string {
  const payload = `visitor.${randomUUID()}.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}

export function visitorIdFromToken(token?: string): string | undefined {
  if (!token || token.length > 200) return undefined;
  const [scope, id, expiry, signed, extra] = token.split(".");
  if (scope !== "visitor" || extra !== undefined || !id || !signed || !expiry) return undefined;
  if (!/^[a-f0-9-]{36}$/.test(id) || !Number.isFinite(Number(expiry)) || Number(expiry) <= Date.now()) return undefined;
  if (!validSignature(`${scope}.${id}.${expiry}`, signed)) return undefined;
  return `visitor:${id}`;
}

export function requestCookie(request: Request, name: string): string | undefined {
  return request.headers.get("cookie")?.split(";").map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function visitorIdFromRequest(request: Request): string | undefined {
  return visitorIdFromToken(requestCookie(request, VISITOR_COOKIE));
}

export function createSessionGrant(visitorId: string, sessionId: string, expiresAt = Date.now() + VISITOR_MAX_AGE * 1000): string {
  const payload = `session.${visitorId}.${sessionId}.${expiresAt}`;
  return `${expiresAt}.${signature(payload)}`;
}

export function verifySessionGrant(grant: string | undefined, visitorId: string, sessionId: string): boolean {
  if (!grant || grant.length > 100) return false;
  const [expiry, signed, extra] = grant.split(".");
  return extra === undefined && Boolean(expiry && signed) && Number.isFinite(Number(expiry))
    && Number(expiry) > Date.now() && validSignature(`session.${visitorId}.${sessionId}.${expiry}`, signed!);
}

export function cookieHeader(name: string, value: string, path = "/"): string {
  return `${name}=${value}; Path=${path}; Max-Age=${VISITOR_MAX_AGE}; HttpOnly; SameSite=Lax${isLocalDevelopment() ? "" : "; Secure"}`;
}

export function isCrossOriginMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    if (originHost === new URL(request.url).host) return false;
    // Next forwards Eve traffic to a separate local/production service. The
    // browser origin remains the public app host, not that internal address.
    const publicHosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean);
    if (publicHosts.includes(originHost)) return false;
    if (isLocalDevelopment() && /^(localhost|127\.0\.0\.1):\d+$/.test(originHost)) return false;
    return true;
  }
  catch { return true; }
}
