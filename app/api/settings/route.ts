import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getUserAgentSettings,
  saveUserAgentSettings,
} from "@/lib/platform/user-settings";

export const runtime = "nodejs";

const settingsSchema = z.object({
  systemPrompt: z.string().trim().min(1).max(8_000),
  memoryEnabled: z.boolean(),
});

async function currentUserId(): Promise<string | null> {
  if (process.env.NODE_ENV === "development") return "local-dev";
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getUserAgentSettings(userId));
}

export async function PUT(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_settings", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  return NextResponse.json(await saveUserAgentSettings(userId, parsed.data));
}
