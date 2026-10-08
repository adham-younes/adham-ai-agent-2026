import { z } from "zod";
import {
  visitorIdFromRequest,
  isCrossOriginMutation,
} from "@/lib/visitor-identity";
export const projectInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    goal: z.string().trim().min(1).max(10000),
    stack: z.string().max(2000).optional(),
    source: z.string().max(2000).optional(),
  })
  .strict();
const command = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine(
    (s) => !/^\s*(echo|true|printf)(\s|$)/.test(s),
    "Use an actual acceptance command",
  );
export const planInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    acceptanceCriteria: z.array(z.string().trim().min(1).max(2000)).max(20),
    requiredChecks: z
      .array(
        z
          .object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), command })
          .strict(),
      )
      .max(20)
      .refine((a) => new Set(a.map((c) => c.id)).size === a.length),
    requiredArtifacts: z.array(z.string().trim().min(1).max(500)).max(30),
  })
  .strict();
export const taskInput = planInput.extend({
  kind: z.enum(["implementation", "analysis"]),
});
export function principal(request: Request) {
  if (isCrossOriginMutation(request)) throw new Error("FORBIDDEN");
  const owner = visitorIdFromRequest(request);
  if (!owner) throw new Error("UNAUTHORIZED");
  return owner;
}
export function uuid(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new Error("INVALID_ID");
  return id;
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 256000)
    throw new Error("REQUEST_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 256000) {
      await reader.cancel();
      throw new Error("REQUEST_TOO_LARGE");
    }
    chunks.push(value);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return json({ error: "INVALID_INPUT", issues: error.issues }, 422);
  const message = error instanceof Error ? error.message : "";
  const code = /^[A-Z_]+$/.test(message) ? message : "DATABASE_UNAVAILABLE";
  const status =
    code === "UNAUTHORIZED"
      ? 401
      : code === "FORBIDDEN"
        ? 403
        : code.endsWith("NOT_FOUND")
          ? 404
          : code === "REQUEST_TOO_LARGE"
            ? 413
            : code === "DATABASE_UNAVAILABLE"
              ? 503
              : code.startsWith("INVALID")
                ? 400
                : 409;
  return json({ error: code }, status);
}
export function page(request: Request) {
  const url = new URL(request.url);
  return {
    limit: Number(url.searchParams.get("limit") ?? 5),
    offset: Number(url.searchParams.get("offset") ?? 0),
  };
}
