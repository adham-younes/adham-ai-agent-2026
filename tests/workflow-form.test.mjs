import assert from 'node:assert/strict';
import { test } from 'node:test';
import { workflowForms, buildWorkflowInput, resultSections } from '../lib/platform/workflow-form.ts';

test('every outcome has required inputs and a specific deliverable', () => {
  assert.equal(Object.keys(workflowForms).length, 7);
  for (const form of Object.values(workflowForms)) {
    assert.ok(form.fields.some(field => field.required));
    assert.ok(form.deliverable.length > 10);
  }
});
test('a release brief trims input and never invents project requirements', () => {
  const values = { appName: ' Example ', releaseScope: ' Add billing ', targetEnvironment: 'staging', criticalIntegrations: '' };
  assert.deepEqual(buildWorkflowInput('release-readiness', values), { appName: 'Example', releaseScope: 'Add billing', targetEnvironment: 'staging' });
  assert.throws(() => buildWorkflowInput('release-readiness', { appName: 'Example' }), /required/);
});
test('invalid choices and oversized inputs cannot be submitted', () => {
  assert.throws(() => buildWorkflowInput('database-engineering', { domainName: 'CRM', entitiesDescription: 'Customers', tenantModel: 'public' }), /valid option/);
  assert.throws(() => buildWorkflowInput('feature-delivery', { featureTitle: 'x', userRequirements: 'a'.repeat(24001) }), /too long/);
});
test('only final result is presented without treating model-generated checks as verified', () => {
  const sections = resultSections({ status: 'success', result: { adrMarkdown: '# Decision', status: 'proposed' }, steps: { first: { output: 'intermediate' } } });
  assert.deepEqual(sections, [{ label: 'ADR markdown', text: '# Decision' }, { label: 'Status', text: 'proposed' }]);
  assert.equal(resultSections(null).length, 0);
});
