# adham-ai-agent-2026

Public Eve agent with connector definitions under `agent/connections/`.

## Connector discovery

Eve discovers each connector module in `agent/connections/` during the Eve build/deployment process. The repository is public so GitHub-based tools such as ChatGPT and Codex can inspect the source.

Configured connector modules:

- Agentcard
- Agentmail
- Cloudflare
- Coda
- Hugging Face
- Jotform
- Local Falcon
- Lovable
- Otter AI
- Pendo
- Resend
- Stripe
- Supabase
- Vercel
- Zernio

The connector definitions use Vercel Connect project authentication; credentials are not stored in this repository.

## Development

```bash
pnpm install
pnpm dev:eve
```

## Deploy

```bash
pnpm build:eve
pnpm deploy
```

After deployment, each external connector still requires its own authorization in the consuming application. Making a repository public does not grant ChatGPT or Codex access to third-party services.
