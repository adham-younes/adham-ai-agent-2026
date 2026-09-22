import { z } from "zod";
import { ArchitectureEvaluationInputSchema } from "@/lib/mastra/workflows/architecture-evaluation";
import { CodeAuditInputSchema } from "@/lib/mastra/workflows/code-audit-repair";
import { ContinualLearningInputSchema } from "@/lib/mastra/workflows/continual-learning";
import { DbEngineeringInputSchema } from "@/lib/mastra/workflows/database-engineering";
import { SpecInputSchema } from "@/lib/mastra/workflows/feature-delivery";
import { IncidentResponseInputSchema } from "@/lib/mastra/workflows/incident-response";
import { ReleaseReadinessInputSchema } from "@/lib/mastra/workflows/release-readiness";

export const workflowIds = [
  "feature-delivery",
  "database-engineering",
  "code-audit-repair",
  "release-readiness",
  "architecture-evaluation",
  "incident-response",
  "continual-learning",
] as const;

export type WorkflowId = (typeof workflowIds)[number];

export type WorkflowKey =
  | "featureDeliveryWorkflow"
  | "databaseEngineeringWorkflow"
  | "codeAuditAndRepairWorkflow"
  | "releaseDeploymentWorkflow"
  | "architectureEvaluationWorkflow"
  | "incidentResponseWorkflow"
  | "continualLearningWorkflow";

export interface WorkflowDefinition {
  readonly id: WorkflowId;
  readonly key: WorkflowKey;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly steps: number;
  readonly accent: "emerald" | "blue" | "amber" | "violet" | "fuchsia" | "rose" | "cyan";
}

export const workflowCatalog: readonly WorkflowDefinition[] = [
  {
    id: "feature-delivery",
    key: "featureDeliveryWorkflow",
    name: "تسليم الميزات الكاملة",
    shortName: "Feature Delivery",
    description: "من المواصفات إلى الكود والتدقيق في مسار واحد.",
    steps: 4,
    accent: "emerald",
  },
  {
    id: "database-engineering",
    key: "databaseEngineeringWorkflow",
    name: "هندسة قواعد البيانات",
    shortName: "Database & RLS",
    description: "مخطط PostgreSQL وفهارس وسياسات وصول آمنة.",
    steps: 3,
    accent: "blue",
  },
  {
    id: "code-audit-repair",
    key: "codeAuditAndRepairWorkflow",
    name: "تدقيق وإصلاح الكود",
    shortName: "Code Audit",
    description: "تشخيص السبب الجذري ورقعة قابلة للتحقق.",
    steps: 2,
    accent: "amber",
  },
  {
    id: "release-readiness",
    key: "releaseDeploymentWorkflow",
    name: "جاهزية الإصدار",
    shortName: "Release Readiness",
    description: "بوابات الجودة وخطة النشر والتراجع.",
    steps: 3,
    accent: "violet",
  },
  {
    id: "architecture-evaluation",
    key: "architectureEvaluationWorkflow",
    name: "التقييم المعماري",
    shortName: "Architecture ADR",
    description: "مقارنة البدائل وإنتاج سجل قرار معماري.",
    steps: 3,
    accent: "fuchsia",
  },
  {
    id: "incident-response",
    key: "incidentResponseWorkflow",
    name: "الاستجابة للحوادث",
    shortName: "Incident Response",
    description: "تصنيف الحادث وRCA وخطة الاحتواء.",
    steps: 4,
    accent: "rose",
  },
  {
    id: "continual-learning",
    key: "continualLearningWorkflow",
    name: "التعلم المستمر",
    shortName: "Context Learning",
    description: "تحويل النتائج إلى قواعد محكومة بالسياق.",
    steps: 3,
    accent: "cyan",
  },
] as const;

const aliases = new Map<string, WorkflowDefinition>(
  workflowCatalog.flatMap((workflow) => [
    [workflow.id, workflow],
    [workflow.key, workflow],
  ]),
);

const inputSchemas: Record<WorkflowId, z.ZodType> = {
  "feature-delivery": SpecInputSchema,
  "database-engineering": DbEngineeringInputSchema,
  "code-audit-repair": CodeAuditInputSchema,
  "release-readiness": ReleaseReadinessInputSchema,
  "architecture-evaluation": ArchitectureEvaluationInputSchema,
  "incident-response": IncidentResponseInputSchema,
  "continual-learning": ContinualLearningInputSchema,
};

export const workflowRequestSchema = z.object({
  workflowId: z.string().trim().min(1).max(80),
  inputData: z.record(z.string(), z.unknown()),
});

export function resolveWorkflow(id: string): WorkflowDefinition | undefined {
  return aliases.get(id);
}

export function validateWorkflowInput(id: WorkflowId, input: unknown) {
  return inputSchemas[id].safeParse(input);
}

