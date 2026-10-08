import { createTask } from "@/lib/engineering/repository";
import { canonicalArtifactPath } from "@/lib/engineering/validation";
import { principal, body, json, failure, taskInput, uuid } from "../../http";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  c: { params: Promise<{ id: string }> },
) {
  try {
    const owner = principal(request),
      input = taskInput.parse(await body(request));
    input.requiredArtifacts.forEach(canonicalArtifactPath);
    return json(
      { task: await createTask(owner, uuid((await c.params).id), input) },
      201,
    );
  } catch (e) {
    return failure(e);
  }
}
