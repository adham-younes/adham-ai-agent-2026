import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { normalizePostgresUrl } from "../platform/database";
import { featureDeliveryWorkflow } from "./workflows/feature-delivery";
import { databaseEngineeringWorkflow } from "./workflows/database-engineering";
import { codeAuditAndRepairWorkflow } from "./workflows/code-audit-repair";
import { releaseDeploymentWorkflow } from "./workflows/release-readiness";
import { architectureEvaluationWorkflow } from "./workflows/architecture-evaluation";
import { incidentResponseWorkflow } from "./workflows/incident-response";
import { continualLearningWorkflow } from "./workflows/continual-learning";

const dbUrl =
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL;

export const mastra = new Mastra({
  storage: dbUrl
    ? new PostgresStore({
        id: "adham-ai-pg",
        connectionString: normalizePostgresUrl(dbUrl),
        ssl: { rejectUnauthorized: false },
        schemaName: "mastra",
      })
    : undefined,
  workflows: {
    featureDeliveryWorkflow,
    databaseEngineeringWorkflow,
    codeAuditAndRepairWorkflow,
    releaseDeploymentWorkflow,
    architectureEvaluationWorkflow,
    incidentResponseWorkflow,
    continualLearningWorkflow,
  },
});

export {
  featureDeliveryWorkflow,
  databaseEngineeringWorkflow,
  codeAuditAndRepairWorkflow,
  releaseDeploymentWorkflow,
  architectureEvaluationWorkflow,
  incidentResponseWorkflow,
  continualLearningWorkflow,
};
