import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { featureDeliveryWorkflow } from "./workflows/feature-delivery";
import { databaseEngineeringWorkflow } from "./workflows/database-engineering";
import { codeAuditAndRepairWorkflow } from "./workflows/code-audit-repair";

const dbUrl =
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL;

export const mastra = new Mastra({
  storage: dbUrl
    ? new PostgresStore({
        id: "adham-ai-pg",
        connectionString: dbUrl,
      })
    : undefined,
  workflows: {
    featureDeliveryWorkflow,
    databaseEngineeringWorkflow,
    codeAuditAndRepairWorkflow,
  },
});

export {
  featureDeliveryWorkflow,
  databaseEngineeringWorkflow,
  codeAuditAndRepairWorkflow,
};
