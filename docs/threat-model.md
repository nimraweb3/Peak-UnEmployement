# Threat model — 2026-11-04

Assets: private conversation bodies; Auth tokens and recovery email; separate public profile identity; consent/block state; reports and moderator privileges; database/Worker credentials; availability and free-tier quotas.

Actors: unauthenticated visitor (Postgres anon); two independent anonymous Auth users (Postgres authenticated); linked member (same content permissions); allowlisted moderator; infrastructure/database operator; abusive client calling REST/RPC directly. Anonymous Auth is an account, not the anon API role.

Trust boundaries: browser → Worker (Bearer token verified by Auth getUser); browser → Supabase Auth (CAPTCHA/provider limits); browser → PostgREST/Realtime (JWT + RLS); Worker → PostgREST with the caller token; deletion endpoint → Auth admin API with a server-only service key. Public feed uses the anon credential with one narrow projection RPC. No service key is used for ordinary reads or writes.

| Threat | Control | Remaining exposure |
| --- | --- | --- |
| Sender/role spoofing, DM ID guessing | UUID validation, derived identity, RLS, restricted definer RPCs | Live deployment grants must match migrations |
| Concurrent consent changes | Global consent transaction lock, participant locks, unique pair constraints | Multi-connection stress/Realtime delivery still requires staging |
| Public harassment and scraping | Reporting/blocking, bounded feed, atomic user limits, coarse edge limiter | Public posts remain readable while logged out; no global anti-scraping guarantee |
| Many new anonymous identities | Intentional join, Turnstile integration, Supabase signup limits | Provider configuration and distributed bot resistance are not verified locally |
| Stored script/URL injection | React text rendering, strict schemas, no rich HTML/autolinks, script CSP | Browser storage tokens remain sensitive to any future same-origin XSS |
| Account switch / revoked consent | Query cache and channels cleared on identity change; visible chat refresh every 30s; error hides history | Previously delivered content cannot be recalled; JWT revocation is not instantaneous |
| Dependency or CI compromise | Lockfile, audit check, verified action SHAs, read-only CI token, secret patterns | Pattern scanning is not full secret-history or malware detection |
| Moderator misuse | Private allowlist, minimal private action audit, report-scoped review | DB owners can read stored data; no E2EE |

The app has no uploads, server-side URL fetching, payment processing, WebRTC, AI conversation processing, custom password hashing or cookie-authenticated API. CSRF via ambient API cookies is therefore not the current authentication model. CORS is not used as an authorization boundary. Messages are not sent in analytics or error logs. Review the model when any of these assumptions changes.
