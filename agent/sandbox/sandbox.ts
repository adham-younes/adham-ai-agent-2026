import { defaultBackend, defineSandbox } from "eve/sandbox";

const bootstrapCommand = String.raw`set -eu
mkdir -p /workspace/.agent /workspace/projects /workspace/artifacts

install_debian() {
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl jq ripgrep unzip zip ca-certificates python3 python3-pip python3-venv build-essential
}

install_rhel() {
  sudo dnf install -y git curl jq ripgrep unzip zip ca-certificates python3 python3-pip gcc gcc-c++ make
}

install_alpine() {
  sudo apk add --no-cache git curl jq ripgrep unzip zip ca-certificates python3 py3-pip build-base
}

if command -v apt-get >/dev/null 2>&1; then
  install_debian
elif command -v dnf >/dev/null 2>&1; then
  install_rhel
elif command -v apk >/dev/null 2>&1; then
  install_alpine
fi

cat > /workspace/.agent/runtime.json <<'JSON'
{"schemaVersion":1,"workspace":"/workspace","privilege":"passwordless-sudo-inside-sandbox","persistence":"durable-session","packageInstallation":"enabled"}
JSON`;

export default defineSandbox({
  backend: defaultBackend({
    docker: { networkPolicy: "allow-all", pullPolicy: "if-not-present" },
    vercel: { networkPolicy: "allow-all", resources: { vcpus: 2 } },
    microsandbox: { memoryMiB: 4096, networkPolicy: "allow-all" },
  }),
  revalidationKey: () => "linux-workspace-v1",
  async bootstrap({ use }) {
    const sandbox = await use();
    const result = await sandbox.run({ command: bootstrapCommand });
    if (result.exitCode !== 0) {
      throw new Error(`Linux bootstrap failed (${result.exitCode}): ${result.stderr || result.stdout}`);
    }
  },
  async onSession({ use, ctx }) {
    const sandbox = await use();
    const principal = ctx.session.auth.current;
    await sandbox.writeTextFile({
      path: ".agent/session.json",
      content: `${JSON.stringify({
        createdAt: new Date().toISOString(),
        principalId: principal?.principalId ?? "anonymous",
        principalType: principal?.principalType ?? "anonymous",
      })}\n`,
    });
  },
});
