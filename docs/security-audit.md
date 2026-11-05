# Security audit — 2026-11-04

Scope: repository source, actual SQL migrations/grants/RLS, local PostgreSQL-compatible PGlite integration tests, Hono boundary tests, production build and local browser tests. No deployed Supabase project, real credentials or external penetration test was available. This is a scoped engineering review, not ASVS certification or a declaration of production security.

Frameworks: [OWASP Top 10:2025](https://top10.owasp.org/2025/) and [ASVS 5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en). Mapping below is at chapter/category level, not a claim that every requirement has been verified.

## Findings and fixes

| ID / severity | Location and exploit / impact | Recommendation and actual fix | Evidence / residual risk |
| --- | --- | --- | --- |
| S01 Medium, verified | public.is_blocked accepted arbitrary profile pairs; an authenticated caller could query relationships between other members. | Limit helper results to pairs containing the current profile. Implemented in 202611040001_security_hardening.sql. | SQL regression: outsider gets false for an existing block; participant gets true. Public profiles are intentionally visible to members. |
| S02 Low, verified | worker/lib.ts passed arbitrary database error messages to HTTP clients, exposing schema/constraint internals. | Map errors to safe application messages. Implemented. | Unit regression checks private schema text does not escape. Direct PostgREST can still expose ordinary PostgreSQL constraint errors; do not put secrets in schema names. |
| S03 Medium, code-observed | session.tsx only cleared queries on null sessions; a non-null A→B transition could retain A’s query data. | Clear query cache and channels whenever user ID changes; remount chat contents by profile ID to clear pending messages/drafts; use the Auth subscription’s initial event to avoid a competing initial-session read. Implemented. | Source review; real cross-account browser flow remains staging work. Already downloaded data cannot be revoked. |
| S04 Medium, verified design gap | DM requests were subject only to 120 general actions/minute, allowing broad unwanted requests. | Ten new requests per sender/hour plus existing unique lifetime pair and opt-in checks. Implemented in SQL, indexed by sender/time. | SQL hourly-limit regression; atomic sender/consent locks retained. New identities and distributed attacks require Auth controls. |
| S05 Low, verified | Direct mutate RPC ignored unexpected fields on non-profile actions; unbounded cursor decoding increased unnecessary parser work. | Reject unexpected RPC keys/oversized JSON and cap encoded cursor length at 256. Implemented. | SQL rejects spoofed sender and oversized payload. API strict Zod validation remains. This was not a demonstrated sender-impersonation vulnerability: the old RPC already derived sender ID. |
| S06 Medium, verified design gap | No network-level Worker throttling. | Added NETWORK_LIMITER binding, 300 requests/minute per network address with Retry-After. | Denial boundary unit test. Cloudflare limits are shared, approximate and per location, not globally atomic. Missing IP skips this layer locally; public Supabase endpoints bypass it. User mutation limits remain atomic in PostgreSQL. |
| S07 Medium, verified configuration | CI actions used mutable tags; no dependency-audit or secret-pattern step. | Official action hashes verified by git ls-remote and pinned; npm audit moderate threshold, secret check and weekly Dependabot added. | npm audit reported zero vulnerabilities after removing 53 unused dependency packages. Pattern scan passed; full Git history and provider secret scanning not assessed. |
| S08 Low, verified | Moderator actions had no persistent action record. | Private moderation_events table records actor profile, action, target and timestamp, never message bodies; inaccessible to application roles. | SQL verifies restrict audit record and denied member access. Retention policy and operational review still require an operator decision. |
| S09 Low, verified | HTML responses lacked explicit HTTPS HSTS. | HTTPS HTML now sends max-age=31536000. Script CSP remains self/Turnstile/optional analytics, no unsafe-eval or unsafe-inline script. | Header/source review and local API tests. HSTS cannot be meaningfully exercised over HTTP localhost; inspect deployed HTTPS. Inline styles remain allowed for Motion/Radix positioning. |

## Database inventory and authorization

All exposed tables have RLS enabled and application roles have SELECT only; mutations use explicitly granted RPCs with an empty search_path. Visitor anon has no table SELECT and may call only guest_room_feed. The feed returns at most 30 public-room rows with nickname/avatar/reaction counts; it excludes private conversation messages, Auth IDs, profile IDs and client IDs.

| Object | Read boundary | Write boundary |
| --- | --- | --- |
| industries, rooms | Authenticated members; limited room metadata via guest feed | Operator migrations |
| profiles | Authenticated members; no Auth ID or email column | bootstrap_profile / own profile mutate |
| blocks | Own outgoing blocks only | Own mutate; bidirectional visibility checks |
| dm_requests | Parties, excluding blocks | Opt-in recipient; recipient-only accepted/declined; unique unordered pair |
| conversations | Participants and no block | Accepted request creates atomically; participant closes |
| messages | Public rooms for members or authorized DM participant; blocked sender hidden | Identity-derived sender, bounded text, idempotent client UUID; own deletion |
| reactions | Caller can read referenced message | Same read check; allowed emoji; removed messages reject |
| conversation_reads | Own rows | Participant only |
| reports | Allowlisted moderator | Member creates; moderator resolves; reviewed content only specifically reported message |
| private.identities | No application schema access | Auth UUID to independent profile UUID; account deletion cascades |
| private.moderators, restrictions | No application schema access | Operator allowlist; moderator restrictions |
| private.action_events | No application schema access | Per-profile locked mutation counters |
| private.moderation_events | No application schema access | Moderator RPC only |

RPC inventory: my_profile_id and is_admin return caller-specific state; is_blocked is now participant-scoped; can_converse and can_read_message enforce membership/visibility; bootstrap_profile is idempotent; mutate handles all ordinary writes; moderate/admin_metrics/review_reports enforce private moderator allowlist; list_conversations is SECURITY INVOKER and bounded to 100; guest_room_feed is the sole anon projection. No application role has private schema usage.

## OWASP coverage

| Top 10:2025 | ASVS 5.0 areas | Review result |
| --- | --- | --- |
| A01 Broken Access Control | V8 Authorization, V4 API | RLS/RPC tests; S01 and S03 repaired; no service-role ordinary reads |
| A02 Security Misconfiguration | V3 Web Frontend, V13 Configuration | CSP/headers/config absence; S09; deployment checks outstanding |
| A03 Software Supply Chain Failures | V13, V15 Secure Coding and Architecture | S07; locked dependencies, pinned CI, audit; not a malware audit |
| A04 Cryptographic Failures | V11 Cryptography, V12 Secure Communication | Provider-managed TLS/Auth; no custom crypto or E2EE; HTTPS staging pending |
| A05 Injection | V1 Encoding and Sanitization, V2 Validation | Parameterized database calls, strict schemas, React plaintext, fixture XSS checks |
| A06 Insecure Design | V2, V15 | Consent model, unique pairs, limits, threat model; S04/S06 |
| A07 Authentication Failures | V6 Authentication, V7 Sessions, V9 Tokens | getUser token verification; guest never auto-signs-in; CAPTCHA/linked recovery require real provider tests |
| A08 Software or Data Integrity Failures | V15, V13 | Immutable action pins, atomic mutations/idempotency; CI attestations not added |
| A09 Security Logging and Alerting Failures | V16 Logging and Error Handling | S08, body/token-free errors; operational alerting/retention unconfigured |
| A10 Mishandling of Exceptional Conditions | V16, V2 | 413/400/401/403/429/503 paths, generic unexpected errors, unavailable/offline UI |

## Release gates and honest limits

Anonymous Auth users and linked users deliberately share the authenticated content permissions; [Supabase documents this distinction](https://supabase.com/docs/guides/auth/auth-anonymous). Local tests exercise separate identities, unauthorized visitor, participant/outsider and moderator allowlist. They do not prove real Auth issuance, CAPTCHA, email linking, JWT expiry or Realtime delivery.

Run the live two-account test against a disposable staging project, then test linked user recovery, expired/revoked tokens, block while subscribed, unrelated DM subscriptions, simultaneous accept/block/close and account deletion. RLS blocks future authorized reads; the app revalidates visible message queries every 30 seconds and hides errored history. [Supabase sessions](https://supabase.com/docs/guides/auth/sessions) use short-lived access tokens; sign-out must not be described as immediate universal JWT invalidation.

[Cloudflare rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) is approximate per location. It is supplementary, not a strict global quota. Confirm binding availability and namespaces in the deployment account; enable Supabase CAPTCHA and signup limits before launch. Shared IPs may throttle multiple legitimate users. Unlimited identities, distributed scraping, provider free-tier exhaustion and already-delivered content remain residual risks.

No production credential, database migration or deployment was performed. Publish an operator privacy contact, moderation workflow and retention schedule before public launch. Reports and minimal moderation records currently have no automatic expiry; provider backup/log retention is external configuration. The public privacy copy states these limitations.
