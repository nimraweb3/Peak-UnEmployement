# Frontend deployment — 2026-11-11

Update 2026-11-12: the frontend-only release below has been superseded by the [live backend deployment](backend-live.md). API routes now run on the same production origin.

Stable production URL: https://peak-unemployment.vercel.app

Vercel team: `team_WJ0EWzCrpsf2tCK2lMUNMTGJ` (`nim12`). Project: `prj_PRjSzbRmSWGxXX76hfldIfEr2tCQ`. Deployment: `dpl_2xBoVtPtPKB8QK6eQGHdekqV2Qwg`, READY, production.

This is the frontend-first release requested by the user. It was built from the current local working tree with `npm run build`, not from a Git commit. Only `dist/client` public output was uploaded through the Vercel connector. Worker output, environment files, source maps, and local deployment metadata were excluded. Preview deployments are protected; production is public.

`scripts/package-vercel-frontend.mjs` prepares the frontend-only upload in ignored `.vercel/frontend-upload.json`, includes security headers and SPA deep-link routing, and rejects secret-key patterns. `/api/*` returns HTTP 503 with a setup message until the backend is deployed. This is not a fully operational chat/auth release.

Verified homepage, `/auth`, and `/rooms/tech` return 200; JS and CSS assets return correct content types; CSP is present; `/api/health` returns the intentional JSON 503. The deployed homepage was rendered in the browser and its content and industry links were checked.

Supabase Site URL and the production callback are configured for the stable URL. Future deployments should update this same Vercel project, retaining its production alias. Google OAuth, SMTP, Turnstile, backend hosting, and real account/chat acceptance checks remain outstanding.

Do not deploy the repository root as a static directory or upload `dist/peak_unemployment`; that Worker build includes server configuration. This packaging script is for the frontend-only phase, not the future combined frontend/API deployment.
