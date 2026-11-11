# Backend release status

Implemented source, not a deployed/live-certified service. External provider setup is still required.

## Included

- Existing Hono/Cloudflare architecture retained, plus an optional Vercel Node entry for the same API. No Express rewrite or Socket.IO server.
- Google OAuth entry/callback, password signup/login, email verification gate, resend cooldown, password recovery/reset, current-password verification and secure-change nonce UI, session restoration and sign-out.
- Normalized, reserved-name-aware usernames; 400 ms debounced database checks, checked suggestions, database uniqueness, rename cooldown and conflict suggestions.
- Atomic onboarding, database-backed industry/profession options, separate display names, bio/mood/status, profile visibility, full /u/:username pages and chat profile cards.
- Client crop/reposition/compression; server JPEG decoding and metadata-stripping re-encoding; Storage upload/removal/replacement; owner-derived paths, upload leases and cleanup queue.
- Private employment status/history with explicit sharing, month-only dates, no overlaps/future dates, editing/deletion and duration display.
- Existing rooms, reactions, reporting, blocking and opt-in private messages retained. Signed-in chat author summaries join lightweight avatar/display-name fields without per-message profile fetches.
- Production demo fallback removed. Only explicit development demo configuration enables fixtures; new account/profile operations always require real services.

## References and operating docs

- [Architecture](backend-architecture.md)
- [Schema, API and storage](database-schema.md)
- [Google, SMTP, password and local Mailpit setup](authentication.md)
- [Free deployment, secrets and rollback](backend-deployment.md)

## Tests and limits

The PostgreSQL test environment runs actual SQL migrations/RLS/RPCs in PGlite with an auth schema fixture. It is not Supabase's live Auth/Storage services. Auth UI unit tests mock the official SDK and test signup/cooldown, reset-session gating, neutral recovery responses, unconfigured email handling and redirect constraints. Image tests decode real JPEG data and reject spoofed/oversized/wrong-aspect inputs. Existing integration tests continue to cover chat/DM boundaries.

Live Google consent/returning-user flow, delivered SMTP emails, hosted Storage round trips, deployed Vercel forwarding, and real two-browser sessions remain unverified. No credentials were supplied. Docker and Supabase CLI were not found, so the full local Auth/Mailpit stack was not run. Browser review remains blocked by the previously reported saved browser permission/managed policy; no bypass was used.

Google profile photos are deliberately not imported automatically. Users can upload an image themselves; a one-click Google-photo import is not implemented. Existing anonymous-to-email linking is preserved; no new automatic cross-provider account merge is implemented. Public guests currently retain the lightweight generated avatar in room previews; uploaded avatars appear in signed-in chat/profile views when profile visibility allows them.

Deployment is not complete until an operator configures providers, applies migrations to the intended database, runs the real acceptance checklist, and authorizes release. No claim is made that 500–1,000 users fit every free-tier quota.

## Real acceptance checklist after setup

1. Start a disposable Supabase stack, run all migrations, verify each user's mail in Mailpit, and confirm unverified accounts cannot write via API or direct RPC.
2. Run two isolated browser sessions: register A by email, verify, claim username, complete onboarding and upload/remove media. Register B with Google, reject A's handle, choose a checked suggestion, and verify the same account returns on later Google login.
3. Try direct cross-account writes and Storage upload/delete attempts; verify denied results. Test private/public/member visibility and confirm hidden history never appears in API responses.
4. Send/reload/react to public messages; accept/decline/block private requests. Confirm no DM message access without an accepted request.
5. Test expired/cancelled callbacks, reset links, secure password change, account linking and account deletion, including queued object cleanup.
6. Check mobile/desktop forms, keyboard access, image cropping and loading/error states. Inspect provider quotas and deploy only after these checks pass.

## Latest verification — 2026-11-10

- `npm test`: **81 passed across 15 files**.
- `npm run lint`: passed.
- `npm run build`: TypeScript and both Worker/client Vite builds passed.
- `node scripts/check-secrets.mjs`: passed on 156 nonignored source files; limited pattern scan, not a full credential audit.
- `git diff --check`: passed (line-ending notices only).
- `npm run setup`: correctly reported missing Supabase client/server keys and Turnstile site key; existing ignored environment files were preserved.

Storage-policy tests use a PostgreSQL storage-schema fixture, including a deliberately broad existing policy, and prove that restrictive profile-media policies prevent direct writes. Hosted Storage HTTP behavior still requires the live acceptance checks above.
