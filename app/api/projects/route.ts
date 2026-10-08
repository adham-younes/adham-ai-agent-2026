import { createProject, listProjects } from "@/lib/engineering/repository";
import { pagination } from "@/lib/engineering/validation";
import { principal, body, json, failure, projectInput, page } from "./http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const owner = principal(request);
    const p = page(request),
      bounds = pagination(p.limit, p.offset);
    const projects = await listProjects(owner, bounds.limit, bounds.offset);
    return json({
      projects,
      nextOffset:
        projects.length === bounds.limit ? bounds.offset + bounds.limit : null,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    return json(
      {
        project: await createProject(
          principal(request),
          projectInput.parse(await body(request)),
        ),
      },
      201,
    );
  } catch (e) {
    return failure(e);
  }
}
