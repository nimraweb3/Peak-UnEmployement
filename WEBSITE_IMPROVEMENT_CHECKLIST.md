# Website improvement checklist

Audit started 2026-11-15. Confirmed findings below come from source inspection; runtime verification is recorded separately. No destructive database work is planned.

## R1 — Background refresh hides cached chat
- Category: Reliability
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: useMessages.ts; ChatPanel.tsx; PublicConversation.tsx
- Problem / why it matters: A temporary fetch failure removes readable history.
- Solution: Retain history on transient errors; suppress it on authorization loss.
- Priority: High
- Complexity: Medium
- Acceptance criteria: Regression tests cover transient and 401/403 failures.
- Status: Completed

## R2 — API parser and cancellation
- Category: Reliability
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: lib/api.ts; hooks/useMessages.ts
- Problem / why it matters: HTML gateway failures produce JSON syntax errors; requests lack bounded deadlines and cancellation.
- Solution: Use shared bounded JSON transport with safe errors, status preservation and optional AbortSignal.
- Priority: High
- Complexity: Medium
- Acceptance criteria: Tests cover JSON/non-JSON errors, cancellation and timeout.
- Status: Completed

## U1 — Room drafts can cross room boundaries
- Category: UX
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: ChatPanel.tsx
- Problem / why it matters: Inner chat state is keyed only by profile; reuse can carry a draft to another room.
- Solution: Key chat state by user, kind and room ID.
- Priority: High
- Complexity: Small
- Acceptance criteria: Switching rooms clears draft and pending state.
- Status: Completed

## P1 — Vercel omits existing public server rendering
- Category: Performance / SEO
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: scripts/package-vercel-fullstack.mjs; src/worker/pages.tsx
- Problem / why it matters: SPA upload loses initial content, metadata, sitemap and real 404 responses.
- Solution: Prerender with existing page renderer at build time; serve private noindex shell and real fallback 404.
- Priority: High
- Complexity: Medium
- Acceptance criteria: Built HTML has page-specific metadata and content; private paths excluded from sitemap.
- Status: Completed

## P2 — Landing code eagerly imported on every route
- Category: Performance
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: App.tsx; shared/seo.ts
- Problem / why it matters: Auth and settings import editorial landing and public page code through metadata.
- Solution: Lazy-load Landing and separate room metadata from presentation.
- Priority: Medium
- Complexity: Small
- Acceptance criteria: Build and route tests pass; inspect entry chunks.
- Status: Completed

## A1 — Loading status not announced
- Category: Accessibility
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: components/common.tsx
- Problem / why it matters: Loading placeholder lacks status semantics.
- Solution: Add polite status semantics and hide decorative spinner.
- Priority: Medium
- Complexity: Small
- Acceptance criteria: Semantic test verifies status name/text.
- Status: Completed

## R3 — Realtime status remains reconnecting after brief outage
- Category: Reliability
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: hooks/useMessages.ts
- Problem / why it matters: Online handler always says reconnecting even if the channel stayed joined.
- Solution: Derive reconnect state from channel state and actual network connectivity.
- Priority: Medium
- Complexity: Small
- Acceptance criteria: Hook tests cover online/offline and cleanup.
- Status: Completed

## O1 — CI browser suites mixed with demo mode
- Category: Production
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: playwright.config.ts; tests/e2e
- Problem / why it matters: Default glob includes demo-specific tests against ordinary dev server.
- Solution: Explicitly separate public, demo, live and production checks.
- Priority: Medium
- Complexity: Small
- Acceptance criteria: Playwright list contains only intended public suite by default.
- Status: Completed

## S1 — Review authorization, uploads and dependency exposure
- Category: Security
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: worker routes; migrations; tests/integration
- Problem / why it matters: Existing protections require current regression evidence.
- Solution: Run database/API tests, dependency and secret scans; inspect trust boundaries.
- Priority: High
- Complexity: Medium
- Acceptance criteria: Record actual results; no unverified broad security claim.
- Status: Completed

## O2 — Email delivery unavailable
- Category: Production
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: Supabase SMTP; auth flags
- Problem / why it matters: No sender domain/email provider is configured.
- Solution: Keep signup/recovery disabled until operator provisions delivery.
- Priority: High
- Complexity: Medium
- Acceptance criteria: External dependency documented; no fabricated verification emails.
- Status: Blocked

## O3 — Distributed network limits and cleanup scheduling
- Category: Production
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: Vercel configuration; scripts/cleanup-media.mjs
- Problem / why it matters: Cloudflare limiter is absent on Vercel; periodic cleanup is not scheduled.
- Solution: Document deployment gaps and operational setup; retain atomic database action limits.
- Priority: High
- Complexity: Medium
- Acceptance criteria: No claim of complete abuse protection or scheduled cleanup without evidence.
- Status: Blocked

## Q1 — Current full verification and honest handover
- Category: QA
- Evidence: Confirmed source/configuration finding; S1 and Q1 are verification work, not allegations of a vulnerability.
- Location: WEBSITE_AUDIT_REPORT.md; tests
- Problem / why it matters: Prior results cannot certify new changes or real devices.
- Solution: Run lint/types/tests/build, browser checks, audit artifacts and record limitations.
- Priority: High
- Complexity: Medium
- Acceptance criteria: Report distinguishes current results, prior measurements and external blockers.
- Status: Completed

## Scope and external verification
Personal Google account testing remains excluded by user preference. No new production QA identities will be created in this audit without required terms approval. Physical mobile keyboards, assistive technology, real two-user delivery, backup restoration, and production monitoring require separate evidence. Current UI style is preserved.

## R4 — Inbox has no fallback when realtime is interrupted
- Category: Reliability
- Evidence: Confirmed; Messages.tsx disables polling outside demo mode.
- Location: pages/Messages.tsx
- Problem / why it matters: Requests and closed-conversation state can stay stale after missed events.
- Solution: Add a 30-second foreground reconciliation and cancellation.
- Priority: Medium
- Complexity: Small
- Acceptance criteria: Typecheck/build pass; no background polling configured.
- Status: Completed

## Verification evidence
- Baseline: 87 tests / 17 files passed. After changes: 97 tests / 19 files passed.
- TypeScript, production build, and final lint passed. Lint initially caught generated prerender code; generated .vercel artifacts are now excluded.
- Initial added UI test had an ambiguous status selector; corrected it, then reran the full suite successfully.
- npm audit: 0 known vulnerabilities (556 installed dependencies). Secret-pattern scan passed 182 files before changes; final scan recorded in report.
- Four live production tests passed. Homepage Lighthouse performance sample 69 → 77; see report for measured values and caveats.

## Additional external verification gates

### O4 — Operational restore and alert validation
- Category: Production operations
- Evidence: Unverified; no restore-drill or alert-delivery evidence in this audit.
- Location: Supabase backups; hosting monitoring
- Problem / why it matters: Recovery and incident response cannot be inferred from available code.
- Solution: Operator selects retention/alert ownership and validates restore in an isolated project.
- Priority: High
- Complexity: Medium
- Acceptance criteria: Documented restore and delivered test alert without touching production data.
- Status: Blocked (operator configuration and isolated recovery environment)

### Q2 — Device and multi-user validation
- Category: QA
- Evidence: Not run this audit; not a confirmed defect.
- Location: signed-in mobile chat, Google consent, two-user DMs
- Problem / why it matters: Browser emulation and database tests do not prove physical keyboard or two-user delivery.
- Solution: Run on physical iOS/Android and isolated authorized test identities; keep personal Google testing excluded.
- Priority: Medium
- Complexity: Medium
- Acceptance criteria: Device and two-user evidence recorded without publishing fixtures to the community.
- Status: Blocked (devices and isolated test identity environment)

No wholesale CSS rewrite or speculative pagination rewrite is scheduled: possible gains remain unconfirmed and require profiling representative authenticated histories. Current bounded-history behavior is retained.

Final WCAG 2.2-tagged production run: four tests passed (1.8 minutes); zero automated violations in the tested routes/viewports.
