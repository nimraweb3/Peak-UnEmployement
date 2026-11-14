# Security review — 2026-11-13

Scope: Hono authentication middleware and routes; Supabase migrations and existing PostgreSQL authorization tests; profile/image processing; frontend rendering; redirect handling; deployment allowlist; tracked files and Git history. Reference: [OWASP ASVS 5.0](https://asvs.owasp.org/) authentication and authorization requirements. This is a targeted engineering review, not ASVS certification or a penetration test.

## Confirmed changes

- Post-auth destinations are allowlisted application routes; public room intent maps to `/app/rooms/:slug`. External/protocol-relative/unknown paths fall back to the lounge.
- Added migration `202611130001_username_cooldown`: the existing database trigger now rejects changes within a rolling 30 days, retaining existing timestamps. An authenticated owner-only RPC supplies the next-change date. The API provides a specific cooldown message; the UI is advisory, not the enforcement boundary.
- Applied this migration transactionally through the Supabase dashboard and recorded its exact SQL in the migration ledger. Boundary tests reject 29 days, accept 30 days plus one second, and reject immediate subsequent changes.
- Closed conversation send handlers now also guard keyboard submissions.
- Updated privacy text to identify the actual Vercel host.

## Existing protections retained and tested

The API validates tokens with Supabase getUser; nonanonymous users require confirmed email. Anonymous users are authenticated principals, not guests. RLS and definer-function authorization isolate private employment records and conversations; direct client writes are revoked. Tests cover cross-user permissions, opt-in DM requests, blocking, duplicate reaction protection, message ownership, input limits, HTML rendered as text, storage ownership, validated/re-encoded JPEG uploads, and deletion cleanup queues.

`npm audit --json`: zero reported vulnerabilities. A targeted pattern scan examined 163 tracked files and 933 reachable Git objects: no matching Supabase secret keys, Google OAuth client secrets or private-key headers. This is not an exhaustive Gitleaks-equivalent scan; arbitrary passwords and other provider token formats are outside that check. Secret values were not printed.

`.gitignore` keeps local envs, `.secrets`, build output, deployment upload packages and generated test evidence out of Git. Removed blanket exclusions for useful agent instructions, attribution/configuration and design documentation. Existing lockfile, migrations and source remain tracked. Adding ignore rules does not erase history.

## Remaining limitations

SMTP is unconfigured; email signup/recovery remain disabled. Personal Google consent testing was explicitly skipped. Vercel has no equivalent of the optional Cloudflare NETWORK_LIMITER binding in this deployment; database action limits and request body limits remain active. Scheduled media cleanup and broader abuse monitoring remain launch work. No blanket production-readiness or complete WCAG/security compliance claim is made.
