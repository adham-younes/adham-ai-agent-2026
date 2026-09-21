import { Mastra } from "@mastra/core";
import { featureDeliveryWorkflow } from "./workflows/feature-delivery";
import { databaseEngineeringWorkflow } from "./workflows/database-engineering";
import { codeAuditAndRepairWorkflow } from "./workflows/code-audit-repair";

export const mastra = new Mastra({
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
