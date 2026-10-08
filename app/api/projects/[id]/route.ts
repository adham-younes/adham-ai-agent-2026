import {
  getProject,
  listTasks,
  updateProject,
} from "@/lib/engineering/repository";
import { pagination } from "@/lib/engineering/validation";
import {
  principal,
  body,
  json,
  failure,
  projectInput,
  page,
  uuid,
} from "../http";
type C = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function GET(request: Request, c: C) {
  try {
    const owner = principal(request),
      id = uuid((await c.params).id),
      p = page(request),
      bounds = pagination(p.limit, p.offset);
    const project = await getProject(owner, id);
    const tasks = await listTasks(owner, id, bounds.limit, bounds.offset);
    return json({
      project,
      tasks,
      nextOffset:
        tasks.length === bounds.limit ? bounds.offset + bounds.limit : null,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request, c: C) {
  try {
    return json({
      project: await updateProject(
        principal(request),
        uuid((await c.params).id),
        projectInput.partial().parse(await body(request)),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
