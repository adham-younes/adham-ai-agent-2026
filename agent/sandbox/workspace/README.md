# Durable Linux workspace

This `/workspace` belongs to the current durable agent session and is shared by
the coordinator and its declared specialist agents.

- Put repositories under `/workspace/projects`.
- Put user-facing outputs under `/workspace/artifacts`.
- Install project dependencies locally whenever possible.
- Use passwordless `sudo` only for operating-system packages inside the sandbox.
- Inspect commands and their exit codes before reporting success.
- Never write application credentials or access tokens into workspace files.
