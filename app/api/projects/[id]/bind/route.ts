import { bindProjectSession, getProject } from "@/lib/engineering/repository";
import {
  verifySessionGrant,
  requestCookie,
  SESSION_COOKIE,
  cookieHeader,
  createSessionGrant,
} from "@/lib/visitor-identity";
import { principal, body, json, failure, uuid } from "../../http";
import { z } from "zod";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  c: { params: Promise<{ id: string }> },
) {
  try {
    const owner = principal(request),
      id = uuid((await c.params).id),
      { sessionId } = z
        .object({ sessionId: z.string().min(1).max(200) })
        .strict()
        .parse(await body(request));
    const existing = await getProject(owner, id);
    if (
      existing.sessionId !== sessionId &&
      !verifySessionGrant(
        requestCookie(request, SESSION_COOKIE),
        owner,
        sessionId,
      )
    )
      throw new Error("FORBIDDEN");
    const project = await bindProjectSession(owner, id, sessionId);
    const response = json({ project });
    response.headers.append(
      "Set-Cookie",
      cookieHeader(
        SESSION_COOKIE,
        createSessionGrant(owner, sessionId),
        `/eve/v1/session/${encodeURIComponent(sessionId)}`,
      ),
    );
    return response;
  } catch (e) {
    return failure(e);
  }
}
