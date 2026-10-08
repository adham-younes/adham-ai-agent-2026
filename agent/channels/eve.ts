import { eveChannel } from "eve/channels/eve";
import { ForbiddenError, type AuthFn } from "eve/channels/auth";
import {
  cookieHeader, createSessionGrant, createVisitorToken, isCrossOriginMutation,
  requestCookie, SESSION_COOKIE, verifySessionGrant, VISITOR_COOKIE,
  visitorIdFromRequest, visitorIdFromToken,
} from "@/lib/visitor-identity";

const visitorSession: AuthFn<Request> = async (request) => {
  if (isCrossOriginMutation(request)) throw new ForbiddenError({ message: "Request origin is not allowed." });
  const visitorId = visitorIdFromRequest(request);
  if (!visitorId) return null;
  const sessionId = new URL(request.url).pathname.match(/\/session\/([^/]+)/)?.[1];
  if (sessionId && !verifySessionGrant(requestCookie(request, SESSION_COOKIE), visitorId, decodeURIComponent(sessionId))) {
    throw new ForbiddenError({ message: "This conversation belongs to a different browser. Start a new task." });
  }
  return {
    attributes: { name: "Visitor" },
    authenticator: "automatic-visitor",
    principalId: visitorId,
    principalType: "user",
  };
};

const channel = eveChannel({ auth: visitorSession });

// Issue identity and conversation grants atomically with the accepted create
// response, before the browser opens a stream. No database ownership race.
export default {
  ...channel,
  routes: channel.routes.map((route) => {
    if (route.transport !== "http" || !route.path.startsWith("/eve/v1/session") && route.path !== "/eve/v1/info") return route;
    return {
      ...route,
      async handler(request, args) {
        const existing = requestCookie(request, VISITOR_COOKIE);
        const token = visitorIdFromToken(existing) ? existing! : createVisitorToken();
        // Eve's server request is a lazy H3 Request adapter, not a native
        // Undici Request. Keep that adapter so its body/state remain valid.
        request.headers.set("cookie", `${VISITOR_COOKIE}=${token}; ${request.headers.get("cookie") ?? ""}`);
        const response = await route.handler(request, args);
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set("Cache-Control", "private, no-store");
        if (token !== existing) responseHeaders.append("Set-Cookie", cookieHeader(VISITOR_COOKIE, token));
        if (route.path === "/eve/v1/session" && response.ok) {
          const body = await response.clone().json() as { sessionId?: string };
          if (body.sessionId) responseHeaders.append("Set-Cookie", cookieHeader(
            SESSION_COOKIE, createSessionGrant(visitorIdFromToken(token)!, body.sessionId),
            `/eve/v1/session/${encodeURIComponent(body.sessionId)}`,
          ));
        }
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
      },
    };
  }),
} satisfies typeof channel;
