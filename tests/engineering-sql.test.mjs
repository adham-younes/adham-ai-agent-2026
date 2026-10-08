import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const enabled = Boolean(process.env.PGLITE_MODULE);
test(
  "isolated PostgreSQL migration: owner RLS, composite linkage, durable evidence and verification",
  { skip: !enabled },
  async () => {
    const { PGlite } = await import(process.env.PGLITE_MODULE);
    const db = new PGlite();
    await db.exec(
      "create role anon; create role authenticated; create role agent_runtime; create table public.agent_workflow_runs (id uuid primary key,user_id text not null);",
    );
    await db.exec(
      await readFile(
        new URL(
          "../db/migrations/0008_engineering_workspace.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const query = (sql, values) => db.query(sql, values);
    const validations = await readFile(
      new URL("../lib/engineering/validation.ts", import.meta.url),
      "utf8",
    );
    const v = await import(
      "data:text/javascript;base64," +
        Buffer.from(
          ts.transpileModule(validations, {
            compilerOptions: { module: ts.ModuleKind.ESNext },
          }).outputText,
        ).toString("base64")
    );
    globalThis.engineeringSqlValidation = v;
    globalThis.engineeringSqlDatabase = {
      connect: async () => ({ query, release() {} }),
    };
    const src = await readFile(
      new URL("../lib/engineering/repository.ts", import.meta.url),
      "utf8",
    );
    const replaced = src
      .replace(
        /import \{ database \} from "\.\.\/platform\/database";/,
        "const database=globalThis.engineeringSqlDatabase;",
      )
      .replace(
        /import \{\s*pagination,[\s\S]*?\} from "\.\/validation";/,
        "const {pagination,canonicalArtifactPath,validateArtifactContent,verificationFailure}=globalThis.engineeringSqlValidation;",
      );
    const r = await import(
      "data:text/javascript;base64," +
        Buffer.from(
          ts.transpileModule(replaced, {
            compilerOptions: { module: ts.ModuleKind.ESNext },
          }).outputText,
        ).toString("base64")
    );
    await db.exec("set role agent_runtime;");
    const p = await r.createProject("owner", {
      name: "Real test",
      goal: "Prove ownership",
    });
    assert.equal((await r.listProjects("foreign")).length, 0);
    await assert.rejects(r.getProject("foreign", p.id), /PROJECT_NOT_FOUND/);
    const t = await r.createTask("owner", p.id, {
      title: "Change source",
      kind: "implementation",
      acceptanceCriteria: ["passes test"],
      requiredChecks: [{ id: "test", command: "node --test" }],
      requiredArtifacts: ["src/a.ts"],
    });
    await r.bindProjectSession("owner", p.id, "session");
    await r.setActiveTask("owner", p.id, t.id);
    await r.updateTaskPlan("owner", p.id, t.id, {});
    const attempt = await r.claimRun("owner", {
      projectId: p.id,
      taskId: t.id,
      sessionId: "session",
      sandboxId: "sandbox",
      capability: "write",
      idempotencyKey: "first",
    });
    const version = await r.recordMutation("owner", p.id, attempt.run.id);
    await r.publishArtifact("owner", {
      projectId: p.id,
      taskId: t.id,
      runId: attempt.run.id,
      path: "src/a.ts",
      kind: "text",
      content: "export const answer=42;",
      workspaceVersion: version,
    });
    await r.recordCheck("owner", {
      projectId: p.id,
      taskId: t.id,
      runId: attempt.run.id,
      checkId: "test",
      command: "node --test",
      workspaceVersion: version,
      status: "passed",
      exitCode: 0,
      logs: "passed",
    });
    await assert.rejects(r.verifyTask("owner", p.id, t.id), /PROJECT_BUSY/);
    await r.completeRun("owner", p.id, attempt.run.id, "succeeded", undefined, {
      command: "node --test",
      cwd: p.workspaceRoot,
      exitCode: 0,
      logs: "passed",
    });
    assert.equal((await r.verifyTask("owner", p.id, t.id)).status, "verified");
    assert.equal(
      (await r.listRuns("owner", p.id, t.id))[0].command,
      "node --test",
    );
    const t2 = await r.createTask("owner", p.id, {
      title: "Failure test",
      kind: "implementation",
      acceptanceCriteria: ["passes"],
      requiredChecks: [{ id: "test", command: "node --test" }],
      requiredArtifacts: [],
    });
    const failed = await r.claimRun("owner", {
      projectId: p.id,
      taskId: t2.id,
      sessionId: "session",
      sandboxId: "sandbox",
      capability: "check",
      idempotencyKey: "failure",
    });
    await r.recordCheck("owner", {
      projectId: p.id,
      taskId: t2.id,
      runId: failed.run.id,
      checkId: "test",
      command: "node --test",
      workspaceVersion: version,
      status: "passed",
      exitCode: 0,
      logs: "passed before interrupted snapshot",
    });
    await r.completeRun(
      "owner",
      p.id,
      failed.run.id,
      "failed",
      "snapshot failed",
    );
    await assert.rejects(
      r.verifyTask("owner", p.id, t2.id),
      /TASK_NOT_READY|RUN_NOT_SUCCEEDED/,
    );
    await assert.rejects(
      r.updateTaskPlan("owner", p.id, t2.id, {
        requiredChecks: [{ id: "easier", command: "echo done" }],
      }),
      /PLAN_FROZEN/,
    );
    const retry = await r.claimRun("owner", {
      projectId: p.id,
      taskId: t2.id,
      sessionId: "session",
      sandboxId: "sandbox",
      capability: "check",
      idempotencyKey: "retry",
    });
    await r.recordCheck("owner", {
      projectId: p.id,
      taskId: t2.id,
      runId: retry.run.id,
      checkId: "test",
      command: "node --test",
      workspaceVersion: version,
      status: "failed",
      exitCode: 1,
      logs: "actual failure",
    });
    await r.completeRun("owner", p.id, retry.run.id, "succeeded");
    await assert.rejects(
      r.verifyTask("owner", p.id, t2.id),
      /CHECKS_NOT_PASSED/,
    );
    assert.equal(
      (await r.getTask("owner", p.id, t2.id)).status,
      "needs_review",
    );
    assert.equal(
      (await db.query("select * from public.engineering_projects")).rows.length,
      0,
      "FORCE RLS without owner setting denies all runtime rows",
    );
    const stale = await r.claimRun("owner", {
      projectId: p.id,
      taskId: t2.id,
      sessionId: "session",
      sandboxId: "sandbox",
      capability: "write",
      idempotencyKey: "stale",
    });
    await db.exec(
      "begin;select set_config('app.engineering_owner','owner',true);",
    );
    await db.query(
      "update public.engineering_projects set lease_expires_at=now()-interval '1 second' where id=$1",
      [p.id],
    );
    await db.exec("commit;");
    await assert.rejects(
      r.claimRun("owner", {
        projectId: p.id,
        taskId: t2.id,
        sessionId: "session",
        sandboxId: "sandbox",
        capability: "write",
        idempotencyKey: "stale",
      }),
      /PROJECT_LEASE_EXPIRED/,
    );
    await assert.rejects(
      r.claimRun("owner", {
        projectId: p.id,
        taskId: t2.id,
        sessionId: "session",
        sandboxId: "sandbox",
        capability: "write",
        idempotencyKey: "new-after-stale",
      }),
      /PROJECT_LEASE_EXPIRED/,
    );
    await assert.rejects(
      r.recoverExpiredRun(
        "owner",
        p.id,
        "00000000-0000-0000-0000-000000000001",
      ),
      /RECOVERY_NOT_ELIGIBLE/,
    );
    await r.recoverExpiredRun("owner", p.id, stale.run.id);
    assert.equal((await r.getProject("owner", p.id)).activeRunId, null);
    assert.equal((await r.getTask("owner", p.id, t2.id)).status, "failed");
    await db.exec("reset role;");
    const p2 = await r.createProject("foreign", {
      name: "Foreign",
      goal: "Isolate",
    });
    await assert.rejects(
      db.query(
        "insert into public.engineering_tasks(id,owner_id,project_id,title,kind)values('00000000-0000-0000-0000-000000000001','owner',$1,'Foreign','analysis')",
        [p2.id],
      ),
      /foreign key constraint/,
    );
    await db.close();
  },
);
