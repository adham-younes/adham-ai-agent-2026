import { defineTool } from "eve/tools";
import { z } from "zod";

const packageName = z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9+._:@/-]*$/);

export default defineTool({
  description:
    "افحص بيئة Linux الدائمة أو ثبّت حزم نظام يحتاجها العمل. التثبيت يتم بصلاحيات root داخل البيئة المعزولة فقط.",
  inputSchema: z.discriminatedUnion("operation", [
    z.object({ operation: z.literal("inspect") }),
    z.object({ operation: z.literal("install"), packages: z.array(packageName).min(1).max(20) }),
  ]),
  async execute(input, ctx) {
    const sandbox = await ctx.getSandbox();
    const command =
      input.operation === "inspect"
        ? "printf 'user='; id -un; printf 'uid='; id -u; printf 'kernel='; uname -srmo; printf 'workspace='; pwd; printf 'sudo='; sudo -n true && echo available || echo unavailable; cat /workspace/.agent/runtime.json 2>/dev/null || true"
        : `set -eu; set -- ${input.packages.map((value) => `'${value.replaceAll("'", "'\\''")}'`).join(" ")}; if command -v apt-get >/dev/null 2>&1; then sudo apt-get update -y && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"; elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y "$@"; elif command -v apk >/dev/null 2>&1; then sudo apk add --no-cache "$@"; else echo 'No supported system package manager found' >&2; exit 127; fi`;
    const result = await sandbox.run({ command });
    return {
      operation: input.operation,
      exitCode: result.exitCode,
      stdout: result.stdout.slice(-12_000),
      stderr: result.stderr.slice(-4_000),
    };
  },
  toModelOutput(output) {
    return { type: "json", value: output };
  },
});
