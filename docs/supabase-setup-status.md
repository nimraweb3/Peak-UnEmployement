# Supabase setup status — 2026-11-11

Update 2026-11-13: the [backend and authentication configuration are deployed](backend-live.md). Google OAuth, Turnstile, and anonymous sign-in are configured. SMTP, full sign-in acceptance tests, and scheduled media cleanup remain outstanding.

Project: `peak-unemployment` (`eedxbddfpwfalyvavzsg`), free Peak Unemployment organization, Northeast Asia (Seoul). The user created the database password; it was not collected in chat.

## Completed

- Confirmed the new public schema was empty before applying changes.
- Applied all six repository migrations in one successful transaction through the dashboard SQL editor because the Supabase connector was unavailable.
- Recorded the six applied versions, names, and source SQL in `supabase_migrations.schema_migrations`. Do not rerun these migrations manually.
- Applied `supabase/seed.sql`: 10 rooms, with 37 professions from the account migration.
- Verified 14 public tables and zero public tables without RLS; verified the profile-media bucket exists.
- Saved the project URL and publishable key in ignored `.env.local` and `.dev.vars`. The existing secret API key is stored only in `.dev.vars` under the compatibility variable `SUPABASE_SERVICE_ROLE_KEY`; it is a modern secret key, not a legacy JWT key.
- Verified both environment files are ignored by Git.
- Live public `guest_room_feed('lounge')` and server-only `media_cleanup_batch()` calls succeeded.
- Direct room-table access using the public key remains denied, as designed. The server secret also has no blanket table grant; its required cleanup RPC succeeded.
- Confirmed email verification is required. Enabled secure password change and set the minimum password length to 12 in the dashboard.
- Set the Site URL to `https://peak-unemployment.vercel.app` after the frontend deployment. Allowed its `/auth/callback**` URL and retained development callbacks at ports 5173 and 5174.

## Still required before launch

- Complete live anonymous onboarding and Google callback acceptance tests. Turnstile renders successfully, tokenless signup is rejected, and the Google button reaches the account chooser.
- Configure SMTP and verify delivery before setting `VITE_EMAIL_AUTH_ENABLED=true`. No email delivery or Google sign-in is claimed tested.
- Schedule media cleanup. The full-stack Vercel deployment is active; no proxy secret is required for that architecture.
- Run the real two-user authentication, chat, profile, upload, and account-deletion acceptance tests after provider setup.

`VITE_TURNSTILE_SITE_KEY` is now present locally and included in the deployed frontend. Presence checks alone do not establish OAuth, SMTP, CAPTCHA, or deployment readiness.

The earlier local checks passed 81 tests, lint, and build. This setup session ran live API checks, not browser end-to-end app tests.
