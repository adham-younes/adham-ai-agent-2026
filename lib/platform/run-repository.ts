import type { WorkflowId } from "./workflows";
import { database } from "./database";

export type RunStatus = "running" | "succeeded" | "failed";

export interface WorkflowRunRecord {
  readonly id: string;
  readonly workflowId: WorkflowId;
  readonly status: RunStatus;
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly inputData: unknown;
  readonly outputData: unknown;
  readonly errorMessage: string | null;
}

export function hasDurableRunStore(): boolean {
  return database !== undefined;
}

function requireDatabase() {
  if (!database) throw new Error("DATABASE_UNAVAILABLE");
  return database;
}

type RunRow = {
  id: string; workflow_id: WorkflowId; status: RunStatus;
  duration_ms: number | null; created_at: Date; completed_at: Date | null;
  input_data: unknown; output_data: unknown; error_message: string | null;
};

function mapRun(row: RunRow): WorkflowRunRecord {
  return { id: row.id, workflowId: row.workflow_id, status: row.status,
    durationMs: row.duration_ms, createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    inputData: row.input_data, outputData: row.output_data,
    errorMessage: row.error_message };
}

// JSONB ignores object key order; canonicalization makes retry comparison match it.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

// Requests have a 300-second maximum lifetime. After twice that window an
// interrupted run cannot still belong to a live request. The status predicate
// also prevents this recovery from racing with a completed result.
async function reconcileInterruptedRuns(userId: string): Promise<void> {
  await requireDatabase().query(
    `update public.agent_workflow_runs
        set status = 'failed', completed_at = now(),
            error_message = 'The report was interrupted before completion. Start a new request to retry.'
      where user_id = $1 and status = 'running'
        and created_at < now() - interval '10 minutes'`,
    [userId],
  );
}

export async function createWorkflowRun(input: {
  readonly id: string; readonly userId: string; readonly workflowId: WorkflowId;
  readonly inputData: unknown; readonly idempotencyKey: string;
}): Promise<{ created: boolean; run: WorkflowRunRecord }> {
  const db = requireDatabase();
  await reconcileInterruptedRuns(input.userId);
  const inserted = await db.query<RunRow>(
    `insert into public.agent_workflow_runs
      (id, user_id, workflow_id, status, input_data, idempotency_key)
     values ($1, $2, $3, 'running', $4::jsonb, $5)
     on conflict (user_id, idempotency_key) where idempotency_key is not null
     do nothing returning *`,
    [input.id, input.userId, input.workflowId, JSON.stringify(input.inputData), input.idempotencyKey],
  );
  if (inserted.rows[0]) return { created: true, run: mapRun(inserted.rows[0]) };
  const existing = await db.query<RunRow>(
    `select * from public.agent_workflow_runs where user_id = $1 and idempotency_key = $2`,
    [input.userId, input.idempotencyKey],
  );
  const row = existing.rows[0];
  if (!row) throw new Error("RUN_NOT_FOUND");
  if (row.workflow_id !== input.workflowId || canonical(row.input_data) !== canonical(input.inputData)) throw new Error("IDEMPOTENCY_CONFLICT");
  return { created: false, run: mapRun(row) };
}

export async function completeWorkflowRun(input: {
  readonly id: string; readonly userId: string;
  readonly status: Exclude<RunStatus, "running">; readonly durationMs: number;
  readonly outputData?: unknown; readonly errorMessage?: string;
}): Promise<void> {
  const result = await requireDatabase().query(
    `update public.agent_workflow_runs
       set status = $3, duration_ms = $4, output_data = $5::jsonb,
           error_message = $6, completed_at = now()
     where id = $1 and user_id = $2 and status = 'running'`,
    [input.id, input.userId, input.status, input.durationMs,
      input.outputData === undefined ? null : JSON.stringify(input.outputData), input.errorMessage ?? null],
  );
  if (result.rowCount !== 1) throw new Error("RUN_NOT_FOUND");
}

export async function getWorkflowRun(userId: string, id: string): Promise<WorkflowRunRecord | null> {
  await reconcileInterruptedRuns(userId);
  const result = await requireDatabase().query<RunRow>(
    `select * from public.agent_workflow_runs where user_id = $1 and id = $2`, [userId, id]);
  return result.rows[0] ? mapRun(result.rows[0]) : null;
}

export async function listWorkflowRuns(userId: string, limit = 5): Promise<WorkflowRunRecord[]> {
  await reconcileInterruptedRuns(userId);
  const result = await requireDatabase().query<RunRow>(
    `select id, workflow_id, status, duration_ms, created_at, completed_at,
            input_data, output_data, error_message
       from public.agent_workflow_runs where user_id = $1
      order by created_at desc limit $2`,
    [userId, Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 5, 1), 10)],
  );
  return result.rows.map(mapRun);
}
