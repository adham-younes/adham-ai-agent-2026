import {
  getTask,
  listRuns,
  listArtifacts,
  listChecks,
  getTaskCheckSummary,
  updateTaskPlan,
  verifyTask,
  acceptTask,
  setActiveTask,
} from "@/lib/engineering/repository";
import {
  principal,
  body,
  json,
  failure,
  planInput,
  page,
  uuid,
} from "../../../http";
import { canonicalArtifactPath } from "@/lib/engineering/validation";
import { z } from "zod";
type C = { params: Promise<{ id: string; taskId: string }> };
export const runtime = "nodejs";
export async function GET(request: Request, c: C) {
  try {
    const owner = principal(request),
      ids = await c.params,
      p = page(request),
      id = uuid(ids.id),
      t = uuid(ids.taskId);
    const task = await getTask(owner, id, t);
    const [runs, artifacts, checks, checkSummary] = await Promise.all([
      listRuns(owner, id, t, p.limit, p.offset),
      listArtifacts(owner, id, t, p.limit, p.offset),
      listChecks(owner, id, t, p.limit, p.offset),
      getTaskCheckSummary(owner, id, t),
    ]);
    return json({ task, runs, artifacts, checks, checkSummary });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request, c: C) {
  try {
    const owner = principal(request),
      ids = await c.params,
      id = uuid(ids.id),
      t = uuid(ids.taskId),
      input = await body(request);
    if ("action" in input) {
      const { action } = z
        .object({ action: z.enum(["plan", "verify", "accept", "activate"]) })
        .strict()
        .parse(input);
      const task =
        action === "verify"
          ? await verifyTask(owner, id, t)
          : action === "accept"
            ? await acceptTask(owner, id, t)
            : action === "activate"
              ? await setActiveTask(owner, id, t)
              : await updateTaskPlan(owner, id, t, {});
      return json({ task });
    }
    const parsed = planInput.partial().parse(input);
    parsed.requiredArtifacts?.forEach(canonicalArtifactPath);
    return json({ task: await updateTaskPlan(owner, id, t, parsed) });
  } catch (e) {
    return failure(e);
  }
}
