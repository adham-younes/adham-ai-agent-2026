import type { Task, Check, Artifact } from "./types";
export function pagination(limit = 5, offset = 0) {
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    throw new Error("INVALID_PAGINATION");
  return {
    limit: Math.min(
      Math.max(Number.isFinite(limit) ? Math.floor(limit) : 5, 1),
      10,
    ),
    offset,
  };
}
export function canonicalArtifactPath(path: string) {
  if (
    !path ||
    path.length > 500 ||
    path.includes("\\") ||
    path.startsWith("/") ||
    path
      .split("/")
      .some(
        (p) =>
          !p || p === "." || p === ".." || p === ".git" || p === "node_modules",
      )
  )
    throw new Error("INVALID_ARTIFACT_PATH");
  return path;
}
export function validateArtifactContent(content: string, kind = "text") {
  const bytes = Buffer.byteLength(content);
  if (kind === "archive-base64") {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(content) || content.length % 4 !== 0)
      throw new Error("INVALID_ARCHIVE_ENCODING");
    if (
      bytes > 4 * 1024 * 1024 ||
      Buffer.from(content, "base64").length > 3 * 1024 * 1024
    )
      throw new Error("ARTIFACT_TOO_LARGE");
    return bytes;
  }
  if (bytes > 256 * 1024) throw new Error("ARTIFACT_TOO_LARGE");
  return bytes;
}
export function verificationFailure(
  task: Pick<Task, "kind" | "requiredChecks" | "requiredArtifacts">,
  version: number,
  checks: Pick<
    Check,
    "checkId" | "command" | "workspaceVersion" | "status" | "exitCode"
  >[],
  artifacts: Pick<Artifact, "path" | "workspaceVersion">[],
): string | null {
  if (task.kind !== "implementation") return "ANALYSIS_REQUIRES_ACCEPTANCE";
  if (!task.requiredChecks.length) return "REQUIRED_CHECKS_EMPTY";
  for (const required of task.requiredChecks) {
    const current = checks.find(
      (c) =>
        c.checkId === required.id &&
        c.command === required.command &&
        c.workspaceVersion === version,
    );
    if (!current || current.status !== "passed" || current.exitCode !== 0)
      return "CHECKS_NOT_PASSED";
  }
  for (const path of task.requiredArtifacts)
    if (
      !artifacts.some((a) => a.path === path && a.workspaceVersion === version)
    )
      return "REQUIRED_ARTIFACT_MISSING";
  return null;
}
