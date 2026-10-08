import { NextResponse, type NextRequest } from "next/server";
import { createVisitorToken, isCrossOriginMutation, VISITOR_COOKIE, VISITOR_MAX_AGE, visitorIdFromToken } from "@/lib/visitor-identity";

export function proxy(request: NextRequest) {
  if (isCrossOriginMutation(request)) return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const token = visitorIdFromToken(existing) ? existing! : createVisitorToken();
  request.cookies.set(VISITOR_COOKIE, token);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.headers.set("Cache-Control", "private, no-store");
  if (token !== existing) response.cookies.set(VISITOR_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: VISITOR_MAX_AGE,
  });
  return response;
}

export const config = { matcher: ["/", "/s/:path*", "/projects/:path*", "/api/projects/:path*", "/api/settings", "/api/executive-workflows"] };
