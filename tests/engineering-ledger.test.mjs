import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../lib/engineering/validation.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const v = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
const task = {
  kind: "implementation",
  requiredChecks: [{ id: "test", command: "npm test" }],
  requiredArtifacts: ["src/a.ts"],
};
const check = {
  checkId: "test",
  command: "npm test",
  workspaceVersion: 2,
  status: "passed",
  exitCode: 0,
};
const artifact = { path: "src/a.ts", workspaceVersion: 2 };
test("verification requires actual complete current command and artifact evidence", () => {
  assert.equal(v.verificationFailure(task, 2, [check], [artifact]), null);
  for (const c of [
    { ...check, workspaceVersion: 1 },
    { ...check, command: "echo pass" },
    { ...check, exitCode: 1 },
    { ...check, status: "running" },
  ])
    assert.ok(v.verificationFailure(task, 2, [c], [artifact]));
  assert.ok(
    v.verificationFailure({ ...task, requiredChecks: [] }, 2, [], [artifact]),
  );
  assert.ok(v.verificationFailure(task, 2, [check], []));
});
test("canonical paths reject traversal and artifact publication bounds bytes", () => {
  for (const path of [
    "../a",
    "/etc/passwd",
    "a/../../b",
    "a\\b",
    "a//b",
    ".git/config",
  ])
    assert.throws(() => v.canonicalArtifactPath(path));
  assert.equal(v.canonicalArtifactPath("src/a.ts"), "src/a.ts");
  assert.throws(
    () => v.validateArtifactContent("é".repeat(131073)),
    /ARTIFACT_TOO_LARGE/,
  );
});
test("pagination caps ten and rejects invalid offsets", () => {
  assert.deepEqual(v.pagination(500, 0), { limit: 10, offset: 0 });
  assert.throws(() => v.pagination(5, -1));
});
test("a later failed attempt at the same revision invalidates an older pass", () => {
  assert.ok(
    v.verificationFailure(
      task,
      2,
      [{ ...check, status: "failed", exitCode: 1 }, check],
      [artifact],
    ),
  );
});
const repositorySource = await readFile(
  new URL("../lib/engineering/repository.ts", import.meta.url),
  "utf8",
);
const repositoryJs = ts.transpileModule(
  repositorySource
    .replace(
      /import \{ database \} from "\.\.\/platform\/database";/,
      "const database=globalThis.engineeringTestDatabase;",
    )
    .replace(
      /import \{\s*pagination,[\s\S]*?\} from "\.\/validation";/,
      "const {pagination,canonicalArtifactPath,validateArtifactContent,verificationFailure}=globalThis.engineeringValidation;",
    ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
globalThis.engineeringValidation = v;
let query;
const calls = [];
globalThis.engineeringTestDatabase = {
  connect: async () => ({
    query: async (sql, args) => {
      calls.push({ sql, args });
      if (
        ["begin", "commit", "rollback"].includes(sql) ||
        sql.startsWith("select set_config")
      )
        return { rows: [] };
      return query(sql, args);
    },
    release() {},
  }),
};
const repo = await import(
  `data:text/javascript;base64,${Buffer.from(repositoryJs).toString("base64")}`
);
const project = {
  id: "project",
  owner_id: "owner",
  session_id: "session",
  sandbox_id: "sandbox",
  workspace_version: 2,
  active_run_id: null,
  lease_expires_at: null,
};
const run = {
  id: "run",
  task_id: "task",
  capability: "write",
  status: "failed",
  workspace_version: 2,
};
test("owner transaction sets private RLS principal and foreign project returns missing", async () => {
  calls.length = 0;
  query = async (sql, args) => {
    assert.match(sql, /owner_id=\$1 and id=\$2/);
    assert.deepEqual(args, ["owner", "foreign"]);
    return { rows: [] };
  };
  await assert.rejects(
    repo.getProject("owner", "foreign"),
    /PROJECT_NOT_FOUND/,
  );
  assert.equal(
    calls[1].sql,
    "select set_config('app.engineering_owner',$1,true)",
  );
  assert.deepEqual(calls[1].args, ["owner"]);
  assert.equal(calls.at(-1).sql, "rollback");
});
test("immutable replay is returned without inserting or executing again", async () => {
  query = async (sql) =>
    sql.includes("engineering_projects")
      ? { rows: [project] }
      : sql.includes("engineering_tasks")
        ? { rows: [{ id: "task" }] }
        : { rows: [run] };
  const replay = await repo.claimRun("owner", {
    projectId: "project",
    taskId: "task",
    sessionId: "session",
    sandboxId: "sandbox",
    capability: "write",
    idempotencyKey: "same",
  });
  assert.equal(replay.created, false);
  assert.equal(replay.run.status, "failed");
});
test("concurrent lease returns existing run without creating another attempt", async () => {
  query = async (sql) =>
    sql.includes("engineering_projects")
      ? {
          rows: [
            {
              ...project,
              active_run_id: "existing",
              lease_expires_at: new Date(Date.now() + 10000),
            },
          ],
        }
      : sql.includes("engineering_tasks")
        ? { rows: [{ id: "task" }] }
        : sql.includes("idempotency_key")
          ? { rows: [] }
          : { rows: [{ ...run, id: "existing", status: "running" }] };
  const busy = await repo.claimRun("owner", {
    projectId: "project",
    taskId: "task",
    sessionId: "session",
    sandboxId: "sandbox",
    capability: "write",
    idempotencyKey: "new",
  });
  assert.equal(busy.created, false);
  assert.equal(busy.run.id, "existing");
});
test("sandbox and session identity cannot be nominated to access bound project", async () => {
  query = async () => ({ rows: [project] });
  await assert.rejects(
    repo.claimRun("owner", {
      projectId: "project",
      taskId: "task",
      sessionId: "foreign",
      capability: "write",
      idempotencyKey: "new",
    }),
    /SESSION_NOT_BOUND/,
  );
  await assert.rejects(
    repo.claimRun("owner", {
      projectId: "project",
      taskId: "task",
      sessionId: "session",
      sandboxId: "foreign",
      capability: "write",
      idempotencyKey: "new",
    }),
    /SANDBOX_MISMATCH/,
  );
});
test("verification refuses a running lease before considering historical checks", async () => {
  query = async () => ({
    rows: [
      {
        ...project,
        active_run_id: "existing",
        lease_expires_at: new Date(Date.now() + 10000),
      },
    ],
  });
  await assert.rejects(
    repo.verifyTask("owner", "project", "task"),
    /PROJECT_BUSY/,
  );
});
const { z } = await import("zod");
globalThis.engineeringHttpImports = {
  zod: { z },
  "@/lib/visitor-identity": {
    visitorIdFromRequest: () => "owner",
    isCrossOriginMutation: () => false,
  },
};
const httpSource = await readFile(
  new URL("../app/api/projects/http.ts", import.meta.url),
  "utf8",
);
const httpJs = ts.transpileModule(
  httpSource.replace(
    /import \{([\s\S]*?)\} from "([^"]+)";/g,
    (_, symbols, path) =>
      `const {${symbols}}=globalThis.engineeringHttpImports[${JSON.stringify(path)}];`,
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const http = await import(
  `data:text/javascript;base64,${Buffer.from(httpJs).toString("base64")}`
);
test("HTTP body cap cancels streamed oversized input before reading all chunks", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(c) {
      c.enqueue(new Uint8Array(256001));
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request("https://example.test/api/projects", {
    method: "POST",
    body: stream,
    duplex: "half",
  });
  await assert.rejects(http.body(req), /REQUEST_TOO_LARGE/);
  assert.equal(cancelled, true);
});
test("task plan rejects duplicate checks and trivial certification commands", () => {
  const input = {
    title: "Task",
    acceptanceCriteria: ["works"],
    requiredChecks: [{ id: "test", command: "echo passed" }],
    requiredArtifacts: [],
    kind: "implementation",
  };
  assert.equal(http.taskInput.safeParse(input).success, false);
  assert.equal(
    http.taskInput.safeParse({
      ...input,
      requiredChecks: [
        { id: "test", command: "node --test" },
        { id: "test", command: "npm test" },
      ],
    }).success,
    false,
  );
});
