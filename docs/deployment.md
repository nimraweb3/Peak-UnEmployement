# Configure and deploy

This project is prepared for Cloudflare Workers but has not been deployed. No real credentials are included. Use a dedicated Supabase test project first and production keys only after the live checks pass.

## Prerequisites and local run

- Node.js 24.13 or newer (tested with 24.13.1), npm, and Git.
- Free Supabase and Cloudflare accounts for live services; no paid upgrade is required by the implementation.
- Docker only if running the optional local Supabase stack.

```sh
npm ci
```

Copy `.env.example` to `.env` and `.dev.vars.example` to `.dev.vars`, then edit the copies. Both are ignored by Git. On PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item .dev.vars.example .dev.vars
npm run dev
```

The server prints its URL, normally `http://127.0.0.1:5173`. Without configuration, the landing/legal pages work and `/join` truthfully explains that live signup is unavailable. Vite must restart after environment edits. Client values are embedded at build time, so production changes require rebuilding.

## Supabase and Turnstile

1. Create a new free Supabase project. Save the project URL and publishable key (`sb_publishable_...`; a legacy anon JWT also works). Keep secret keys out of Vite variables.
2. Apply the migration and seed using the commands in [database.md](database.md).
3. In Authentication settings, enable anonymous sign-ins. Keep provider rate limits enabled; use a separate test project for browser automation.
4. Create a Cloudflare Turnstile widget for your local/deployed hostnames. Put its public site key in `VITE_TURNSTILE_SITE_KEY`.
5. In Supabase Authentication CAPTCHA protection, select Turnstile and enter its **secret**. Supabase performs server-side verification. This implementation does not double-verify a single-use token in Hono, and therefore does not need a Worker `TURNSTILE_SECRET_KEY`.
6. Configure Supabase Site URL and allowed redirects for `http://127.0.0.1:5173/app/settings`, any `localhost` variant you use, and the final HTTPS origin. Use exact production redirect allowlists.
7. For recovery, enable email confirmation and configure a supported SMTP sender. Supabase's default email sender has strict recipient/rate limits and is not general-purpose production email delivery. Core anonymous signup does not depend on email. Test linking, confirmation and magic-link sign-in on a second browser before advertising recovery.
8. Check the Realtime publication contains `messages`, `dm_requests`, and `conversations`. The migration enables RLS; do not disable it to debug a subscription.

Follow [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), [anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous), and [Cloudflare Turnstile test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) for the current provider configuration. Test keys belong only in isolated development/test projects, never public production signup.

## Environment reference

| Variable                        | Location                             | Purpose                                                                                                         |
| ------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | `.env` / build environment           | Project HTTPS URL                                                                                               |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` / build environment           | Public client API key, protected by RLS                                                                         |
| `VITE_TURNSTILE_SITE_KEY`       | `.env` / build environment           | Public CAPTCHA widget key                                                                                       |
| `VITE_GITHUB_URL`               | `.env` / build environment; optional | Actual project repository URL; footer link omitted if blank                                                     |
| `VITE_ANALYTICS_TOKEN`          | `.env` / build environment; optional | Public Cloudflare Web Analytics beacon token; no beacon if blank                                                |
| `SUPABASE_URL`                  | `.dev.vars` / Wrangler secret        | Same project as the frontend                                                                                    |
| `SUPABASE_PUBLISHABLE_KEY`      | `.dev.vars` / Wrangler secret        | Worker client key used with user JWT                                                                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | `.dev.vars` / Wrangler secret        | Server-only Supabase secret (`sb_secret_...`) or legacy service-role key, exclusively for self-account deletion |

Never prefix a server secret with `VITE_`. Never commit filled environment files. There is no `TURNSTILE_SECRET_KEY` in the Worker because Supabase Auth owns CAPTCHA verification. Keep that secret in Supabase settings.

## Checks and live verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The default browser tests use the honest unconfigured state and skip the live suite. Run them with no populated Vite/Supabase environment. CI does this automatically. A large chunk warning for the lazy Three.js bundle is expected; it is not loaded by chat routes.

To run the actual two-session journey, configure `.env` and `.dev.vars` for an **isolated** test Supabase project with Turnstile test keys and the account-deletion server secret. Stop any existing Vite process so the test picks up current configuration. Then:

```powershell
$env:LIVE_E2E = '1'
npm run test:e2e
Remove-Item Env:LIVE_E2E
```

Or on POSIX: `LIVE_E2E=1 npm run test:e2e`.

The test creates anonymous accounts through the actual UI, selects an industry, exchanges public messages across two sessions, reloads persistence, switches rooms, checks denied DM requests, enables consent, accepts a request, exchanges realtime private messages and blocks further interaction. It deletes its accounts in `finally`; inspect cleanup warnings if credentials or the server fail. Never point this suite at the production community. Email linking and CAPTCHA failure modes also require manual verification.

## Cloudflare deployment

Review the Worker name in `wrangler.jsonc` and set client build variables first. The Cloudflare Vite plugin produces `dist/client` and `dist/peak_unemployment/wrangler.json`, with Wrangler deployment metadata pointing at the build output.

```sh
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npm run deploy
```

Paste secrets only into Wrangler's prompts. For CI deployment, configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets and Vite public values as build variables. The supplied workflow runs checks only; it does not publish or create paid services.

The app uses one origin: frontend assets at `/`, Hono at `/api/*`, and Supabase for persistent data/realtime. SPA routes fall back to `index.html`; unknown API routes stay JSON 404s. `public/_headers` protects static responses; Hono protects API responses. A custom Supabase domain requires updating the CSP's `connect-src`. Configure Web Analytics by creating a site in Cloudflare and adding its beacon token; no message bodies or private custom events are sent.

After deployment, add the exact deployment hostname to Turnstile and Supabase redirect settings. Check `/api/health`, signup, mobile composition, reconnect, moderation, privacy settings and account deletion. A successful build does not verify deployment or live realtime.

## Rollback

Record the deployed Worker version and Git revision. Use `npx wrangler deployments list` and `npx wrangler rollback VERSION_ID` to restore a previous Worker version. A Worker rollback does not revert Supabase schema/data or secrets. Use forward-compatible migrations; back up data and prepare a separate reviewed database migration for any schema reversal. Do not drop tables to roll back application code.

## Free-tier planning

Checked against provider documentation on November 2, 2026; limits can change:

- [Supabase Free](https://supabase.com/pricing): 500 MB database, 5 GB egress, 50,000 monthly active Auth users, 200 peak realtime connections and 2 million realtime messages/month; free projects can pause after a week of inactivity.
- [Cloudflare Workers Free](https://developers.cloudflare.com/workers/platform/limits/): 100,000 Worker requests/day, 10 ms CPU time per request, 128 MB memory and 50 subrequests per request.

500–1,000 registered profiles is a planning target, not a tested capacity guarantee. The free realtime connection quota prevents assuming 1,000 simultaneous users. Fan-out, repeated history refetches, indexes and retention can exhaust quotas before registered-user count does. For example, 100 posts/day delivered to 20 connected clients is roughly 60,000 deliveries/month, before reactions and other traffic; 1,000/day to 100 clients is roughly 3 million. Measure actual usage, especially Worker CPU for token verification/network processing.

Start with few rooms, no presence/typing/file uploads, bounded history and active-screen subscriptions. Monitor dashboard quotas, database size, query latency and moderation volume. Before growth, consider Supabase's recommended Broadcast approach, incremental cache reconciliation, narrower SQL policies and an explicit retention strategy. Do not silently upgrade plans. No capacity load test has been performed.
