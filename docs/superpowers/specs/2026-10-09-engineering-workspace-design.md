# Engineering Workspace — Product and Architecture Specification

Date: 2026-10-09. Status: written specification awaiting user review.

## Approved intent
The user wants a mature engineering workstation for completing software projects and following their execution. They approved the hierarchy Project → Tasks → Execution → Files/Artifacts → Checks, with chat inside a task, and selected Evergreen. Retain the existing black, off-white and green identity. This replaces the prior editorial/chat-first direction.

## Evidence from the current product
- The deployed entry page exposes 21 visible buttons/links; measured labels include 7px and 8px text. The headline is Fraunces at 56.32px. Better Design's copy check reported two serious findings: competing actions and an unclear next step. Its reading-time estimate is a heuristic, not user research.
- All seven `agent/tools/autonomous_*.ts` wrappers call Mastra directly and return DRAFT_READY without checking result.status or using the owner-scoped run repository. The HTTP workflow route does validate, initialize, persist and reconcile execution. These paths must be unified.
- `agent-chat.tsx` renders turn.completed as Task completed; a turn ending is not evidence that a project task is verified. Its activity filter omits the action.* events observed by the existing live SDK test.
- `task_control` accepts textual evidence; completion currently does not require a recorded command/check result. Task state exists in Eve but is not presented as the workspace's main work record.
- Current Supabase settings, memory, owner-scoped workflow history, signed visitor/session grants and Linux sandbox capabilities should be retained, not replaced.

## Architecture choice
Extend the existing Eve + Next + PostgreSQL application. Eve remains the conversation/orchestration runtime and sandbox owner; PostgreSQL becomes the authoritative project/task/run/artifact/check ledger. Mastra provides optional draft generation through one shared execution service.
Rewriting the runtime would add migration risk without resolving the observed product contracts. A typography-only change would leave the split execution paths and unverifiable completion intact.

## Product surfaces
1. Projects: title, one supporting line, New project action, and actual recent projects. No marketing hero, duplicated settings entry, made-up metrics or seven equally prominent workflow buttons.
2. Project: goal, source/stack context and task list. Create a task or resume the active task. No progress rail before a task exists.
3. Task: current phase and next action; Plan / Work / Files / Checks views. Work contains the conversation and a compact, expandable activity record. On mobile these views become tabs rather than simultaneous columns.
4. Files: actual published/changed artifacts, path, kind and revision; read/download supported bounded artifacts. A full IDE, arbitrary filesystem browser and multi-file editor are outside this iteration.
5. Checks: configured verification commands with pending/running/passed/failed/cancelled states, exit code, bounded logs, timestamps and the source revision examined.
6. Capabilities: one technical catalog organized by Understand, Design, Build, Verify and Deliver. Show purpose, inputs, output type, available/unavailable state and whether it creates a draft or executes a command. Secondary research/job-search tools do not occupy primary engineering navigation.

## Core domain and ownership
- Project: UUID, owner principal, title, goal, stack/source metadata, lifecycle state, Eve session binding and canonical workspace root.
- Task: UUID, owned project reference, title, kind (implementation or analysis), acceptance criteria, required checks, phase, current run and version.
- Run: existing durable run ledger extended with project/task linkage, capability, idempotency key, actual execution state, timing and error classification. Unlinked legacy runs remain readable.
- Artifact: owned project/task/run reference, canonical relative path, kind, content hash, bounded content or locator, version and creation time. A locator alone is not proof that a downloadable file exists.
- Check: owned project/task/run reference, approved check identifier and exact command, workspace version, exit code, logs and completion state.
- Use composite owner/project references or equivalent database constraints so cross-owner linkage is impossible. Apply RLS + FORCE RLS and private server privileges to new application tables. Never derive ownership from a model-supplied ID.
- Lists default to five records, with explicit pagination and a maximum page size of ten. Import at most ten text attachments, 256KiB per file and 1MiB total. Published text artifacts are capped at 256KiB; source archives at 3MiB excluding dependencies, build outputs and Git internals. Persist bounded artifact content in a private PostgreSQL table, with a 20MiB per-project publication quota and actionable quota errors; do not require a new storage-provider credential for this release.
- Keep signed browser identity for this iteration, clearly scoped to that browser. Cross-device accounts, teams, billing and enterprise permissions are separate work; this specification does not claim those capabilities.

## Session and filesystem contract
- A project reuses one durable Eve session and its stable per-session sandbox. Tasks execute sequentially in that project so they share a real workspace without assuming files survive across unrelated sessions.
- Canonical project root: /workspace/projects/<project-id>. New projects begin from a brief and optional supported attachments; an existing repository can be imported when its source and authorized credentials are available.
- Register a project/session binding before enabling project mutation tools. Validate the current authenticated principal and bound session against the project for every mutation, file publication and check.
- Only one task run may hold the project's execution lease. A second request returns the current run; it must not mutate the same workspace concurrently. Failed/cancelled runs remain immutable history; retry creates a new run with a new attempt key.
- Existing specialist subagents keep their roles and inherited sandbox. Their project/task authority comes from trusted parent dispatch lineage and the task pinned in authenticated dispatch context, not their fresh defineState slot or model-supplied metadata. Each delegated operation records the parent call/root session and acquires the same exclusive project lease as root operations; a parked child cannot acquire another task's authority. Apply the evidence adapter to root and executor mutation tools; delegated research/review cannot forge implementation/check outcomes.
- Legacy /s conversations remain accessible. They may discuss and analyze; enabling a project execution context requires an explicit project binding rather than silently treating every old conversation as a project.

## Shared execution service
- HTTP workflow forms and agent tool wrappers use the same service: authenticate/bind → validate → claim idempotent run → initialize storage → execute → normalize actual status → persist → emit typed events.
- Draft-generating capabilities return draft artifacts and needs_review, never repaired/deployed/verified claims. A failed or suspended Mastra result cannot return DRAFT_READY.
- Sandbox execution records the actual command, working directory, exit code and bounded output. Publish actual generated files as artifacts; do not publish a model's explanation as an executed change.
- Provide a server-authoritative workspace version. Mutating tool activity invalidates earlier check eligibility. Built-in bash/write tools must pass through the project context/evidence adapter for engineering tasks rather than bypass the ledger.
- Tools receive an active project/task context, not permission to nominate arbitrary owners or sessions. Public events expose useful labels and typed outcomes, with raw arguments/logs behind disclosure.
- UI reads durable ledger records and Eve action/turn events. Live updates reconcile by IDs/version, never by prose such as 'done'. Turn completion is labelled as a completed response; task status is derived independently.

## Task state and verification
- Implementation: draft → planned → running → needs_review → verified. Running may become blocked, failed or cancelled. Retrying a failed/blocked task creates a new attempt while retaining previous evidence.
- Analysis: draft → planned → running → needs_review → accepted. Owner acceptance is explicit and labelled Accepted report; it is not a test-passed engineering outcome.
- Verification requires non-empty configured acceptance checks, successful recorded execution of every required check for the current workspace version, and any required published artifacts. The server rejects arbitrary textual evidence, foreign check IDs, incomplete checks and outdated results.
- Required checks are selected from detected project scripts/declared commands and reviewed with the task plan. The model may propose a change to them; it cannot silently replace a failing check with an easier command and mark the task verified.
- Verification means the recorded acceptance commands passed for that revision. It does not prove universal correctness. The UI names the commands and revision rather than claiming broad certification.
- Cancellation interrupts the actual Eve turn/process when supported and persists cancelled status. An observer disconnect does not imply cancellation or success. Uncertain persistence remains visibly unconfirmed until reconciled.

## Typography and component contract
- Evergreen is the selected foundation. Its returned React kit uses Radix and Phosphor duotone icons. Use real installed Sidebar, Tabs, Table, Badge, Dialog and other supplied primitives; application CSS arranges layout instead of rebuilding their skins.
- Apply the approved palette through semantic tokens: background #000000, foreground #ededed, primary #53b559; maintain readable surfaces and distinct textual status cues. This is an explicit adaptation of Evergreen's forest/emerald defaults, not a switch to a different system.
- Use Evergreen's Inter Sans foundation for Latin UI and an explicit Arabic Sans fallback for Arabic content; code uses a monospace family. Preserve font tokens with self-hosted framework loaders. No Fraunces display typography, slogan labels or 7–10px essential text.
- Base reading text 16px; compact controls/metadata no smaller than 12px; section titles 20–24px. Reserve strong weight for headings, active state and important values. Mixed-language messages use automatic direction while code and paths remain LTR.
- Keep one primary action per view. Navigation contains Projects, the current project's tasks and secondary capability/settings access. Move history/details into their actual task/project context.
- Revised entry copy: 'Engineering projects' / 'Plan, build, and verify software projects.' / 'New project'. Project/task views use actual domain names instead of truncated internal run IDs.

## Integration and compatibility boundaries
- Preserve the selected model/provider, existing settings/memory and session authorization. Do not migrate to another agent SDK to satisfy a plugin name.
- Reuse the verified MagicPath project 458965191527391232 for the design reference after implementation approval. Current reference revisions are historical baselines, not the new approved design.
- Better Design/Taste guide component adoption, copy, spacing and rendered review; Vercel verification follows browser → API → persisted evidence → response, with Eve deployment commands.
- Sixtyfour applies only when a project genuinely needs people/company research; no such research is necessary for this foundation. An explicitly selected Codex plugin is not automatically an integration inside the deployed agent.
- AI Software Architect exposes no callable capability in this session. The architecture is therefore authored from the existing repository and installed Eve contracts; no unavailable plugin execution is claimed.

## Required acceptance evidence
1. Create two projects; create and resume a task in each without workspace/state leakage.
2. Execute a small real source change in Linux, publish the changed file, run a meaningful passing test and persist its exit code/revision. Then reload the project and recover its task, file and check record.
3. Run a failing test: the task stays unverified. Demonstrate that prose, an old check or another owner's check cannot bypass the gate.
4. Call the same drafting capability through an HTTP form and through the agent; both use the same persistence/error semantics. A returned Mastra failure remains failure in both paths.
5. Replay a request and attempt concurrent execution: no duplicated work or overlapping project mutations. Test cancellation, missing input, storage failure and interrupted observation.
6. Preserve memory, settings, legacy conversation and saved-run access. Another visitor cannot read project/task/artifact/check records or invoke their bound actions.
7. Review fonts, keyboard interaction, focus, code overflow, Arabic direction and copy on real desktop/mobile renders. Better Design comprehension/spacing/structure checks must have no serious/critical unresolved findings.
8. Run appropriate tests/typecheck/build, inspect the actual deployed revision, and verify a full project → task → file → check journey before describing the release as complete.

## Delivery boundary
This specification defines the first complete engineering-project workflow, not a cosmetic prototype. Implementation may be staged internally, but a release cannot substitute mocked progress, fabricated files or generated recommendations for its required end-to-end execution evidence. The next stage is a written implementation plan after the user reviews this specification.
