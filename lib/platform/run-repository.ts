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
}

export function hasDurableRunStore(): boolean {
  return database !== undefined;
}

export async function createWorkflowRun(input: {
  readonly id: string;
  readonly userId: string;
  readonly workflowId: WorkflowId;
  readonly inputData: unknown;
}): Promise<void> {
  if (!database) return;
  await database.query(
    `insert into public.agent_workflow_runs
      (id, user_id, workflow_id, status, input_data)
     values ($1, $2, $3, 'running', $4::jsonb)`,
    [input.id, input.userId, input.workflowId, JSON.stringify(input.inputData)],
  );
}

export async function completeWorkflowRun(input: {
  readonly id: string;
  readonly status: Exclude<RunStatus, "running">;
  readonly durationMs: number;
  readonly outputData?: unknown;
  readonly errorMessage?: string;
}): Promise<void> {
  if (!database) return;
  await database.query(
    `update public.agent_workflow_runs
       set status = $2,
           duration_ms = $3,
           output_data = $4::jsonb,
           error_message = $5,
           completed_at = now()
     where id = $1`,
    [
      input.id,
      input.status,
      input.durationMs,
      input.outputData === undefined ? null : JSON.stringify(input.outputData),
      input.errorMessage ?? null,
    ],
  );
}

export async function listWorkflowRuns(userId: string, limit = 12): Promise<WorkflowRunRecord[]> {
  if (!database) return [];
  const result = await database.query<{
    id: string;
    workflow_id: WorkflowId;
    status: RunStatus;
    duration_ms: number | null;
    created_at: Date;
    completed_at: Date | null;
  }>(
    `select id, workflow_id, status, duration_ms, created_at, completed_at
       from public.agent_workflow_runs
      where user_id = $1
      order by created_at desc
      limit $2`,
    [userId, Math.min(Math.max(limit, 1), 50)],
  );
  return result.rows.map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status,
    durationMs: row.duration_ms,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
  }));
}
