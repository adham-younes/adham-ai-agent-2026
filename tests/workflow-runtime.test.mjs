import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createHash } from "node:crypto";
import { z } from "zod";

const source = await readFile(new URL("../lib/platform/run-repository.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source.replace(/import \{ database \} from "\.\/database";/, "const database = globalThis.workflowTestDatabase;"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
let query;
let staleQuery;
globalThis.workflowTestDatabase = { query: (...args) => args[0].includes("interval '10 minutes'") ? staleQuery ? staleQuery(...args) : { rows: [], rowCount: 0 } : query(...args) };
const repository = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const row = { id: "run", workflow_id: "feature-delivery", status: "running", duration_ms: null, created_at: new Date(), completed_at: null, input_data: { prompt: "build" }, output_data: null, error_message: null };

test("history is bounded to ten and scoped to the visitor", async () => {
  query = async (sql, values) => { assert.match(sql, /user_id = \$1/); assert.deepEqual(values, ["owner", 10]); return { rows: [row] }; };
  assert.equal((await repository.listWorkflowRuns("owner", 500)).length, 1);
});

test("completion cannot mutate another owner's run", async () => {
  query = async (sql, values) => { assert.match(sql, /user_id = \$2/); assert.equal(values[1], "owner"); return { rows: [], rowCount: 0 }; };
  await assert.rejects(repository.completeWorkflowRun({ id: "run", userId: "owner", status: "succeeded", durationMs: 1 }), /RUN_NOT_FOUND/);
});

test("same request returns persisted output and changed payload conflicts", async () => {
  let calls = 0;
  query = async () => { calls++; return calls % 2 ? { rows: [] } : { rows: [{ ...row, input_data: { prompt: "build" }, workflow_id: "feature-delivery" }] }; };
  const same = await repository.createWorkflowRun({ id: "new", userId: "owner", workflowId: "feature-delivery", inputData: { prompt: "build" }, idempotencyKey: "key" });
  assert.equal(same.created, false);
  await assert.rejects(repository.createWorkflowRun({ id: "new", userId: "owner", workflowId: "feature-delivery", inputData: { prompt: "changed" }, idempotencyKey: "key" }), /IDEMPOTENCY_CONFLICT/);
});

test("run detail is scoped and includes saved input and output", async () => {
  query = async (sql, values) => { assert.match(sql, /user_id = \$1.*id = \$2/s); assert.deepEqual(values, ["owner", "run"]); return { rows: [{ ...row, output_data: { result: "report" } }] }; };
  const run = await repository.getWorkflowRun("owner", "run");
  assert.deepEqual(run.inputData, { prompt: "build" });
  assert.deepEqual(run.outputData, { result: "report" });
});

test("retry of an expired run returns its reconciled failure without a new run", async () => {
  let interrupted = false;
  staleQuery = async (sql, values) => {
    assert.match(sql, /user_id = \$1/);
    assert.match(sql, /status = 'running'/);
    assert.match(sql, /completed_at = now\(\)/);
    assert.deepEqual(values, ["owner"]);
    interrupted = true;
    return { rows: [], rowCount: 1 };
  };
  query = async (sql) => sql.includes("insert into") ? { rows: [] } : { rows: [{ ...row, status: interrupted ? "failed" : "running", completed_at: interrupted ? new Date() : null }] };
  const retry = await repository.createWorkflowRun({ id: "new", userId: "owner", workflowId: "feature-delivery", inputData: { prompt: "build" }, idempotencyKey: "expired-key" });
  assert.equal(retry.created, false);
  assert.equal(retry.run.status, "failed");
  assert.ok(retry.run.completedAt);
  staleQuery = undefined;
});

test("late completion cannot overwrite a reconciled failure", async () => {
  query = async (sql) => {
    assert.match(sql, /status = 'running'/);
    return { rows: [], rowCount: 0 };
  };
  await assert.rejects(repository.completeWorkflowRun({ id: "expired", userId: "owner", status: "succeeded", durationMs: 1 }), /RUN_NOT_FOUND/);
});

test("missing database fails closed instead of pretending to save", async () => {
  const noDatabaseJs = ts.transpileModule(source.replace(/import \{ database \} from "\.\/database";/, "const database = undefined;"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const unavailable = await import(`data:text/javascript;base64,${Buffer.from(noDatabaseJs).toString("base64")}`);
  await assert.rejects(unavailable.listWorkflowRuns("owner"), /DATABASE_UNAVAILABLE/);
  await assert.rejects(unavailable.createWorkflowRun({ id: "run", userId: "owner", workflowId: "feature-delivery", inputData: {}, idempotencyKey: "key" }), /DATABASE_UNAVAILABLE/);
});

test("real feature input schema rejects empty requirements", async () => {
  globalThis.workflowSchemaZod = z;
  const feature = await readFile(new URL("../lib/mastra/workflows/feature-delivery.ts", import.meta.url), "utf8");
  const declaration = feature.match(/export const SpecInputSchema = z\.object\([\s\S]*?\n\}\);/)[0];
  const schemaJs = ts.transpileModule(`const z = globalThis.workflowSchemaZod;\n${declaration}`, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  const { SpecInputSchema } = await import(`data:text/javascript;base64,${Buffer.from(schemaJs).toString("base64")}`);
  assert.equal(SpecInputSchema.safeParse({ featureTitle: "", userRequirements: " " }).success, false);
  assert.equal(SpecInputSchema.safeParse({ featureTitle: "Build a portal", userRequirements: "Visitors can upload documents" }).success, true);
});

const routeSource = await readFile(new URL("../app/api/executive-workflows/route.ts", import.meta.url), "utf8");
let completionFails = false;
const imports = {
  "node:crypto": { createHash, randomUUID: () => "abcdefab-1234-4567-abcd-abcdefabcdef" },
  "next/headers": { headers: async () => new Headers() },
  "next/server": { NextResponse: Response },
  "@/lib/visitor-identity": { visitorIdFromRequest: () => "owner" },
  "@/lib/mastra": { initializeWorkflowStorage: async () => {}, mastra: { getWorkflow: () => ({ createRun: async () => ({ start: async () => ({ status: "failed", error: new Error("provider failure") }) }) }) } },
  "@/lib/platform/run-repository": { hasDurableRunStore: () => true, createWorkflowRun: async () => ({ created: true, run: { id: "abcdefab-1234-4567-abcd-abcdefabcdef" } }), completeWorkflowRun: async (value) => { if (completionFails) throw new Error("DB offline"); globalThis.lastCompletion = value; }, listWorkflowRuns: async () => [], getWorkflowRun: async () => null },
  "@/lib/platform/workflows": { workflowRequestSchema: { safeParse: (data) => ({ success: true, data }) }, validateWorkflowInput: (_id, data) => ({ success: true, data }), resolveWorkflow: () => ({ id: "feature-delivery", key: "featureDeliveryWorkflow" }), workflowCatalog: [] },
};
imports["@/agent/lib/project-context"] = { resolveEngineeringBinding: async () => null };
imports["@/lib/engineering/repository"] = {
  getProject: async (owner, id) => owner === "owner" && id === "11111111-1111-4111-8111-111111111111" ? { id } : null,
  getTask: async (owner, p, id) => owner === "owner" && p === "11111111-1111-4111-8111-111111111111" && id === "22222222-2222-4222-8222-222222222222" ? { id } : null,
  attachWorkflowRun: async (...args) => { globalThis.workflowAttachment = args; },
  settleWorkflowDraft: async () => {},
};
imports["./run-repository"] = imports["@/lib/platform/run-repository"];
imports["./workflows"] = imports["@/lib/platform/workflows"];
const serviceSource = await readFile(new URL("../lib/platform/workflow-service.ts", import.meta.url), "utf8");
globalThis.workflowRouteImports = imports;
const serviceJs = ts.transpileModule(serviceSource.replace(/import \{([\s\S]*?)\} from "([^"]+)";/g, (_all, symbols, path) => `const {${symbols}} = globalThis.workflowRouteImports[${JSON.stringify(path)}];`), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
imports["@/lib/platform/workflow-service"] = await import(`data:text/javascript;base64,${Buffer.from(serviceJs).toString("base64")}`);
const routeJs = ts.transpileModule(routeSource.replace(/import \{([\s\S]*?)\} from "([^"]+)";/g, (_all, symbols, path) => `const {${symbols}} = globalThis.workflowRouteImports[${JSON.stringify(path)}];`), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const route = await import(`data:text/javascript;base64,${Buffer.from(routeJs).toString("base64")}`);
const request = () => new Request("https://example.com/api/executive-workflows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId: "feature-delivery", inputData: {}, idempotencyKey: "repeat-key" }) });

test("returned Mastra failure never becomes persisted success", async () => {
  const response = await route.POST(request());
  assert.equal(response.status, 500);
  assert.equal(globalThis.lastCompletion.status, "failed");
  assert.equal(globalThis.lastCompletion.userId, "owner");
  assert.equal((await response.json()).success, false);
});

test("workflow success with audit outage returns persistence unconfirmed", async () => {
  imports["@/lib/mastra"].mastra.getWorkflow = () => ({ createRun: async () => ({ start: async () => ({ status: "success", result: "report" }) }) });
  completionFails = true;
  globalThis.lastCompletion = null;
  const response = await route.POST(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).status, "persistence-unconfirmed");
  assert.equal(globalThis.lastCompletion, null);
  completionFails = false;
});

test("final feature report retains the generated architecture, SQL, and code", async () => {
  const featureSource = await readFile(new URL("../lib/mastra/workflows/feature-delivery.ts", import.meta.url), "utf8");
  let stepNumber = 0;
  const builder = { then() { return this; }, commit() { return this; } };
  globalThis.workflowFeatureImports = {
    "@mastra/core/workflows": { createStep: (config) => config, createWorkflow: () => builder },
    "ai": { generateText: async () => ({ text: `actual draft ${++stepNumber}` }) },
    "zod": { z }, "@/lib/groq": { getGroqModel: () => ({}) },
  };
  const featureJs = ts.transpileModule(featureSource.replace(/import \{([\s\S]*?)\} from "([^"]+)";/g, (_all, symbols, path) => `const {${symbols}} = globalThis.workflowFeatureImports[${JSON.stringify(path)}];`), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const feature = await import(`data:text/javascript;base64,${Buffer.from(featureJs).toString("base64")}`);
  let inputData = { featureTitle: "Portal", userRequirements: "Upload files", targetStack: "Next.js" };
  for (const name of ["specArchitectureStep", "databaseSchemaStep", "codeImplementationStep", "securityQualityStep"]) {
    const step = feature[name];
    inputData = step.outputSchema.parse(await step.execute({ inputData }));
  }
  assert.equal(inputData.architectureSummary, "actual draft 1");
  assert.equal(inputData.sqlSchema, "actual draft 2");
  assert.equal(inputData.generatedCode, "actual draft 3");
  assert.equal(inputData.securityReport, "actual draft 4");
});

test("storage initializes with defaults hardened only for its current role", async () => {
  const indexSource = await readFile(new URL("../lib/mastra/index.ts", import.meta.url), "utf8");
  const statements = [];
  let initialized = 0;
  globalThis.workflowStorageImports = {
    "@mastra/core": { Mastra: class {} },
    "@mastra/pg": { PostgresStore: class { async init() { initialized++; } } },
    "../platform/database": { normalizePostgresUrl: (value) => value, postgresTls: () => ({}), database: { query: async (sql) => { statements.push(sql); return { rows: [{ role: "agent_runtime" }] }; } } },
  };
  const modified = indexSource.replace(/import \{([\s\S]*?)\} from "([^"]+)";/g, (_all, symbols, path) => {
    globalThis.workflowStorageImports[path] ??= Object.fromEntries(symbols.trim().split(/,\s*/).map((name) => [name, {}]));
    return `const {${symbols}} = globalThis.workflowStorageImports[${JSON.stringify(path)}];`;
  });
  const previous = process.env.POSTGRES_URL;
  process.env.POSTGRES_URL = "postgres://runtime@localhost/test";
  try {
    const storageJs = ts.transpileModule(modified, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const index = await import(`data:text/javascript;base64,${Buffer.from(storageJs).toString("base64")}`);
    await Promise.all([index.initializeWorkflowStorage(), index.initializeWorkflowStorage()]);
    assert.equal(initialized, 1);
    assert.ok(statements.some((sql) => /select current_user/i.test(sql)));
    const hardening = statements.filter((sql) => /alter default privileges/i.test(sql)).join("\n");
    assert.match(hardening, /in schema public/i);
    assert.match(hardening, /in schema mastra/i);
    assert.match(hardening, /revoke execute on functions from public, anon, authenticated/i);
    assert.doesNotMatch(hardening, /for role/i);
  } finally {
    if (previous === undefined) delete process.env.POSTGRES_URL; else process.env.POSTGRES_URL = previous;
  }
});


test("Eve failure is a failed action and uses trusted principal/call replay key", async () => {
  completionFails = false;
  imports["@/lib/mastra"].mastra.getWorkflow = () => ({ createRun: async () => ({ start: async () => ({ status: "failed" }) }) });
  // The service captured its repository function; inspect the completion owner and bounded error.
  const ctx = { callId: "trusted-call", session: { id: "trusted-session", auth: { current: { principalId: "owner" } } } };
  await assert.rejects(imports["@/lib/platform/workflow-service"].executeAgentWorkflow("feature-delivery", {}, ctx), /WORKFLOW_EXECUTION_FAILED/);
  assert.equal(globalThis.lastCompletion.userId, "owner");
  await assert.rejects(imports["@/lib/platform/workflow-service"].executeAgentWorkflow("feature-delivery", { owner: "forged" }, { ...ctx, session: { id: "trusted-session", auth: { current: null } } }), /UNAUTHORIZED/);
});

test("HTTP context rejects another project and a task from another project", async () => {
  for (const projectContext of [
    { projectId: "33333333-3333-4333-8333-333333333333", taskId: "22222222-2222-4222-8222-222222222222" },
    { projectId: "11111111-1111-4111-8111-111111111111", taskId: "33333333-3333-4333-8333-333333333333" },
  ]) {
    const response = await route.POST(new Request("https://example.com/api/executive-workflows", { method: "POST", body: JSON.stringify({ workflowId: "feature-delivery", inputData: {}, idempotencyKey: "http-context-key", projectContext }) }));
    assert.equal(response.status, 404); assert.equal((await response.json()).error, "ENGINEERING_CONTEXT_NOT_FOUND");
  }
});
test("agent project context originates in trusted binding, not input fields", async () => {
  completionFails = false;
  imports["@/lib/mastra"].mastra.getWorkflow = () => ({ createRun: async () => ({ start: async () => ({ status: "success", result: "draft" }) }) });
  // Import a fresh module so its binding function captures this resolver.
  imports["@/agent/lib/project-context"].resolveEngineeringBinding = async () => ({ project: { id: "11111111-1111-4111-8111-111111111111" }, task: { id: "22222222-2222-4222-8222-222222222222" } });
  const bound = await import(`data:text/javascript;base64,${Buffer.from(serviceJs + "\n// bound fixture").toString("base64")}`);
  const result = await bound.executeAgentWorkflow("feature-delivery", { projectId: "forged-project", taskId: "forged-task" }, { callId: "trusted-call", session: { id: "trusted-session", auth: { current: { principalId: "owner" } } } });
  assert.equal(result.lifecycle, "needs_review");
  assert.deepEqual(globalThis.workflowAttachment, ["owner", "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "abcdefab-1234-4567-abcd-abcdefabcdef"]);
});
