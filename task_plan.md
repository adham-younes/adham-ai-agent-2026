# Open dark workspace

- Brief: remove app sign-in; rebuild the existing English workspace with the supplied Codex dark palette.
- Theme: surface #000000, ink #ededed, accent #53b559; semantic additions #40c977, removals #fa423e, skills #ad7bf9.
- Design: compact navigation rail, generous welcome typography, task rows, elevated composer; responsive drawers and accessible contrast.
- Reference: MagicPath project 458965191527391232; implement the same direction in the existing Next.js/Eve app.
- Identity: automatically issue signed HttpOnly browser identity; scope settings and memory to it without registration.
- Sessions: issue a signed per-session cookie on Eve creation, and verify it on continuation, streaming and controls.
- Preserve model, tools, workflows and external-service authorization.
- Checks: identity isolation/tamper/expiry tests; TypeScript and production build; browser chat, reload, settings and responsive layout.
- Delivery: verify locally, then deploy through Eve and test the production domain.
