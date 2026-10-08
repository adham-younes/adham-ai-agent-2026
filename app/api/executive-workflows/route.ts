import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { visitorIdFromRequest } from "@/lib/visitor-identity";
import { mastra, initializeWorkflowStorage } from "@/lib/mastra";
import {
  completeWorkflowRun,
  createWorkflowRun,
  hasDurableRunStore,
  getWorkflowRun,
  listWorkflowRuns,
} from "@/lib/platform/run-repository";
import {
  resolveWorkflow,
  validateWorkflowInput,
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
  const startedAt = performance.now();
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

  const workflow = resolveWorkflow(requestResult.data.workflowId);
  if (!workflow) {
    return NextResponse.json(
      { error: "UNKNOWN_WORKFLOW", supported: workflowCatalog.map(({ id }) => id) },
      { status: 404 },
    );
  }

  const inputResult = validateWorkflowInput(workflow.id, requestResult.data.inputData);
  if (!inputResult.success) {
    return NextResponse.json(
      { error: "INVALID_WORKFLOW_INPUT", issues: inputResult.error.issues },
      { status: 422 },
    );
  }

  const idempotencyKey = requestResult.data.idempotencyKey ?? request.headers.get("idempotency-key");
  if (!idempotencyKey || !/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
  }
  const auditId = randomUUID();
  let created;
  try {
    created = await createWorkflowRun({ id: auditId, userId: principalId,
      workflowId: workflow.id, inputData: inputResult.data, idempotencyKey });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT" ? "IDEMPOTENCY_CONFLICT" : "DATABASE_UNAVAILABLE" },
      { status: error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT" ? 409 : 503 });
  }
  if (!created.created) {
    const saved = created.run;
    return NextResponse.json({ success: saved.status === "succeeded", status: saved.status,
      workflowId: saved.workflowId, auditId: saved.id, runId: saved.id,
      durationMs: saved.durationMs, result: saved.outputData, message: saved.errorMessage },
      { status: saved.status === "running" ? 202 : saved.status === "failed" ? 500 : 200 });
  }

  let result: unknown;
  let failed = false;
  let storageReady = false;
  try {
    await initializeWorkflowStorage();
    storageReady = true;
    const workflowInstance = mastra.getWorkflow(workflow.key);
    const run = await workflowInstance.createRun({ runId: auditId });
    result = await run.start({ inputData: inputResult.data as never });
    failed = !result || typeof result !== "object" || !("status" in result) || result.status !== "success";
  } catch {
    failed = true;
  }
  if (failed) result = { status: "failed", error: "Workflow step failed" };
  const durationMs = Math.round(performance.now() - startedAt);
  const message = failed ? "The report could not be completed. Retry with a new request after checking provider availability." : undefined;
  try {
    await completeWorkflowRun({ id: auditId, userId: principalId,
      status: failed ? "failed" : "succeeded", durationMs,
      outputData: result === undefined ? null : JSON.parse(JSON.stringify(result, (_key, value) => value instanceof Error ? { message: "Workflow step failed" } : value)),
      errorMessage: message });
  } catch {
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE", auditId, status: "persistence-unconfirmed" }, { status: 503 });
  }
  return NextResponse.json({ success: !failed, status: failed ? "failed" : "succeeded",
    workflowId: workflow.id, auditId, runId: auditId, durationMs, result,
    ...(failed ? { error: storageReady ? "WORKFLOW_EXECUTION_FAILED" : "DATABASE_UNAVAILABLE", message } : {}) }, { status: !storageReady ? 503 : failed ? 500 : 200 });
}
