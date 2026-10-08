import { randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { database } from "../platform/database";
import type { Project, Task, EngineeringRun, Artifact, Check } from "./types";
import {
  pagination,
  canonicalArtifactPath,
  validateArtifactContent,
  verificationFailure,
} from "./validation";
async function owned<T>(
  owner: string,
  fn: (db: PoolClient) => Promise<T>,
): Promise<T> {
  if (!owner) throw new Error("UNAUTHORIZED");
  if (!database) throw new Error("DATABASE_UNAVAILABLE");
  const db = await database.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('app.engineering_owner',$1,true)", [
      owner,
    ]);
    const result = await fn(db);
    await db.query("commit");
    return result;
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    db.release();
  }
}
function map<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([k]) => k !== "owner_id")
      .map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, a) => a.toUpperCase()),
        v instanceof Date ? v.toISOString() : v,
      ]),
  ) as T;
}
async function project(
  db: PoolClient,
  owner: string,
  id: string,
  lock = false,
) {
  const r = await db.query(
    "select * from public.engineering_projects where owner_id=$1 and id=$2" +
      (lock ? " for update" : ""),
    [owner, id],
  );
  if (!r.rows[0]) throw new Error("PROJECT_NOT_FOUND");
  return r.rows[0];
}
async function task(db: PoolClient, owner: string, p: string, id: string) {
  const r = await db.query(
    "select * from public.engineering_tasks where owner_id=$1 and project_id=$2 and id=$3",
    [owner, p, id],
  );
  if (!r.rows[0]) throw new Error("TASK_NOT_FOUND");
  return r.rows[0];
}
async function active(
  db: PoolClient,
  owner: string,
  p: string,
  runId: string,
  allowExpired = false,
) {
  const r = await project(db, owner, p, true);
  if (
    r.active_run_id !== runId ||
    (!allowExpired && new Date(r.lease_expires_at).getTime() <= Date.now())
  )
    throw new Error("LEASE_REQUIRED");
  const q = await db.query(
    "select * from public.engineering_runs where owner_id=$1 and project_id=$2 and id=$3 and status='running'",
    [owner, p, runId],
  );
  if (!q.rows[0]) throw new Error("RUN_NOT_ACTIVE");
  return { p: r, r: q.rows[0] };
}
export async function createProject(
  owner: string,
  input: { name: string; goal: string; stack?: string; source?: string },
) {
  return owned(owner, async (db) => {
    const id = randomUUID();
    const r = await db.query(
      "insert into public.engineering_projects(id,owner_id,name,goal,stack,source,workspace_root) values($1,$2,$3,$4,$5,$6,$7) returning *",
      [
        id,
        owner,
        input.name,
        input.goal,
        input.stack ?? "",
        input.source ?? "",
        `/workspace/projects/${id}`,
      ],
    );
    return map<Project>(r.rows[0]);
  });
}
export async function listProjects(owner: string, limit = 5, offset = 0) {
  const page = pagination(limit, offset);
  return owned(owner, async (db) =>
    (
      await db.query(
        "select * from public.engineering_projects where owner_id=$1 order by created_at desc,id desc limit $2 offset $3",
        [owner, page.limit, page.offset],
      )
    ).rows.map((r) => map<Project>(r)),
  );
}
export async function getProject(owner: string, id: string) {
  return owned(owner, async (db) => map<Project>(await project(db, owner, id)));
}
export async function getProjectBySession(owner: string, sessionId: string) {
  return owned(owner, async (db) => {
    const r = await db.query(
      "select * from public.engineering_projects where owner_id=$1 and session_id=$2",
      [owner, sessionId],
    );
    return r.rows[0] ? map<Project>(r.rows[0]) : null;
  });
}
export async function updateProject(
  owner: string,
  id: string,
  input: { name?: string; goal?: string; stack?: string; source?: string },
) {
  return owned(owner, async (db) => {
    await project(db, owner, id, true);
    const r = await db.query(
      "update public.engineering_projects set name=coalesce($3,name),goal=coalesce($4,goal),stack=coalesce($5,stack),source=coalesce($6,source) where owner_id=$1 and id=$2 returning *",
      [owner, id, input.name, input.goal, input.stack, input.source],
    );
    return map<Project>(r.rows[0]);
  });
}
export async function bindProjectSession(
  owner: string,
  id: string,
  sessionId: string,
) {
  return owned(owner, async (db) => {
    const p = await project(db, owner, id, true);
    if (p.session_id && p.session_id !== sessionId)
      throw new Error("PROJECT_ALREADY_BOUND");
    const r = await db.query(
      "update public.engineering_projects set session_id=$3 where owner_id=$1 and id=$2 returning *",
      [owner, id, sessionId],
    );
    return map<Project>(r.rows[0]);
  });
}
export async function createTask(
  owner: string,
  p: string,
  input: Pick<
    Task,
    | "title"
    | "kind"
    | "acceptanceCriteria"
    | "requiredChecks"
    | "requiredArtifacts"
  >,
) {
  return owned(owner, async (db) => {
    await project(db, owner, p);
    const r = await db.query(
      "insert into public.engineering_tasks(id,owner_id,project_id,title,kind,acceptance_criteria,required_checks,required_artifacts) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",
      [
        randomUUID(),
        owner,
        p,
        input.title,
        input.kind,
        JSON.stringify(input.acceptanceCriteria),
        JSON.stringify(input.requiredChecks),
        JSON.stringify(input.requiredArtifacts),
      ],
    );
    return map<Task>(r.rows[0]);
  });
}
export async function getTask(owner: string, p: string, id: string) {
  return owned(owner, async (db) => map<Task>(await task(db, owner, p, id)));
}
export async function listTasks(
  owner: string,
  p: string,
  limit = 5,
  offset = 0,
) {
  const page = pagination(limit, offset);
  return owned(owner, async (db) => {
    await project(db, owner, p);
    return (
      await db.query(
        "select * from public.engineering_tasks where owner_id=$1 and project_id=$2 order by created_at desc,id desc limit $3 offset $4",
        [owner, p, page.limit, page.offset],
      )
    ).rows.map((r) => map<Task>(r));
  });
}
export async function setActiveTask(owner: string, p: string, id: string) {
  return owned(owner, async (db) => {
    const row = await project(db, owner, p, true);
    await task(db, owner, p, id);
    if (
      row.active_run_id &&
      new Date(row.lease_expires_at).getTime() > Date.now()
    )
      throw new Error("PROJECT_BUSY");
    await db.query(
      "update public.engineering_projects set active_task_id=$3 where owner_id=$1 and id=$2",
      [owner, p, id],
    );
    return map<Task>(await task(db, owner, p, id));
  });
}
export async function updateTaskPlan(
  owner: string,
  p: string,
  id: string,
  input: Partial<
    Pick<
      Task,
      "title" | "acceptanceCriteria" | "requiredChecks" | "requiredArtifacts"
    >
  >,
) {
  return owned(owner, async (db) => {
    const proj = await project(db, owner, p, true);
    const t = await task(db, owner, p, id);
    if (
      proj.active_run_id &&
      new Date(proj.lease_expires_at).getTime() > Date.now()
    )
      throw new Error("PROJECT_BUSY");
    if (["verified", "accepted"].includes(t.status))
      throw new Error("TASK_IMMUTABLE");
    if (t.current_run_id) throw new Error("PLAN_FROZEN");
    const required = input.requiredChecks ?? t.required_checks;
    if (t.kind === "implementation" && !required.length)
      throw new Error("REQUIRED_CHECKS_EMPTY");
    const r = await db.query(
      "update public.engineering_tasks set title=coalesce($4,title),acceptance_criteria=coalesce($5,acceptance_criteria),required_checks=coalesce($6,required_checks),required_artifacts=coalesce($7,required_artifacts),status='planned',version=version+1 where owner_id=$1 and project_id=$2 and id=$3 returning *",
      [
        owner,
        p,
        id,
        input.title,
        input.acceptanceCriteria
          ? JSON.stringify(input.acceptanceCriteria)
          : null,
        input.requiredChecks ? JSON.stringify(input.requiredChecks) : null,
        input.requiredArtifacts
          ? JSON.stringify(input.requiredArtifacts)
          : null,
      ],
    );
    return map<Task>(r.rows[0]);
  });
}
export async function claimRun(
  owner: string,
  input: {
    projectId: string;
    taskId: string;
    sessionId: string;
    sandboxId?: string;
    parentCallId?: string;
    rootSessionId?: string;
    capability: string;
    idempotencyKey: string;
  },
) {
  return owned(owner, async (db) => {
    const p = await project(db, owner, input.projectId, true);
    if (p.session_id !== input.sessionId) throw new Error("SESSION_NOT_BOUND");
    if (p.sandbox_id && input.sandboxId !== p.sandbox_id)
      throw new Error("SANDBOX_MISMATCH");
    const t = await task(db, owner, input.projectId, input.taskId);
    const replay = await db.query(
      "select * from public.engineering_runs where owner_id=$1 and project_id=$2 and idempotency_key=$3",
      [owner, input.projectId, input.idempotencyKey],
    );
    if (replay.rows[0]) {
      if (
        replay.rows[0].task_id !== input.taskId ||
        replay.rows[0].capability !== input.capability ||
        (replay.rows[0].parent_call_id ?? null) !== (input.parentCallId ?? null) ||
        (replay.rows[0].root_session_id ?? null) !== (input.rootSessionId ?? null)
      )
        throw new Error("IDEMPOTENCY_CONFLICT");
      if (
        replay.rows[0].status === "running" &&
        p.active_run_id === replay.rows[0].id &&
        new Date(p.lease_expires_at).getTime() <= Date.now()
      )
        throw new Error("PROJECT_LEASE_EXPIRED");
      return { created: false, run: map<EngineeringRun>(replay.rows[0]) };
    }
    if (p.active_run_id) {
      if (new Date(p.lease_expires_at).getTime() > Date.now()) {
        const r = await db.query(
          "select * from public.engineering_runs where owner_id=$1 and id=$2",
          [owner, p.active_run_id],
        );
        return { created: false, run: map<EngineeringRun>(r.rows[0]) };
      }
      throw new Error("PROJECT_LEASE_EXPIRED");
    }
    if (["verified", "accepted"].includes(t.status))
      throw new Error("TASK_IMMUTABLE");
    const id = randomUUID();
    const r = await db.query(
      "insert into public.engineering_runs(id,owner_id,project_id,task_id,capability,idempotency_key,status,workspace_version,parent_call_id,root_session_id) values($1,$2,$3,$4,$5,$6,'running',$7,$8,$9) returning *",
      [
        id,
        owner,
        input.projectId,
        input.taskId,
        input.capability,
        input.idempotencyKey,
        p.workspace_version,
        input.parentCallId ?? null,
        input.rootSessionId ?? null,
      ],
    );
    await db.query(
      "update public.engineering_projects set active_run_id=$3,active_task_id=$4,lease_expires_at=now()+interval '10 minutes',sandbox_id=coalesce(sandbox_id,$5) where owner_id=$1 and id=$2",
      [owner, input.projectId, id, input.taskId, input.sandboxId],
    );
    await db.query(
      "update public.engineering_tasks set current_run_id=$4,status='running' where owner_id=$1 and project_id=$2 and id=$3",
      [owner, input.projectId, input.taskId, id],
    );
    return { created: true, run: map<EngineeringRun>(r.rows[0]) };
  });
}
export async function recordMutation(owner: string, p: string, runId: string) {
  return owned(owner, async (db) => {
    await active(db, owner, p, runId);
    const r = await db.query(
      "update public.engineering_projects set workspace_version=workspace_version+1,lease_expires_at=now()+interval '10 minutes' where owner_id=$1 and id=$2 returning workspace_version",
      [owner, p],
    );
    await db.query(
      "update public.engineering_tasks set status='needs_review' where owner_id=$1 and project_id=$2 and status='verified'",
      [owner, p],
    );
    await db.query(
      "update public.engineering_runs set workspace_version=$3 where owner_id=$1 and id=$2",
      [owner, runId, r.rows[0].workspace_version],
    );
    return r.rows[0].workspace_version as number;
  });
}
export async function completeRun(
  owner: string,
  p: string,
  runId: string,
  status: "succeeded" | "failed" | "cancelled",
  error?: string,
  evidence?: { command: string; cwd: string; exitCode: number; logs: string },
) {
  return owned(owner, async (db) => {
    const a = await active(db, owner, p, runId, true);
    await db.query(
      "update public.engineering_runs set status=$4,error=$5,completed_at=now(),command=$6,cwd=$7,exit_code=$8,logs=$9 where owner_id=$1 and project_id=$2 and id=$3",
      [
        owner,
        p,
        runId,
        status,
        error?.slice(0, 2000),
        evidence?.command,
        evidence?.cwd,
        evidence?.exitCode,
        evidence
          ? Buffer.from(evidence.logs).subarray(0, 65530).toString("utf8")
          : null,
      ],
    );
    await db.query(
      "update public.engineering_projects set active_run_id=null,lease_expires_at=null where owner_id=$1 and id=$2",
      [owner, p],
    );
    await db.query(
      "update public.engineering_tasks set status=$4 where owner_id=$1 and project_id=$2 and id=$3",
      [owner, p, a.r.task_id, status === "succeeded" ? "needs_review" : status],
    );
  });
}
export async function publishArtifact(
  owner: string,
  input: Omit<Artifact, "id" | "createdAt" | "contentHash">,
) {
  canonicalArtifactPath(input.path);
  validateArtifactContent(input.content, input.kind);
  return owned(owner, async (db) => {
    const a = await active(db, owner, input.projectId, input.runId);
    if (
      a.r.task_id !== input.taskId ||
      a.p.workspace_version !== input.workspaceVersion
    )
      throw new Error("STALE_EVIDENCE");
    const quota = await db.query(
      "select coalesce(sum(octet_length(content)),0)::int bytes from public.engineering_artifacts where owner_id=$1 and project_id=$2",
      [owner, input.projectId],
    );
    if (
      quota.rows[0].bytes + Buffer.byteLength(input.content) >
      20 * 1024 * 1024
    )
      throw new Error("PROJECT_PUBLICATION_QUOTA");
    const r = await db.query(
      "insert into public.engineering_artifacts(id,owner_id,project_id,task_id,run_id,path,kind,content,content_hash,workspace_version) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",
      [
        randomUUID(),
        owner,
        input.projectId,
        input.taskId,
        input.runId,
        input.path,
        input.kind,
        input.content,
        createHash("sha256").update(input.content).digest("hex"),
        input.workspaceVersion,
      ],
    );
    return map<Artifact>(r.rows[0]);
  });
}
export async function recordCheck(
  owner: string,
  input: Omit<Check, "id" | "createdAt">,
) {
  return owned(owner, async (db) => {
    const a = await active(db, owner, input.projectId, input.runId);
    const t = await task(db, owner, input.projectId, input.taskId);
    if (
      a.r.task_id !== input.taskId ||
      a.p.workspace_version !== input.workspaceVersion
    )
      throw new Error("STALE_EVIDENCE");
    if (
      !t.required_checks.some(
        (c: { id: string; command: string }) =>
          c.id === input.checkId && c.command === input.command,
      )
    )
      throw new Error("UNAPPROVED_CHECK");
    if (input.status === "passed" && input.exitCode !== 0)
      throw new Error("INVALID_CHECK_OUTCOME");
    const logs = Buffer.from(input.logs).subarray(0, 65530).toString("utf8");
    const r = await db.query(
      "insert into public.engineering_checks(id,owner_id,project_id,task_id,run_id,check_id,command,workspace_version,status,exit_code,logs) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",
      [
        randomUUID(),
        owner,
        input.projectId,
        input.taskId,
        input.runId,
        input.checkId,
        input.command,
        input.workspaceVersion,
        input.status,
        input.exitCode,
        logs,
      ],
    );
    return map<Check>(r.rows[0]);
  });
}
async function evidence<T>(
  owner: string,
  p: string,
  t: string,
  table: string,
  limit = 5,
  offset = 0,
) {
  const page = pagination(limit, offset);
  return owned(owner, async (db) => {
    await task(db, owner, p, t);
    return (
      await db.query(
        `select * from public.engineering_${table} where owner_id=$1 and project_id=$2 and task_id=$3 order by created_at desc,id desc limit $4 offset $5`,
        [owner, p, t, page.limit, page.offset],
      )
    ).rows.map((r) => map<T>(r));
  });
}
export const listArtifacts = (o: string, p: string, t: string, l = 5, s = 0) =>
  evidence<Artifact>(o, p, t, "artifacts", l, s);
export const listChecks = (o: string, p: string, t: string, l = 5, s = 0) =>
  evidence<Check>(o, p, t, "checks", l, s);
export const listRuns = (o: string, p: string, t: string, l = 5, s = 0) =>
  evidence<EngineeringRun>(o, p, t, "runs", l, s);
export async function verifyTask(owner: string, p: string, id: string) {
  return owned(owner, async (db) => {
    const proj = await project(db, owner, p, true);
    if (
      proj.active_run_id &&
      new Date(proj.lease_expires_at).getTime() > Date.now()
    )
      throw new Error("PROJECT_BUSY");
    const t = map<Task>(await task(db, owner, p, id));
    if (t.status !== "needs_review" || !t.currentRunId)
      throw new Error("TASK_NOT_READY");
    const current = await db.query(
      "select status from public.engineering_runs where owner_id=$1 and project_id=$2 and id=$3",
      [owner, p, t.currentRunId],
    );
    if (current.rows[0]?.status !== "succeeded")
      throw new Error("RUN_NOT_SUCCEEDED");
    const checks = (
      await db.query(
        "select c.*,r.status run_status from public.engineering_checks c join public.engineering_runs r on r.id=c.run_id and r.owner_id=c.owner_id where c.owner_id=$1 and c.project_id=$2 and c.task_id=$3 and c.workspace_version=$4 order by c.created_at desc,c.id desc",
        [owner, p, id, proj.workspace_version],
      )
    ).rows.map((r) =>
      map<Check>({
        ...r,
        status: r.run_status === "succeeded" ? r.status : "failed",
      }),
    );
    const artifacts = (
      await db.query(
        "select a.path,a.workspace_version from public.engineering_artifacts a join public.engineering_runs r on r.id=a.run_id and r.owner_id=a.owner_id where a.owner_id=$1 and a.project_id=$2 and a.task_id=$3 and a.workspace_version=$4 and r.status='succeeded'",
        [owner, p, id, proj.workspace_version],
      )
    ).rows.map((r) => map<Artifact>(r));
    const failure = verificationFailure(
      t,
      proj.workspace_version,
      checks,
      artifacts,
    );
    if (failure) throw new Error(failure);
    const r = await db.query(
      "update public.engineering_tasks set status='verified',version=version+1 where owner_id=$1 and project_id=$2 and id=$3 returning *",
      [owner, p, id],
    );
    return map<Task>(r.rows[0]);
  });
}
export async function acceptTask(owner: string, p: string, id: string) {
  return owned(owner, async (db) => {
    const t = await task(db, owner, p, id);
    if (t.kind !== "analysis" || t.status !== "needs_review")
      throw new Error("ANALYSIS_NOT_READY");
    const r = await db.query(
      "update public.engineering_tasks set status='accepted',version=version+1 where owner_id=$1 and project_id=$2 and id=$3 returning *",
      [owner, p, id],
    );
    return map<Task>(r.rows[0]);
  });
}
// Caller must first await a provider-confirmed stop of the bound sandbox.
// Kept out of the HTTP API: only the trusted runtime recovery adapter invokes it.
export async function recoverExpiredRun(
  owner: string,
  p: string,
  expectedRunId: string,
) {
  return owned(owner, async (db) => {
    const proj = await project(db, owner, p, true);
    if (
      proj.active_run_id !== expectedRunId ||
      !proj.lease_expires_at ||
      new Date(proj.lease_expires_at).getTime() > Date.now()
    )
      throw new Error("RECOVERY_NOT_ELIGIBLE");
    const result = await db.query(
      "update public.engineering_runs set status='failed',error='Expired execution stopped and recovered',completed_at=now() where owner_id=$1 and project_id=$2 and id=$3 and status='running' returning task_id",
      [owner, p, expectedRunId],
    );
    if (!result.rows[0]) throw new Error("RUN_NOT_ACTIVE");
    await db.query(
      "update public.engineering_tasks set status='failed' where owner_id=$1 and project_id=$2 and id=$3 and current_run_id=$4",
      [owner, p, result.rows[0].task_id, expectedRunId],
    );
    await db.query(
      "update public.engineering_projects set active_run_id=null,lease_expires_at=null where owner_id=$1 and id=$2",
      [owner, p],
    );
  });
}
export async function attachWorkflowRun(
  owner: string,
  p: string,
  taskId: string,
  workflowRunId: string,
) {
  return owned(owner, async (db) => {
    const proj = await project(db, owner, p, true);
    const t = await task(db, owner, p, taskId);
    const existing = await db.query(
      "select project_id,task_id from public.agent_workflow_runs where user_id=$1 and id=$2 for update",
      [owner, workflowRunId],
    );
    const run = existing.rows[0];
    if (!run) throw new Error("RUN_NOT_FOUND");
    if (run.project_id !== null) {
      if (run.project_id !== p || run.task_id !== taskId) throw new Error("IDEMPOTENCY_CONFLICT");
      return; // Existing attachment is immutable, including its frozen task authority.
    }
    if (proj.active_run_id || ["verified", "accepted"].includes(t.status)) throw new Error("PROJECT_BUSY");
    const result = await db.query(
      "update public.agent_workflow_runs set project_id=$3,task_id=$4,draft_task_version=$5,draft_execution_run_id=$6 where user_id=$1 and id=$2 and project_id is null",
      [owner, workflowRunId, p, taskId, t.version, t.current_run_id],
    );
    if (result.rowCount !== 1) throw new Error("RUN_NOT_FOUND");
    await db.query(
      "update public.engineering_tasks set latest_draft_run_id=$4 where owner_id=$1 and project_id=$2 and id=$3",
      [owner, p, taskId, workflowRunId],
    );
  });
}
export async function settleWorkflowDraft(
  owner: string,
  p: string,
  taskId: string,
  workflowRunId: string,
) {
  return owned(owner, async (db) => {
    const proj = await project(db, owner, p, true);
    const t = await task(db, owner, p, taskId);
    const result = await db.query(
      "select status,draft_task_version,draft_execution_run_id from public.agent_workflow_runs where user_id=$1 and project_id=$2 and task_id=$3 and id=$4",
      [owner, p, taskId, workflowRunId],
    );
    const run = result.rows[0];
    if (!run || run.status === "running") throw new Error("RUN_NOT_READY");
    // A draft only settles the exact task attempt it was attached to. Stale and
    // already-settled replays are reads; they cannot change status or version.
    if (t.latest_draft_run_id !== workflowRunId || t.version !== run.draft_task_version ||
        (t.current_run_id ?? null) !== (run.draft_execution_run_id ?? null) ||
        ["verified", "accepted"].includes(t.status)) return map<Task>(t);
    if (proj.active_run_id) throw new Error("PROJECT_BUSY");
    const updated = await db.query(
      "update public.engineering_tasks set status=$4,version=version+1 where owner_id=$1 and project_id=$2 and id=$3 and version=$5 and latest_draft_run_id=$6 and current_run_id is not distinct from $7::uuid returning *",
      [owner, p, taskId, run.status === "succeeded" ? "needs_review" : "failed", run.draft_task_version, workflowRunId, run.draft_execution_run_id],
    );
    return map<Task>(updated.rows[0] ?? t);
  });
}
