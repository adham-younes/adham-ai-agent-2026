# Workroom production verification — 2026-10-08

Production: https://adham-ai-agent-2026.vercel.app
Deployment: dpl_Akc1ZYd874TNof7iYuqyP3VoWTSo (Vercel Ready)

## Implemented
- Black/white/green workspace; Fraunces / Plus Jakarta Sans / IBM Plex Mono; seven typed deliverable forms, saved history, result retrieval and Markdown download.
- Workflows validate input, initialize durable Mastra storage, save owner-scoped results, reuse idempotent requests and preserve failures. Interrupted runs expire after ten minutes.
- Explicit Supabase memory saves stable facts by authenticated visitor scope; bounded recall, unsafe-fact rejection and database scope policies.
- Additive migrations 0006/0007 applied. Existing user records retained. Bootstrap 0000 supports fresh migration order before 0003.
- TLS certificate/hostname validation remains enabled. Official Supabase Root 2021 CA configured via POSTGRES_CA_CERT.

## Observed evidence
- Typecheck, 33 automated tests, production Next/Eve build and git diff --check passed.
- /eve/v1/health: 200, ready. Workflow history: 200, storage=postgres, status=available.
- Real synthetic code-review request saved a proposed repair: 6e8b4495-881d-4954-8731-fb66f0d78cb4, succeeded.
- Same request replay: 200 without another execution. Changed input under the same key: 409. Missing input: 422. Another visitor reading the run: 404.
- Browser-generated result persisted and reopened after reload; proposed code corrected the synthetic subtraction defect. No project files were changed by the generated report.
- Eve memory save tool executed; a new conversation recalled the synthetic notebook label; a different visitor did not receive it.
- Synthetic settings PUT: 200. A real Eve turn returned the marker required by saved settings. Snapshot restored; another visitor's session access was denied.
- Browser conversation returned the verification text and restored it after reload. Browser error/warning inspection returned no entries.
- Mastra initialized 43 tables; none permit SELECT to anon/authenticated. Three public application tables retain RLS and FORCE RLS.
- Layout checked at 390/1440 CSS pixels without document overflow. Screenshots: 1080px laptop and 390px mobile.

## Limits
- Live generation exercised code review; automated tests cover shared validation, idempotency, persistence failure and feature-output forwarding. All seven workflows were not individually generated in production.
- Deliverables are generated proposals. They do not apply migrations, write repaired files, run checks, deploy applications or prove incidents resolved.
- Signed browser identity scopes records; clearing its cookies loses access. Cross-device accounts remain future work.
- Synthetic verification records remain isolated under test visitor identities. Existing user records were not deleted.
- One local response timed out after successful server persistence; idempotent replay recovered the result. Subsequent browser/SDK checks succeeded.

## Certificate provenance
Official source: https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json
Download: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
SHA-256: 807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA
TLS guidance: https://supabase.com/docs/guides/platform/ssl-enforcement
