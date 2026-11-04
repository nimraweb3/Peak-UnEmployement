# Verification — Peak Unemployment redesign

Verified locally on **2026-11-03**. No production credentials or deployed community were available.

| Check | Result |
| --- | --- |
| Strict TypeScript / production Worker + Vite build | Passed |
| ESLint | Passed |
| Vitest | 42 passed across 8 files |
| SQL | All migrations, grants/RLS, consent, limits, cleanup and guest projection tested in PGlite |
| Public Playwright Chromium | 4 passed |
| Hosted Supabase journey | 1 skipped; isolated project credentials required |
| Automated axe scan | No detected A/AA violations on public light/dark pages and join dialog |
| Responsive checks | 320, 375, 390, 430, 768, 1280, 1440, 1920 CSS px; no page overflow |
| Text/reflow | 200% text resize at 1280; 320px reflow equivalent to 400% browser zoom |
| npm audit | 0 vulnerabilities after pinning Lighthouse 13.5.0 |
| Deployment | Not performed |

## Real Lighthouse measurements

Lighthouse **13.5.0**, Chromium, mobile simulated throttling, local **production** Worker on port 4173. Recorded 2026-11-03, starting 15:22:24 UTC. Supabase is unconfigured; the homepage/public room truthfully display service unavailability. These are one-run laboratory results, not field INP or a production SLA.

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| homepage | 97 | 100 | 96 | 100 | 1.48s | 181ms | 0.00006 |
| public-room | 82 | 100 | 96 | 100 | 4.16s | 211ms | 0.00006 |
| privacy | 99 | 100 | 100 | 100 | 1.86s | 0ms | 0.00369 |

[Homepage HTML report](audits/homepage.html) · [Public room report](audits/public-room.html) · [Privacy report](audits/privacy.html) · [Machine-readable summary](audits/lighthouse-summary.json) · [axe results](audits/axe-public.json)

The first implementation measured homepage performance 76 with LCP 4.38s. Deferring the interactive bundle until the server HTML can paint, deferring theme initialization, removing the homepage Motion dependency and restricting CSS scanning improved the final homepage to 97 with LCP 1.48s. The informational privacy document needs no React bundle on direct production visits and scored 99.

The public-room performance score **82** remains below the 90 target: LCP is 4.16s and TBT 211ms in the unconfigured local build. Its late-rendered unavailable-service content contributes to LCP. Chat pages lose best-practices points for the truthful HTTP 503 responses; the privacy page scores 100. Local Miniflare serves uncompressed assets, and reports still identify unused JavaScript/CSS and network dependencies. Verify the actual CDN compression and connected-data behavior after deployment. No unavailable metric or score was invented.

## Scope and evidence

Database tests execute real PostgreSQL functions and permissions in PGlite, including guest direct SELECT/write denial, private-data exclusion, exact public field lists and cursor pagination. They do not test hosted GoTrue, PostgREST, CAPTCHA, SMTP, Realtime websocket delivery or production concurrency.

Browser tests verify anonymous browsing sends no Auth request, joining remains deliberate and context-preserving, the unconfigured join stays disabled, dialogs close with Escape and restore focus, reactions are gated, plain text stays safe, public HTML exists before JavaScript, unknown paths return 404, and private routes are guarded. Empty and populated guest cases use **explicit test-only request interceptions**; production has no fixture route or fabricated activity.

Screenshots in `docs/screenshots/redesign-*` show the actual unconfigured app. Desktop/mobile, dark mode, tablet and onboarding images were inspected. Earlier non-redesign images are historical. Automated checks support the WCAG 2.2 AA design target but are not a claim of exhaustive accessibility certification. Full screen-reader, real mobile keyboard and hosted-member flows still require device/project testing.

## Reproduce

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

For audits, start `npm run preview -- --host 127.0.0.1 --port 4173`, then run `node scripts/audit.mjs` in another terminal. The script launches its own headless test Chromium on debugging port 9333 and closes it after writing reports. Keep that port free. The regular browser suite expects no configured Supabase environment; use the separate LIVE_E2E flow documented in [deployment](deployment.md) for an isolated configured project.

## External configuration still needed

Apply all three migrations plus seeds, set Supabase frontend/Worker credentials, enable anonymous Auth with Turnstile, configure Realtime and email recovery, and set SITE_URL/VITE_SITE_URL to the actual domain. Complete the isolated two-session test and manual CAPTCHA/recovery checks. Publish operator contact/retention details and review the legal documents before public launch. Validate field INP, backend latency, abuse controls and quotas against real usage. Nothing was deployed or billed.
