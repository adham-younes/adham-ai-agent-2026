# Agent platform architecture

## Runtime topology

The root coordinator owns the user conversation and delegates bounded work to five durable specialists:

- `planner`: requirements, boundaries, contracts, and acceptance criteria.
- `researcher`: live web research with source links.
- `executor`: sandboxed code and file execution.
- `reviewer`: independent verification and risk review.

The existing analyst remains available for deep analysis, while deterministic engineering workflows remain callable for repeatable delivery, database, audit, release, incident, architecture, and learning tasks.

## Context and memory

- Static system rules stay in `agent/instructions.md` and are intentionally short.
- Per-user system instructions are stored in PostgreSQL and resolved as system-role instructions at the start of every turn, so edits apply without opening a new session.
- Eve file memory recalls durable per-principal facts before a turn and stores them in a private Vercel Blob resource.
- Persistent memory is server-enforced and cannot be disabled by a client payload.
- Session history remains durable through Eve. Tool outputs and optional procedures do not enter the permanent prompt unless they are needed.

## Actions and authority

- Live search and page retrieval are read-only tools.
- Code runs inside a durable Eve Linux sandbox rather than the application process. Local development prefers a long-lived Docker container; Vercel uses a resumable Linux microVM because hosted functions cannot run a Docker daemon.
- Declared specialists share the coordinator's `/workspace`, installed packages, files, and running processes.
- Passwordless `sudo` is available only inside the sandbox. Package names are validated before typed installation.
- External connections keep their own authorization boundary.
- The coordinator must request human approval for sensitive or irreversible actions.
- Tool failures receive at most two corrected attempts before escalation.

## Data ownership

- `agent_user_settings`: server-owned user prompt preferences.
- `agent_workflow_runs`: server-owned workflow audit trail.
- Private Blob memory: per-principal durable facts and preferences.
- Eve sessions: conversation events, continuations, and subagent receipts.

Both PostgreSQL tables force RLS. Browser roles have no grants; the dedicated runtime login and service role have explicit policies.

## Reliability and evaluation

- Every API input is validated with Zod.
- Workflow runs record success, failure, duration, input, and output.
- Background subagents use Eve's durable task lifecycle and transient-provider retries.
- Production delivery requires type checking, framework builds, database advisors, responsive browser checks, and a production smoke test.

## Performance decisions

- The coordinator uses the low-latency inference profile and delegates only complex work.
- Long, situational procedures are excluded from the permanent prompt.
- Status fetching and settings are separate from the streaming conversation route.
- The chat renders streamed text without nested presentation frames or layout-constraining overflow.
