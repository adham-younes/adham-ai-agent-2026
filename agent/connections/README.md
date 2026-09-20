# Connector inventory

This directory contains the complete connector inventory for the Eve agent. Keep one connector per module so Eve can discover and report them during build/deployment.

| Module | Service | MCP endpoint |
| --- | --- | --- |
| `agentcard.ts` | Agentcard | `https://mcp.agentcard.sh/mcp` |
| `agentmail.ts` | Agentmail | `https://mcp.agentmail.to/mcp` |
| `cloudflare.ts` | Cloudflare | `https://mcp.cloudflare.com/mcp` |
| `coda.ts` | Coda | `https://coda.io/apis/mcp` |
| `hugging-face.ts` | Hugging Face | `https://huggingface.co/mcp?login&gradio=none` |
| `jotform.ts` | Jotform | `https://mcp.jotform.com/mcp-app` |
| `local-falcon.ts` | Local Falcon | `https://mcp.localfalcon.com` |
| `lovable.ts` | Lovable | `https://api.lovable.dev/mcp` |
| `otter-ai.ts` | Otter AI | `https://mcp.otter.ai/mcp` |
| `pendo.ts` | Pendo | `https://app.pendo.io/mcp/v0/shttp` |
| `resend.ts` | Resend | `https://mcp.resend.com` |
| `stripe.ts` | Stripe | `https://mcp.stripe.com` |
| `supabase.ts` | Supabase | `https://mcp.supabase.com/mcp` |
| `vercel.ts` | Vercel | `https://mcp.vercel.com` |
| `zernio.ts` | Zernio | `https://mcp.zernio.com/mcp` |

All modules must remain regular `.ts` files exporting the default result of `defineMcpClientConnection`. Do not commit API keys, OAuth tokens, or connector secrets.
