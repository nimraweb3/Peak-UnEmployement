# Free-tier deployment — account/profile release

Current deployment: [Vercel frontend and backend on one origin](backend-live.md). The Cloudflare proxy layout below is an alternative, not the active setup.

Supabase setup was performed on the new, empty `peak-unemployment` project (`eedxbddfpwfalyvavzsg`) in the free Peak Unemployment organization. See [Supabase setup status](supabase-setup-status.md) for verified changes and remaining requirements. A [frontend-only Vercel deployment](frontend-deployment.md) is now live. The backend layout below is still a proposed architecture, not a deployed service. DNS has not been changed.

## Recommended runtime layout

Keep the frontend on the existing Cloudflare deployment. Deploy `server.ts` as a separate Vercel Hono/Node project using `vercel --local-config vercel.backend.json`; select Hobby only for eligible personal/noncommercial use. This entry reuses the same Hono API and does not replace it with Express. Vercel deployment itself is not yet verified.

Server image decoding/re-encoding is CPU work. Cloudflare Workers Free currently documents 10 ms CPU/request, so do not assume that image processing fits that plan. Point the frontend Worker BACKEND_ORIGIN at the deployed HTTPS Node origin. Leave VITE_API_URL empty; /api forwarding keeps browser requests same-origin and preserves existing CSP. Vercel's root public/ directory contains only public assets; never place credentials there.

Set the same strong random API_PROXY_SECRET in Cloudflare and Vercel server environments. The Worker adds it to forwarded requests; the Node entry requires it in production before authentication or image work. This prevents bypassing the Worker's network limiter through the bare Node origin. Never put this secret in VITE variables. Node CORS is restricted to FRONTEND_ORIGIN. For local Node work, use the Vercel CLI with the same server environment; the existing Vite/Worker development command also works locally without forwarding.

Sources checked 2026-11-10: [Workers Free pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Hono on Vercel](https://vercel.com/docs/frameworks/backend/hono), [Hobby eligibility and quotas](https://vercel.com/docs/plans/hobby).

## Environment checklist

Browser .env.local / frontend build:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY (public key only)
- VITE_TURNSTILE_SITE_KEY
- VITE_SITE_URL
- VITE_EMAIL_AUTH_ENABLED=false until SMTP and verification are tested
- VITE_FRONTEND_DEMO=false (production ignores this regardless)
- VITE_API_URL empty for the recommended same-origin proxy

Worker .dev.vars / Cloudflare environment:
- SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY only if serving APIs locally/on Worker
- SITE_URL
- BACKEND_ORIGIN and API_PROXY_SECRET for forwarding

Vercel server:
- SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY
- FRONTEND_ORIGIN (exact frontend HTTPS origin)
- API_PROXY_SECRET, NODE_ENV=production

OAuth client secret and SMTP password belong in Supabase provider settings. No frontend service-role key or SMTP secret. `.env.example` and `.dev.vars.example` are safe blank templates.

## Database deployment

1. Back up the existing database and inventory existing usernames/status values before applying migrations.
2. Apply all migrations to a disposable local/staging Supabase project first. `npx supabase db reset` is for disposable local data only.
3. Review `npx supabase db diff` / the migration plan and the two new SQL files. The migration ledger is repeatable; do not manually rerun already-applied SQL.
4. After deployment authorization, link the intended project and run `npx supabase db push`. This step has NOT been run here.
5. Verify profile-media bucket limits/policies, Realtime publication, Auth confirmation, redirects, CAPTCHA and SMTP. New profile fields do not add a realtime table subscription; existing message subscriptions are preserved.
6. Deploy the Node API, configure proxy secret/origin, build frontend with `npm run build`, then deploy the existing Cloudflare project. Check /api/health and perform the real two-account test plan.

## Capacity and maintenance

Supabase currently lists 500 MB database and 1 GB Storage on Free. This is not a guarantee that 1,000 active users fit all database, realtime, egress, email or compute quotas. Profile image caps reduce storage use; message volume and repeated downloads still matter. Monitor all provider usage dashboards and stay on free plans. Do not enable paid upgrades automatically. See [Supabase pricing](https://supabase.com/pricing).

Run `node scripts/cleanup-media.mjs` regularly in a trusted environment with the server variables set. It processes up to 100 unused objects per run; repeat until zero. Keep secrets out of shell history and logs. The durable queue retains failed operations; monitor failures. Account deletion attempts cleanup immediately and leaves any failures queued.

## Rollback

Before rollout, retain the previous frontend/API deployment and a database backup. Prefer rolling back application code while retaining additive tables and data. Do not drop profile/history tables or erase messages to roll back. Old application calls remain compatible through the mutate wrapper. Newly claimed usernames remain subject to database rules. The old situation column is deliberately redacted after migration; restore only from an authorized backup if an explicit rollback truly needs it. Remove BACKEND_ORIGIN to stop forwarding only if the target runtime can safely serve the requested workloads; do not silently move CPU-heavy images onto a free Worker.
