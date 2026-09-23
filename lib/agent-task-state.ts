export type TaskOwner = "coordinator" | "planner" | "researcher" | "analyst" | "executor" | "reviewer";
export type TaskPhase = "planned" | "running" | "verified" | "blocked";

export interface TaskStep {
  id: number;
  title: string;
  owner: TaskOwner;
  status: "pending" | "running" | "done" | "blocked";
}

export interface AgentTaskState {
  goal: string;
  phase: TaskPhase;
  steps: TaskStep[];
  updatedAt: string;
  evidence: string[];
}

export function startTask(goal: string, steps: Array<Pick<TaskStep, "title" | "owner">>, now: string): AgentTaskState {
  if (steps.length < 1 || steps.length > 8) throw new Error("A task needs 1–8 steps");
  return {
    goal,
    phase: "planned",
    steps: steps.map((step, index) => ({ ...step, id: index + 1, status: "pending" })),
    updatedAt: now,
    evidence: [],
  };
}

export function updateTask(
  state: AgentTaskState,
  stepId: number,
  status: TaskStep["status"],
  now: string,
  evidence?: string,
): AgentTaskState {
  if (state.phase === "verified" || state.phase === "blocked") throw new Error("This task is closed");
  const selected = state.steps.find((step) => step.id === stepId);
  if (!selected) throw new Error("Unknown task step");
  if (selected.status === "done" || selected.status === "blocked") throw new Error("This step is already closed");
  if (status === "pending") throw new Error("A step cannot be reset to pending");
  if (status === "done" && selected.status !== "running") throw new Error("Start the step before marking it done");
  if (status === "running" && state.steps.some((step) => step.id !== stepId && step.status === "running")) {
    throw new Error("Complete or block the current step before starting another");
  }
  const steps = state.steps.map((step) => step.id === stepId ? { ...step, status } : step);
  return {
    ...state,
    phase: status === "blocked" ? "blocked" : "running",
    steps,
    evidence: evidence ? [...state.evidence, evidence].slice(-12) : state.evidence,
    updatedAt: now,
  };
}

export function completeTask(state: AgentTaskState, now: string, evidence: string): AgentTaskState {
  if (state.phase === "verified" || state.phase === "blocked") throw new Error("This task is closed");
  if (state.steps.some((step) => step.status !== "done")) throw new Error("Finish every step before verifying the task");
  if (!evidence.trim()) throw new Error("Verification evidence is required");
  return { ...state, phase: "verified", updatedAt: now, evidence: [...state.evidence, evidence].slice(-12) };
}
