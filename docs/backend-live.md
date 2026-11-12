# Live backend — 2026-11-12

Production: https://peak-unemployment.vercel.app

Vercel deployment `dpl_HfJThH9EAHnXxXm8TUX6hkAw2Z4g` is READY on project `prj_PRjSzbRmSWGxXX76hfldIfEr2tCQ`. The frontend and Hono API now share one origin. `api/index.ts` passes server-only environment bindings to the existing API. No browser proxy secret or cross-origin API URL is required for this layout.

The packaging script `scripts/package-vercel-fullstack.mjs` takes the already-built frontend, places it under `public/`, and bundles local backend modules with esbuild into `api/index.mjs`. This avoids extensionless ESM imports failing in the deployed Node runtime. npm dependencies remain external and are installed with the lockfile. Only the public directory is served as static content. Environment files are never included in the upload.

Production variables set through the Vercel connector: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY (sensitive), SITE_URL. The secret key value was not printed. Existing Cloudflare and proxy-only `server.ts` entries remain alternatives; they are not the active deployment.

## Verified

- TypeScript and ESLint passed; 3 Vercel entry tests and 22 API/account/media tests passed.
- Tested the generated Node bundle locally against the hosted database.
- Live health and lounge/tech public room feeds returned 200 JSON.
- Private `/api/me` without a session returned 401.
- A temporary, confirmed test account successfully signed in, bootstrapped a profile, saved a private profile, read it back, and loaded industries through the deployed API.
- Deleted that test account through the deployed account-deletion endpoint; its old token was then rejected with 401. No demo account or public test messages remain.
- Browser homepage displayed the real empty-room state and active polling instead of the setup error.
- Source/package/environment URL probes returned the SPA, not source or credentials.
- No error/fatal logs were returned for the final deployment during the post-deployment check. The earlier failed deployment is superseded.

## Remaining launch work

Google OAuth, SMTP delivery, and Turnstile are not configured. Anonymous sign-in remains disabled. The temporary admin-confirmed test account does not establish that public signup or email delivery works. Profile uploads, realtime two-user chat, and DM flows still need live acceptance testing after sign-in setup.

Database per-user action limits and request body limits remain active. The Cloudflare NETWORK_LIMITER binding is not present in this Vercel-only layout; equivalent shared network-level rate limiting remains launch hardening work. Media deletion attempts immediate cleanup and retains failures in the durable queue; scheduled cleanup is not yet configured.

Future releases: build frontend with `npm run build`, run checks, then package with `node scripts/package-vercel-fullstack.mjs` and deploy its allowlisted files to the same project. The older frontend-only packaging script intentionally disables API routes and must not be used for normal full-stack releases.
