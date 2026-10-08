import { defineTool } from "eve/tools";
import { z } from "zod";
import { completeTask, startTask, updateTask } from "@/lib/agent-task-state";
import { resolveEngineeringBinding } from "../lib/project-context";
import { verifyTask } from "@/lib/engineering/repository";
import { taskState } from "../lib/task-state";

const owner = z.enum(["coordinator", "planner", "researcher", "analyst", "executor", "reviewer"]);
const inputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("start"), goal: z.string().trim().min(5).max(500), steps: z.array(z.object({ title: z.string().trim().min(3).max(160), owner })).min(1).max(8) }),
  z.object({ operation: z.literal("status") }),
  z.object({ operation: z.literal("update"), stepId: z.number().int().min(1).max(8), status: z.enum(["running", "done", "blocked"]), evidence: z.string().trim().max(400).optional() }),
  z.object({ operation: z.literal("complete"), evidence: z.string().trim().min(5).max(500) }),
]);

export default defineTool({
  description: "أدر حالة مهمة مركبة داخل الجلسة: خطة من 1–8 خطوات، مالك لكل خطوة، انتقالات التنفيذ، ودليل تحقق قبل الإغلاق. الحالة تحفظها Eve عبر الأدوار وإعادة التشغيل. استخدمها للمهام متعددة المراحل فقط.",
  inputSchema,
  label: { start: ({ operation }) => `تحديث حالة المهمة: ${operation}` },
  async execute(input, ctx) {
    const binding = await resolveEngineeringBinding(ctx);
    if (binding && input.operation === "complete") {
      if (binding.task.kind === "analysis") throw new Error("OWNER_ACCEPTANCE_REQUIRED: Analysis reports require explicit owner acceptance.");
      return { task: await verifyTask(binding.owner, binding.project.id, binding.task.id) };
    }
    if (binding && input.operation === "status") return { task: binding.task };
    if (input.operation === "complete" && !binding) throw new Error("PROJECT_BINDING_REQUIRED: Textual evidence cannot verify an engineering task.");
    const now = new Date().toISOString();
    const current = taskState.get();
    if (input.operation === "status") return { task: current };
    if (input.operation === "start") {
      const task = startTask(input.goal, input.steps, now);
      taskState.update(() => task);
      return { task };
    }
    if (!current) throw new Error("Start a task first");
    const task = input.operation === "update"
      ? updateTask(current, input.stepId, input.status, now, input.evidence)
      : completeTask(current, now, input.evidence);
    taskState.update(() => task);
    return { task };
  },
  toModelOutput(output) { return { type: "json", value: output }; },
});
