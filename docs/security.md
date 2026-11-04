# Security model and verification

## Enforced boundaries

- Supabase verifies Turnstile during signup; the browser passes the token through `signInAnonymously({options:{captchaToken}})`. CAPTCHA must be enabled in the Supabase dashboard, not merely shown in the UI.
- Every protected Worker route verifies a bearer token with Supabase Auth. Normal operations retain the user JWT and RLS. Same-origin APIs do not enable permissive CORS and never use session cookies for API authorization.
- No service key is bundled into Vite. Only the account-deletion endpoint uses the server credential, with the user ID supplied by verified Auth rather than the request body.
- Clients cannot directly INSERT/UPDATE/DELETE tables. RPCs enforce permissions even for malicious direct Supabase requests.
- Public UUIDs and nicknames are independent of Auth UUIDs. Email is only in Auth. The `private` schema is not exposed through the Data API.
- Private messages require an accepted pair, active conversation, participant membership, and no block in either direction. Requests contain no unsolicited body. Disabling requests preserves accepted conversations.
- Message sender, timestamp and server ID are generated/derived server-side. A client UUID is only an idempotency key, not an authorization credential.
- A sender row lock serializes rate checks with writes: at most 5 messages/10 seconds and 60/minute, plus 120 total mutations/minute. Repeated bodies are rejected for 30 seconds. One HTTP(S) link per message; 1,000-character maximum. SQL repeats critical validation.
- React renders text without HTML injection or rich-link unfurling. Static security headers include CSP, framing restrictions, MIME sniffing protection, and disabled camera/microphone/geolocation. If using a custom Supabase domain, amend CSP deliberately.
- Reports are private. Admin authority is stored in `private.moderators`; editable profile data and JWT user metadata do not confer access. Report review exposes only the reported content to moderators.
- Deleted messages have the stored body cleared. Account deletion cascades data. Provider backups/logs can have their own retention and must be disclosed.

## Tested locally

Real SQL tests cover direct write denial, private schema denial, identity separation, profile creation, sender impersonation resistance, forbidden deletion, DM disabled rejection, duplicate requests, recipient-only acceptance, stranger read/write denial, existing chats after toggle-off, reports visibility, block enforcement, link/length/duplicate limits, atomic rate rules, soft deletion, and account cleanup.

Worker tests cover configuration reporting, missing/invalid bearer tokens, unavailable configuration, and schema rejection before writing. The default browser suite verifies the public UI and route guards without inventing a production session.

## External validation still required

Run the isolated-project live suite and manually verify Turnstile expiration/rejection, optional email linking and sign-in on another device, RLS-protected Realtime with a third session, actual concurrent sends, reconnect behavior, and account deletion. Review Supabase grants with its security advisor. Measure Worker CPU and database load under a realistic small concurrent audience before advertising capacity.

Messages are not end-to-end encrypted. Operators with database access can inspect stored data. Blocking cannot erase screenshots or content already delivered to another browser. Account restriction does not stop determined users from creating new accounts; abuse response needs operator review and provider controls.

## Operational responsibilities

Provide a moderation contact and schedule, adapt legal copy, publish retention, configure recovery email delivery, protect operator accounts, review logs without storing chat bodies, and keep secrets out of commits. No automatic public deployment, billing change, external messages or paid service provisioning is performed by this repository.

The minimatch override pins 11.0.1 to address [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) in the development lint dependency graph. Lint, type checks and tests are rerun with the override. Do not blindly run `npm audit fix --force`, which can downgrade incompatible lint packages.


## Guest-read redesign

`202611030001_guest_read.sql` grants only the anon-role public feed RPC. Guest SELECT on messages/profiles/private identities and guest mutation remain denied in PostgreSQL tests. Projection tests cover field allowlists, private-message exclusion, deleted-body clearing and disjoint bounded pagination. The Worker never forwards a guest-supplied bearer token to this RPC. `/api/*` responses carry noindex/nofollow/nosnippet. Public content is still public when a blocked member signs out; the UI and privacy page explain this boundary.

Lighthouse is pinned to 13.5.0 because 13.6.0 introduced a vulnerable development-only glob dependency chain. The installed dependency tree passed npm audit after that change.
