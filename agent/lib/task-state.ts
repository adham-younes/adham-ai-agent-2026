import { defineState } from "eve/context";
import type { AgentTaskState } from "@/lib/agent-task-state";

export const taskState = defineState<AgentTaskState | null>("adham-agent.active-task.v1", () => null);
