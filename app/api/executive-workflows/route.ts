import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mastra } from "@/lib/mastra";
import {
  completeWorkflowRun,
  createWorkflowRun,
  hasDurableRunStore,
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
  if (process.env.NODE_ENV === "development") return "local-development";
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET(request: Request) {
  const principalId = await getPrincipalId();
  if (!principalId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const includeHistory = url.searchParams.get("history") === "1";
  const history = includeHistory ? await listWorkflowRuns(principalId) : [];

  return NextResponse.json({
    status: "online",
    engine: "Mastra deterministic workflows",
    storage: hasDurableRunStore() ? "postgres" : "ephemeral",
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

  let body: unknown;
  try {
    body = await request.json();
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

  const auditId = randomUUID();
  try {
    await createWorkflowRun({
      id: auditId,
      userId: principalId,
      workflowId: workflow.id,
      inputData: inputResult.data,
    });

    const workflowInstance = mastra.getWorkflow(workflow.key) as unknown as {
      createRun(): Promise<{
        readonly runId: string;
        start(input: { readonly inputData: unknown }): Promise<unknown>;
      }>;
    };
    const run = await workflowInstance.createRun();
    const result = await run.start({ inputData: inputResult.data });
    const durationMs = Math.round(performance.now() - startedAt);

    await completeWorkflowRun({
      id: auditId,
      status: "succeeded",
      durationMs,
      outputData: result,
    });

    return NextResponse.json({
      success: true,
      workflowId: workflow.id,
      runId: run.runId,
      auditId,
      durationMs,
      result,
    });
  } catch (error: unknown) {
    const durationMs = Math.round(performance.now() - startedAt);
    const message = error instanceof Error ? error.message : "Workflow execution failed.";
    try {
      await completeWorkflowRun({
        id: auditId,
        status: "failed",
        durationMs,
        errorMessage: message,
      });
    } catch {
      // Preserve the original workflow failure when audit persistence also fails.
    }
    return NextResponse.json(
      { success: false, error: "WORKFLOW_EXECUTION_FAILED", message, auditId, durationMs },
      { status: 500 },
    );
  }
}
