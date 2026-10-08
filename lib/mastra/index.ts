import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { database, normalizePostgresUrl, postgresTls } from "../platform/database";
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

const storage = dbUrl
    ? new PostgresStore({
        id: "adham-ai-pg",
        connectionString: normalizePostgresUrl(dbUrl),
        ssl: postgresTls(dbUrl),
        schemaName: "mastra",
      })
    : undefined;

let initialization: Promise<void> | undefined;
let roleLogged = false;
export async function initializeWorkflowStorage(): Promise<void> {
  if (!storage || !database) throw new Error("DATABASE_UNAVAILABLE");
  initialization ??= (async () => {
    const principal = await database.query<{ role: string }>("select current_user as role");
    if (!principal.rows[0]?.role) throw new Error("DATABASE_ROLE_UNAVAILABLE");
    if (!roleLogged) {
      console.info("Workflow storage database role", { role: principal.rows[0].role });
      roleLogged = true;
    }
    // PostgreSQL permits altering the current role's own defaults without
    // SET ROLE or membership changes. Harden them before Mastra creates tables.
    await database.query(`
      alter default privileges in schema public revoke all on tables from public, anon, authenticated;
      alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
      alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
      alter default privileges in schema mastra revoke all on tables from public, anon, authenticated;
      alter default privileges in schema mastra revoke all on sequences from public, anon, authenticated;
      alter default privileges in schema mastra revoke execute on functions from public, anon, authenticated;
    `);
    await storage.init();
  })().catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  await initialization;
}

export const mastra = new Mastra({
  storage,
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
