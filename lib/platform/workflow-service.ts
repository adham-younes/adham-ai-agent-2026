import { createHash, randomUUID } from "node:crypto";
import { mastra, initializeWorkflowStorage } from "@/lib/mastra";
import { completeWorkflowRun, createWorkflowRun, hasDurableRunStore } from "./run-repository";
import { resolveWorkflow, validateWorkflowInput, workflowCatalog } from "./workflows";

interface WorkflowServiceInput {
  principalId: string | null | undefined;
  workflowId: string;
  inputData: unknown;
  idempotencyKey: string | null | undefined;
}
interface ServiceResult { httpStatus: number; body: Record<string, unknown> }
const dependencies = { randomUUID, mastra, initializeWorkflowStorage, completeWorkflowRun, createWorkflowRun,
  hasDurableRunStore, resolveWorkflow, validateWorkflowInput, workflowCatalog };

/** One execution contract for HTTP and Eve; callers supply authenticated identity only. */
export function createWorkflowService(deps: typeof dependencies) {
  return async function execute(input: WorkflowServiceInput): Promise<ServiceResult> {
    const startedAt = performance.now();
    const response = (httpStatus: number, body: Record<string, unknown>): ServiceResult => ({ httpStatus, body });
    if (!input.principalId) return response(401, { error: "UNAUTHORIZED" });
    const workflow = deps.resolveWorkflow(input.workflowId);
    if (!workflow) return response(404, { error: "UNKNOWN_WORKFLOW", supported: deps.workflowCatalog.map(({ id }) => id) });
    const parsed = deps.validateWorkflowInput(workflow.id, input.inputData);
    if (!parsed.success) return response(422, { error: "INVALID_WORKFLOW_INPUT", issues: parsed.error.issues });
    if (!input.idempotencyKey || !/^[a-zA-Z0-9_-]{8,128}$/.test(input.idempotencyKey)) return response(400, { error: "IDEMPOTENCY_KEY_REQUIRED" });
    if (!deps.hasDurableRunStore()) return response(503, { error: "DATABASE_UNAVAILABLE" });
    const auditId = deps.randomUUID();
    let claimed;
    try {
      claimed = await deps.createWorkflowRun({ id: auditId, userId: input.principalId,
        workflowId: workflow.id, inputData: parsed.data, idempotencyKey: input.idempotencyKey });
    } catch (error) {
      const conflict = error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT";
      return response(conflict ? 409 : 503, { error: conflict ? "IDEMPOTENCY_CONFLICT" : "DATABASE_UNAVAILABLE" });
    }
    if (!claimed.created) {
      const run = claimed.run;
      return response(run.status === "running" ? 202 : run.status === "failed" ? 500 : 200,
        { success: run.status === "succeeded", status: run.status, workflowId: run.workflowId,
          auditId: run.id, runId: run.id, durationMs: run.durationMs, result: run.outputData,
          message: run.errorMessage, ...(run.status === "succeeded" ? { lifecycle: "needs_review" } : {}) });
    }
    let result: unknown = { status: "failed", error: "Workflow step failed" };
    let failed = true;
    let storageReady = false;
    try {
      await deps.initializeWorkflowStorage();
      storageReady = true;
      const instance = deps.mastra.getWorkflow(workflow.key);
      const run = await instance.createRun({ runId: auditId });
      const raw = await run.start({ inputData: parsed.data as never });
      if (raw && typeof raw === "object" && "status" in raw && raw.status === "success") {
        // Normalize before persisting or publishing: cyclic/non-JSON outputs cannot be drafts.
        result = JSON.parse(JSON.stringify(raw, (_key, value) => value instanceof Error ? { message: "Workflow step failed" } : value));
        failed = false;
      }
    } catch { /* Provider and database internals never cross the public boundary. */ }
    const durationMs = Math.round(performance.now() - startedAt);
    const message = failed ? "The report could not be completed. Retry with a new request after checking provider availability." : undefined;
    try {
      await deps.completeWorkflowRun({ id: auditId, userId: input.principalId,
        status: failed ? "failed" : "succeeded", durationMs, outputData: result, errorMessage: message });
    } catch {
      return response(503, { success: false, error: "DATABASE_UNAVAILABLE", auditId, runId: auditId, status: "persistence-unconfirmed" });
    }
    return response(!storageReady ? 503 : failed ? 500 : 200,
      { success: !failed, status: failed ? "failed" : "succeeded", workflowId: workflow.id,
        auditId, runId: auditId, durationMs, result,
        ...(failed ? { error: storageReady ? "WORKFLOW_EXECUTION_FAILED" : "DATABASE_UNAVAILABLE", message } : { lifecycle: "needs_review" }) });
  };
}
export const executeWorkflow = createWorkflowService(dependencies);

type TrustedToolContext = {
  callId: string;
  session: { id: string; auth?: { current?: { principalId?: string } | null } };
};
export async function executeAgentWorkflow(workflowId: string, inputData: unknown, ctx: TrustedToolContext) {
  // An interrupted Eve tool step may replay; the trusted call ID remains stable.
  const idempotencyKey = `eve_${createHash("sha256").update(`${ctx.session.id}:${ctx.callId}`).digest("hex")}`;
  const response = await executeWorkflow({ workflowId, inputData, principalId: ctx.session.auth?.current?.principalId, idempotencyKey });
  if (response.httpStatus >= 400) {
    throw new Error(String(response.body.error ?? "WORKFLOW_EXECUTION_FAILED"));
  }
  return response.body;
}
