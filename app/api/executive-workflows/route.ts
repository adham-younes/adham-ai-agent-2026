import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { visitorIdFromRequest } from "@/lib/visitor-identity";
import { executeWorkflow } from "@/lib/platform/workflow-service";
import {
  hasDurableRunStore,
  getWorkflowRun,
  listWorkflowRuns,
} from "@/lib/platform/run-repository";
import {
  workflowCatalog,
  workflowRequestSchema,
} from "@/lib/platform/workflows";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_REQUEST_BYTES = 256_000;

async function getPrincipalId(): Promise<string | null> {
  return visitorIdFromRequest(new Request("http://internal", { headers: await headers() })) ?? null;
}

export async function GET(request: Request) {
  const principalId = await getPrincipalId();
  if (!principalId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const includeHistory = url.searchParams.get("history") === "1";
  if (!hasDurableRunStore()) return NextResponse.json({ error: "DATABASE_UNAVAILABLE" }, { status: 503 });
  let history;
  try {
    const runId = url.searchParams.get("runId");
    if (runId) {
      if (!/^[0-9a-f-]{36}$/i.test(runId)) return NextResponse.json({ error: "INVALID_RUN_ID" }, { status: 400 });
      const run = await getWorkflowRun(principalId, runId);
      return NextResponse.json(run ? { run } : { error: "RUN_NOT_FOUND" }, { status: run ? 200 : 404 });
    }
    history = includeHistory ? await listWorkflowRuns(principalId, Number(url.searchParams.get("limit") ?? 5)) : [];
  } catch {
    return NextResponse.json({ error: "DATABASE_UNAVAILABLE" }, { status: 503 });
  }

  return NextResponse.json({
    status: includeHistory ? "available" : "configured",
    engine: "Mastra report workflows",
    storage: "postgres",
    models: {
      orchestrator: Boolean(process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY),
      executor: Boolean(process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY),
      analyst: Boolean(process.env.GROQ_API_KEY_3 || process.env.GROQ_API_KEY),
    },
    workflows: workflowCatalog,
    history,
  });
}

export async function POST(request: Request) {
  const principalId = await getPrincipalId();
  if (!principalId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  }

  if (!hasDurableRunStore()) return NextResponse.json({ error: "DATABASE_UNAVAILABLE" }, { status: 503 });

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_REQUEST_BYTES) return NextResponse.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const requestResult = workflowRequestSchema.safeParse(body);
  if (!requestResult.success) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", issues: requestResult.error.issues },
      { status: 400 },
    );
  }

  const suppliedContext = (body as Record<string, unknown>).projectContext;
  let projectContext: { projectId: string; taskId: string } | undefined;
  if (suppliedContext !== undefined) {
    if (!suppliedContext || typeof suppliedContext !== "object" || Array.isArray(suppliedContext)) return NextResponse.json({ error: "INVALID_PROJECT_CONTEXT" }, { status: 400 });
    const { projectId, taskId } = suppliedContext as Record<string, unknown>;
    if (typeof projectId !== "string" || typeof taskId !== "string" || !/^[0-9a-f-]{36}$/i.test(projectId) || !/^[0-9a-f-]{36}$/i.test(taskId)) return NextResponse.json({ error: "INVALID_PROJECT_CONTEXT" }, { status: 400 });
    projectContext = { projectId, taskId };
  }
  const result = await executeWorkflow({
    principalId,
    projectContext,
    workflowId: requestResult.data.workflowId,
    inputData: requestResult.data.inputData,
    idempotencyKey: requestResult.data.idempotencyKey ?? request.headers.get("idempotency-key"),
  });
  return NextResponse.json(result.body, { status: result.httpStatus });
}
