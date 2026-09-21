import { NextResponse } from "next/server";
import { mastra } from "@/lib/mastra";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");

  return NextResponse.json({
    status: "online",
    engine: "Mastra Autonomous DAG Swarm",
    storage: process.env.POSTGRES_URL || process.env.SUPABASE_DATABASE_URL ? "PostgresStore (Durable)" : "InMemoryStore (Ephemeral)",
    supportedPipelines: [
      {
        id: "feature-delivery",
        name: "تسليم الميزات الكاملة (Full-Stack Feature Delivery)",
        steps: 4,
      },
      {
        id: "database-engineering",
        name: "هندسة قواعد البيانات (Database & RLS Engineering)",
        steps: 3,
      },
      {
        id: "code-audit-repair",
        name: "التدقيق البرمجي والإصلاح الجراحي (Code Audit & Surgical Repair)",
        steps: 2,
      },
      {
        id: "release-readiness",
        name: "جاهزية النشر والإصدار السحابي (Release Readiness & Deployment)",
        steps: 3,
      },
      {
        id: "architecture-evaluation",
        name: "التقييم المعماري وسجلات ADRs (Architecture Evaluation & ADRs)",
        steps: 3,
      },
      {
        id: "incident-response",
        name: "الاستجابة للحوادث و SRE (Incident Response & Post-Mortem)",
        steps: 4,
      },
      {
        id: "continual-learning",
        name: "التعلم المستمر وبوابة السياق (Context-Gated Continual Learning)",
        steps: 3,
      },
    ],
    queriedRunId: runId ?? null,
  });
}

export async function POST(req: Request) {
  const startTime = performance.now();
  try {
    const body = await req.json();
    const { workflowId, inputData } = body;

    if (!workflowId || !inputData) {
      return NextResponse.json(
        { error: "workflowId and inputData are required parameters." },
        { status: 400 },
      );
    }

    let workflowKey:
      | "featureDeliveryWorkflow"
      | "databaseEngineeringWorkflow"
      | "codeAuditAndRepairWorkflow"
      | "releaseDeploymentWorkflow"
      | "architectureEvaluationWorkflow"
      | "incidentResponseWorkflow"
      | "continualLearningWorkflow";

    if (
      workflowId === "feature-delivery" ||
      workflowId === "featureDeliveryWorkflow"
    ) {
      workflowKey = "featureDeliveryWorkflow";
    } else if (
      workflowId === "database-engineering" ||
      workflowId === "databaseEngineeringWorkflow"
    ) {
      workflowKey = "databaseEngineeringWorkflow";
    } else if (
      workflowId === "code-audit-repair" ||
      workflowId === "codeAuditAndRepairWorkflow"
    ) {
      workflowKey = "codeAuditAndRepairWorkflow";
    } else if (
      workflowId === "release-readiness" ||
      workflowId === "releaseDeploymentWorkflow"
    ) {
      workflowKey = "releaseDeploymentWorkflow";
    } else if (
      workflowId === "architecture-evaluation" ||
      workflowId === "architectureEvaluationWorkflow"
    ) {
      workflowKey = "architectureEvaluationWorkflow";
    } else if (
      workflowId === "incident-response" ||
      workflowId === "incidentResponseWorkflow"
    ) {
      workflowKey = "incidentResponseWorkflow";
    } else if (
      workflowId === "continual-learning" ||
      workflowId === "continualLearningWorkflow"
    ) {
      workflowKey = "continualLearningWorkflow";
    } else {
      return NextResponse.json(
        {
          error: `Unknown workflowId: ${workflowId}. Supported: feature-delivery, database-engineering, code-audit-repair, release-readiness, architecture-evaluation, incident-response, continual-learning`,
        },
        { status: 404 },
      );
    }

    const workflow = mastra.getWorkflow(workflowKey);
    const run = await workflow.createRun();
    const result = await run.start({ inputData });
    const durationMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      workflowId,
      runId: run.runId,
      durationMs,
      result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Workflow execution failed.";
    const durationMs = Math.round(performance.now() - startTime);
    return NextResponse.json(
      { success: false, error: message, durationMs },
      { status: 500 },
    );
  }
}
