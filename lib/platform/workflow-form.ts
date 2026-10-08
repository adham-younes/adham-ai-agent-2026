export type OutcomeId = 'feature-delivery' | 'database-engineering' | 'code-audit-repair' | 'release-readiness' | 'architecture-evaluation' | 'incident-response' | 'continual-learning';
export interface BriefField { readonly key: string; readonly label: string; readonly placeholder?: string; readonly required?: boolean; readonly multiline?: boolean; readonly options?: readonly string[] }
const field = (key: string, label: string, placeholder: string, multiline = false, required = true): BriefField => ({ key, label, placeholder, multiline, required });
export const workflowForms: Record<OutcomeId, { title: string; description: string; deliverable: string; stages: readonly string[]; fields: readonly BriefField[] }> = {
  'feature-delivery': { title: 'Feature specification', description: 'Give a new feature a clear scope before implementation.', deliverable: 'Architecture, proposed code, and a review checklist', stages: ['Scope', 'Data model', 'Code proposal', 'Review'], fields: [field('featureTitle', 'Feature name', 'Customer onboarding'), field('userRequirements', 'User needs & acceptance criteria', 'Who is this for? What should happen? What would prove it works?', true), field('targetStack', 'Technology stack', 'Next.js, PostgreSQL…', false, false)] },
  'database-engineering': { title: 'Database blueprint', description: 'Design the data model and access rules for your product.', deliverable: 'Proposed SQL migration, indexes, and access policies', stages: ['Model', 'Indexes', 'Access policies'], fields: [field('domainName', 'Product or domain', 'Multi-tenant project management'), field('entitiesDescription', 'Entities & relationships', 'Projects belong to a team. Members have roles…', true), { key: 'tenantModel', label: 'Tenant model', options: ['multi-tenant', 'single-tenant'], required: true }] },
  'code-audit-repair': { title: 'Code review & patch', description: 'Review a specific piece of code and get a proposed repair.', deliverable: 'Diagnosis, proposed patch, and verification commands', stages: ['Diagnose', 'Propose repair'], fields: [field('targetFilePath', 'File or component', 'app/api/orders/route.ts'), field('codeSnippet', 'Code to review', 'Paste the relevant code. Remove credentials first.', true), field('issueDescription', 'Observed behavior', 'Expected behavior, actual behavior, and steps to reproduce', true, false)] },
  'release-readiness': { title: 'Release plan', description: 'Make the next release a decision you can review.', deliverable: 'Release gates, rollout strategy, and rollback plan', stages: ['Dependencies', 'Quality gates', 'Rollout'], fields: [field('appName', 'Application name', 'Your application'), field('releaseScope', 'Changes & release risks', 'Describe the change, its users, and the evidence already collected.', true), { key: 'targetEnvironment', label: 'Target environment', options: ['production', 'staging', 'preview'], required: true }, field('criticalIntegrations', 'Critical integrations', 'Payments, database, email…', false, false)] },
  'architecture-evaluation': { title: 'Architecture decision', description: 'Compare options against the constraints that matter.', deliverable: 'Trade-off analysis and an architecture decision record', stages: ['Compare', 'Assess cost', 'Document decision'], fields: [field('systemTitle', 'Decision to make', 'Choose a job queue'), field('problemContext', 'Problem & constraints', 'What needs to change? Include scale, budget, and reliability needs.', true), field('alternativesConsidered', 'Options to compare', 'List the approaches under consideration.', true), field('targetCriteria', 'Decision criteria', 'Cost, latency, maintainability…', false, false)] },
  'incident-response': { title: 'Incident playbook', description: 'Turn evidence from an incident into a response plan.', deliverable: 'Triage, root-cause hypothesis, and recovery recommendations', stages: ['Triage', 'Root cause', 'Recovery', 'Review'], fields: [field('incidentTitle', 'Incident name', 'Checkout errors after a release'), field('affectedService', 'Affected service', 'api/checkout'), field('errorLogs', 'Evidence & logs', 'Paste errors and timeline. Remove credentials and personal data.', true), { key: 'severityLevel', label: 'Severity', options: ['P2 - Moderate Issue', 'P0 - Critical Outage', 'P1 - High Degradation', 'P3 - Low Impact'], required: true }, field('recentChanges', 'Recent changes', 'Known changes, or explicitly state none are known.', true, true)] },
  'continual-learning': { title: 'Decision retrospective', description: 'Extract a reusable lesson with clear limits.', deliverable: 'Lesson, applicability boundaries, and context assessment', stages: ['Review evidence', 'Extract lesson', 'Check context'], fields: [field('episodeTask', 'Previous task', 'Improve checkout reliability'), field('episodeDomain', 'Domain', 'E-commerce'), field('episodeEnvironment', 'Environment', 'Next.js + PostgreSQL'), field('decisionTaken', 'Decision taken', 'What did you change, and why?', true), field('observedReality', 'Observed result', 'What happened? Include measurements if available.', true), field('targetNewContext', 'Where might the lesson apply?', 'Describe the new situation before reusing the lesson.', true)] },
};

export function buildWorkflowInput(id: OutcomeId, values: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of workflowForms[id].fields) {
    const value = (values[item.key] ?? '').trim();
    if (!value && item.required) throw new Error(`${item.label} is required.`);
    if (value.length > 24000) throw new Error(`${item.label} is too long.`);
    if (value && item.options && !item.options.includes(value)) throw new Error(`Choose a valid option for ${item.label}.`);
    if (value) result[item.key] = value;
  }
  return result;
}

export function resultSections(output: unknown): { label: string; text: string }[] {
  if (output == null) return [];
  if (typeof output === 'string') return [{ label: 'Deliverable', text: output }];
  if (typeof output !== 'object' || Array.isArray(output)) return [{ label: 'Deliverable', text: JSON.stringify(output, null, 2) }];
  const value = output as Record<string, unknown>;
  if (value.result != null) return resultSections(value.result);
  return Object.entries(value).filter(([key, item]) => !['steps', 'runId', 'workflowId'].includes(key) && item != null).map(([key, item]) => ({
    label: key === 'adrMarkdown' ? 'ADR markdown' : key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase()),
    text: typeof item === 'string' ? item : JSON.stringify(item, null, 2),
  }));
}

export interface SavedRun { readonly id: string; readonly workflowId: OutcomeId; readonly status: 'running' | 'succeeded' | 'failed'; readonly createdAt: string; readonly completedAt: string | null; readonly durationMs: number | null; readonly inputData?: Record<string, string>; readonly outputData?: unknown; readonly errorMessage?: string | null }
