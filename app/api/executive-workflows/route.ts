import { NextResponse } from "next/server";
import { mastra } from "@/lib/mastra";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workflowId, inputData } = body;

    if (!workflowId || !inputData) {
      return NextResponse.json(
        { error: "workflowId and inputData are required parameters." },
        { status: 400 },
      );
    }

    let workflowKey: "featureDeliveryWorkflow" | "databaseEngineeringWorkflow" | "codeAuditAndRepairWorkflow";
    if (workflowId === "feature-delivery" || workflowId === "featureDeliveryWorkflow") {
      workflowKey = "featureDeliveryWorkflow";
    } else if (workflowId === "database-engineering" || workflowId === "databaseEngineeringWorkflow") {
      workflowKey = "databaseEngineeringWorkflow";
    } else if (workflowId === "code-audit-repair" || workflowId === "codeAuditAndRepairWorkflow") {
      workflowKey = "codeAuditAndRepairWorkflow";
    } else {
      return NextResponse.json(
        { error: `Unknown workflowId: ${workflowId}. Supported: feature-delivery, database-engineering, code-audit-repair` },
        { status: 404 },
      );
    }

    const workflow = mastra.getWorkflow(workflowKey);
    const run = await workflow.createRun();
    const result = await run.start({ inputData });

    return NextResponse.json({
      success: true,
      workflowId,
      runId: run.runId,
      result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Workflow execution failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
