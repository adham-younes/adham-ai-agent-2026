export type TaskStatus =
  | "draft"
  | "planned"
  | "running"
  | "needs_review"
  | "verified"
  | "accepted"
  | "blocked"
  | "failed"
  | "cancelled";
export interface RequiredCheck {
  id: string;
  command: string;
}
export interface Project {
  id: string;
  name: string;
  goal: string;
  stack: string;
  source: string;
  status: string;
  sessionId: string | null;
  sandboxId: string | null;
  activeTaskId: string | null;
  activeRunId: string | null;
  leaseExpiresAt: string | null;
  workspaceRoot: string;
  workspaceVersion: number;
  createdAt: string;
}
export interface Task {
  id: string;
  projectId: string;
  title: string;
  kind: "implementation" | "analysis";
  acceptanceCriteria: string[];
  requiredChecks: RequiredCheck[];
  requiredArtifacts: string[];
  status: TaskStatus;
  currentRunId: string | null;
  latestDraftRunId?: string | null;
  version: number;
  createdAt: string;
}
export interface EngineeringRun {
  id: string;
  projectId: string;
  taskId: string;
  capability: string;
  idempotencyKey: string;
  parentCallId?: string | null;
  rootSessionId?: string | null;
  status: "running" | "succeeded" | "failed" | "cancelled";
  workspaceVersion: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  command: string | null;
  cwd: string | null;
  exitCode: number | null;
  logs: string | null;
}
export interface Artifact {
  id: string;
  projectId: string;
  taskId: string;
  runId: string;
  path: string;
  kind: string;
  content: string;
  contentHash: string;
  workspaceVersion: number;
  createdAt: string;
}
export interface Check {
  id: string;
  projectId: string;
  taskId: string;
  runId: string;
  checkId: string;
  command: string;
  workspaceVersion: number;
  status: "passed" | "failed" | "cancelled";
  exitCode: number | null;
  logs: string;
  createdAt: string;
}
