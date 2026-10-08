import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../lib/platform/workflow-service.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source.replace(/^import [\s\S]*? from "[^"]+";/gm, '').replace(/const dependencies = [\s\S]*?workflowCatalog };/, 'const dependencies = {};'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { createWorkflowService } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
function fixture(outcome = { status: 'success', result: { report: 'draft' } }) {
  const records = new Map(); let executions = 0; let completionFails = false; let initializationFails = false;
  const deps = {
    hasDurableRunStore: () => true,
    resolveWorkflow: id => id === 'feature-delivery' ? { id, key: 'featureDeliveryWorkflow' } : undefined,
    validateWorkflowInput: (_id, input) => input?.featureTitle ? { success: true, data: input } : { success: false, error: { issues: ['missing title'] } },
    workflowCatalog: [],
    randomUUID: () => 'run-id',
    initializeWorkflowStorage: async () => { if (initializationFails) throw Error('secret DB URL'); },
    createWorkflowRun: async input => { if (records.has(input.idempotencyKey)) return { created: false, run: records.get(input.idempotencyKey) }; const run = { id: input.id, workflowId: input.workflowId, status: 'running', inputData: input.inputData }; records.set(input.idempotencyKey, run); return { created: true, run }; },
    completeWorkflowRun: async input => { if (completionFails) throw Error('secret DB URL'); Object.assign([...records.values()][0], { status: input.status, outputData: input.outputData, durationMs: input.durationMs, errorMessage: input.errorMessage }); },
    mastra: { getWorkflow: () => ({ createRun: async () => ({ start: async () => { executions++; return outcome; } }) }) },
  };
  return { service: createWorkflowService(deps), records, executions: () => executions, failCompletion: () => { completionFails = true; }, failInitialization: () => { initializationFails = true; } };
}
const input = { principalId: 'owner', workflowId: 'feature-delivery', inputData: { featureTitle: 'Add tests' }, idempotencyKey: 'request-key' };
test('success persists a needs_review draft and replay performs no work', async () => {
  const f = fixture(); const first = await f.service(input); const replay = await f.service(input);
  assert.equal(first.body.success, true); assert.equal(first.body.lifecycle, 'needs_review'); assert.equal(replay.body.lifecycle, 'needs_review'); assert.equal(f.executions(), 1); assert.equal([...f.records.values()][0].status, 'succeeded');
});
for (const status of ['failed', 'suspended', 'running']) test(`${status} outcome cannot become draft success`, async () => {
  const f = fixture({ status, error: new Error('secret provider key') }); const result = await f.service(input);
  assert.equal(result.body.success, false); assert.equal(result.body.status, 'failed'); assert.equal([...f.records.values()][0].status, 'failed'); assert.equal(result.body.lifecycle, undefined); assert.ok(!JSON.stringify(result).includes('secret'));
});
test('persistence failure is unconfirmed even after generator success', async () => {
  const f = fixture(); f.failCompletion(); const result = await f.service(input);
  assert.equal(result.httpStatus, 503); assert.equal(result.body.status, 'persistence-unconfirmed'); assert.equal(result.body.success, false); assert.equal(result.body.lifecycle, undefined);
});
test('initialization failure persists failure and never invokes generator', async () => {
  const f = fixture(); f.failInitialization(); const result = await f.service(input);
  assert.equal(result.httpStatus, 503); assert.equal(f.executions(), 0); assert.equal([...f.records.values()][0].status, 'failed');
});
test('invalid input or unauthenticated caller never claims or executes work', async () => {
  const f = fixture(); assert.equal((await f.service({ ...input, inputData: {} })).httpStatus, 422); assert.equal((await f.service({ ...input, principalId: null })).httpStatus, 401); assert.equal(f.records.size, 0);
});
test('nonserializable output fails closed before persistence', async () => {
  const circular = { status: 'success' }; circular.result = circular;
  const f = fixture(circular); const result = await f.service(input); assert.equal(result.body.success, false); assert.equal([...f.records.values()][0].status, 'failed');
});
test('concurrent requests share one durable claim and one execution', async () => {
  const f = fixture(); const results = await Promise.all([f.service(input), f.service(input)]);
  assert.equal(f.executions(), 1); assert.equal(f.records.size, 1); assert.ok(results.some(result => result.httpStatus === 202));
});
