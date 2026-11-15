# Website audit report
Date: 2026-11-15

## Initial findings and scope
Peak Unemployment is a React 19 / TypeScript / Vite community application with Hono API routes, Supabase Auth/PostgreSQL/RLS/realtime/storage, Cloudflare Turnstile and Vercel hosting. Public visitors read room feeds; anonymous or Google-authenticated members complete onboarding, join industry rooms, manage profiles and opt into private message requests. Existing editorial design and consent defaults are retained.

Reviewed routing, public and authenticated layouts, session lifecycle, chat, inbox, profile/media/account APIs, schema validators, SQL authorization and media migrations, server adapters, public rendering, deployment packaging, CI and test configuration. This is a targeted source-and-runtime engineering audit, not a penetration test or proof that every path/device is flawless.

Confirmed defects:
- Transient chat refresh errors hid loaded history; online status could remain stuck reconnecting.
- Shared fetch assumed JSON responses and lacked request deadlines/cancellation.
- Chat state could survive changing its room identifier when reused.
- Production inbox had no fallback reconciliation after missed realtime events.
- Vercel packaging bypassed the existing public renderer: blank initial SPA HTML, JavaScript-only metadata, missing sitemap and successful responses for unknown pages.
- Authenticated and auth routes unnecessarily imported editorial presentation through both the eager landing route and SEO module.
- Default browser-test glob mixed suites needing different environments.
- Loading feedback lacked status semantics; workspace focus did not rerun when an initial profile finished loading.
- Generated prerender output was initially linted as application source.

## Improvements implemented
### Reliability and UX
Added shared requestJson transport with a 20-second deadline, caller cancellation, preserved HTTP statuses and safe non-JSON error messages. Valid JSON null and HTTP 204 are supported. Mutations are not automatically retried. Existing chat idempotency keys remain unchanged.

Retained history on recoverable refresh failures with a retry notice. A 401/403 still hides cached private messages. Account transitions continue clearing the query cache. Keyed chat state to user, room kind and ID so drafts/pending rows cannot migrate between conversations. Reconciled realtime online state and added 30-second foreground inbox refresh. Loading status and profile-ready workspace focus are accessible.

### Performance and discovery
Added a build-time prerender step using the existing Hono/React public renderer. It produces 13 public HTML documents, public-only sitemap, robots, private noindex shells and 404 HTML. Vercel routing now serves those files and returns HTTP 404 for unknown paths. Private routes receive X-Robots-Tag noindex headers as well as noindex HTML. No private messages, identities, database calls or secrets are used during prerender.

Lazy-loaded the landing route and extracted room names/descriptions from presentation imports. Main chunk gzip changed from approximately 83.07 KB in the previous release to 78.99 KB; the landing route is separately loaded. This is a chunk-level comparison, not a claim that total downloaded JavaScript fell by the same amount.

### Security and backend
Retained verified-token authentication, confirmed-email requirement for nonanonymous users, owner/conversation RLS, strict request schemas, body-size limits, database action limits, safe text rendering, admin authorization, JPEG re-encoding and storage ownership checks. No database migrations or destructive production changes were needed in this audit.

Added Google OAuth secret patterns to the existing redacted secret scanner. The check is not an exhaustive credential/history audit. No secrets are included in this report or deployment upload. Build output containing server env files is excluded by the explicit client-only packaging step.

Reference: [OWASP API Security Top 10](https://owasp.org/projects/api-security-project), especially object authorization and resource consumption. No OWASP certification is claimed.

### Maintainability and delivery
Separated default public browser tests from demo/live/production suites. Excluded generated .vercel code from linting. No new runtime dependencies or paid services were added. Build and packaging use the existing project/team and preserve the real API.

## Verification results
- Baseline: 87 tests in 17 files passed.
- After implementation: 97 tests in 19 files passed, including PostgreSQL/PGlite authorization/integrity tests, API adapters, unsafe-input rendering, transport failures and chat-state regression checks.
- Typecheck: passed.
- Production build with prerender: passed.
- Lint: passed after excluding generated renderer output.
- Dependency audit: 0 known vulnerabilities across 556 installed dependencies.
- Default browser test discovery: exactly five public tests, no demo suite mixed in.
- Production deployment: dpl_BLT7DUSyf7fMBuzFJDSkYu2dgsaF, READY at https://peak-unemployment.vercel.app.
- Live API health: configured=true; unauthenticated /api/me returns 401 and Cache-Control: no-store.
- Live HTTP and browser checks: four production tests passed. Initial attempt could not launch the missing bundled Chromium; configured optional PLAYWRIGHT_CHANNEL=chrome and reran successfully using installed Chrome.
- Eight homepage scans at 1440/768/390/320px in both themes and six auth/legal scans found zero axe violations in the tested WCAG 2.0/2.1/2.2 A/AA rules. The additional WCAG 2.2 pass also completed with all four acceptance tests passing. Mobile screenshot reviewed: readable copy, two-column room cards, visible composer/CTA and no horizontal overflow.
- HTTP assertions verified pre-JavaScript content, Open Graph/canonical metadata, sitemap excluding app routes, private noindex headers/HTML and HTTP 404.
- Final secret-pattern scan: passed, 189 source files. Git diff whitespace check passed.
- Current public automation creates no users and posts no messages. Earlier account QA is historical evidence, not a fresh test of this release.

## Remaining issues and external dependencies
- Email sender/domain/SMTP remain unavailable. Email signup/recovery remain disabled; do not enable them before delivery and reset verification.
- Personal Google sign-in remains intentionally untested under the user's earlier preference. This audit did not create new production users or send messages.
- Vercel distributed network rate limiting is not configured. PostgreSQL action limits and request body limits exist but do not replace edge-wide abuse controls.
- The durable media cleanup script exists, but scheduled execution/credentials and operational alerts need operator setup. No arbitrary cleanup was run against production.
- Backup restore drills, centralized error monitoring/alert ownership and production two-user realtime/network-interruption journeys remain unverified.
- Physical mobile keyboards and screen-reader testing remain necessary. Automated axe checks cannot establish complete WCAG 2.2 AA conformance.
- Existing CSS is sizable and contains successive design layers; no wholesale rewrite was attempted without page-level evidence that removal is safe.
- Message history polling revalidates loaded pages (bounded to ten); large-history request cost merits measured follow-up before a pagination architecture change.
- No production mutation/authentication flows are certified solely by unit tests or PGlite tests.

## Final status
Implementation, deployment and public live verification are complete. The application has concrete reliability, initial-rendering, crawler and testing improvements. Remaining external dependencies and untested journeys prevent a blanket production-ready or completely secure claim.

## Measured performance

Same-day Lighthouse mobile lab samples on the stable production URL (one before and one after; host/network variability and concurrent tooling mean these are directional samples, not a controlled benchmark or field INP).

| Metric | Before | After |
|---|---:|---:|
| performance | 69 | 77 |
| accessibility | 100 | 100 |
| best-practices | 100 | 100 |
| seo | 100 | 100 |
| LCP | 2925.6435 ms | 2512.7440 ms |
| Total blocking time | 1026.0000 ms | 556.5000 ms |
| CLS | 0.0002  | 0.0000  |

Auth after-change sample: performance 77, accessibility 100, best practices 100, SEO 66. Auth is intentionally noindex; its SEO score is not a public discoverability target. Homepage performance remains below 90; no claim of fully optimized Core Web Vitals. Raw JSON and responsive screenshots are in ignored docs/audits and docs/screenshots.

## Operational handover
Use npm run build (now includes prerender), then node scripts/package-vercel-fullstack.mjs. Do not deploy the frontend-only package to production: it intentionally serves unavailable API responses. Rollback reference: dpl_GefPEqer6t2x4onhbEDUYBMUAEpQ. No commit/push was performed. Configure sender verification/SMTP before enabling email signup, a bounded free-tier-compatible edge limit after deciding normal traffic thresholds, and scheduled execution of the durable cleanup script with server-only credentials. Verify a restore on an isolated database before declaring backup recovery ready.
