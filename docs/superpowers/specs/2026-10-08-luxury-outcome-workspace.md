# Luxury outcome workspace

## Intent and authorization
The user requests implementation through verified production deployment: complete the Supabase recommendations, redesign the agent workspace with luxury styling, retain #000000/#ededed/#53b559, change fonts, and replace generic content with coherent business behavior. This authorizes reversible implementation, additive migrations, isolated live verification writes, and production deployment. Preserve existing identities and data.

## Product contract
English/LTR direct entry, no mandatory login. The product is a personal software delivery workspace. Every entry point names an outcome and its expected deliverable. Free-form agent conversations remain available for actual implementation. Structured workflows produce reviewable reports/specifications; they must not imply that generated text deployed software or ran tests. Remove fabricated example output and fake execution checks.

## Visual contract
Editorial luxury on the existing black/white/green palette. Fraunces display typography, Plus Jakarta Sans interface, IBM Plex Mono technical accents; self-host with Next fonts. Restrained asymmetric composition, spacious readable headings, fine separators, thin icons, nested composer shell, accessible focus and contrast, reduced-motion support. Mobile has reachable navigation/composer, no horizontal overflow. Use live MagicPath design and Taste guidance, adapting marketing heuristics to a working product.

## Data/runtime contract
1. Supabase settings continue to feed real agent instructions.
2. Structured workflow forms call the real workflow API, validate appropriate typed input, display honest run state and final output, and expose per-visitor persisted history and run detail after reload.
3. Workflow store requires a database, initialization of Mastra storage, owner-scoped retrieval/completion, idempotent request handling, and honest treatment of failed workflow results. Database outage must never be represented as persisted success.
4. Long-term agent memory is backed by Supabase with per-principal scoped recall and explicit save tools, bounded content, and rejection of missing principals. Eve retains conversation/state persistence; do not duplicate Eve's event store.
5. Additive versioned migrations reconcile agent_runtime policies, harden grants for new objects, and add only required memory/run fields. Preserve existing data. Verify TLS certificates using trusted CA configuration or system trust; do not silently disable validation.
6. Role-level grants plus server ownership predicates must be verified. No cross-visitor run detail or memory reads. No secrets in logs/artifacts.

## Acceptance evidence
TypeScript, Next build, Eve build, meaningful targeted tests, real workflow success/failure/repeat and durable result retrieval; real agent memory save and recall across new sessions; isolation between two signed visitors; settings applied to model context; local/production desktop and mobile screenshots; production READY, health, logs and full path through UI/API/database. Confirm all named capabilities with evidence, not boolean flags.

## Boundaries
Keep the existing Eve/model architecture. OpenAI Developers guidance is reviewed for lifecycle/verification practices, not a provider migration. Sixtyfour is not relevant unless the product needs company/person intelligence. No new account creation, paid enrichment, fabricated metrics, redundant vector store, or migration of Supabase auth users.
