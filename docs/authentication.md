# Authentication and provider setup

## Implemented flows

`/auth` supports password sign-in, email/password signup, verification resend (60-second UI cooldown), forgot password and recovery-only password reset. Supabase handles passwords, email tokens, sessions and PKCE; the app does not implement its own token store. `/auth/callback` restores the session, preserves approved local room destinations and sends new users through onboarding. OAuth errors/cancellation and expired links have a retry path. Open PKCE links in the browser that requested them.

Google sign-in requests the standard provider login only. Google email, name and photo are not copied to public profiles. Public IDs are independent of Auth IDs. Anonymous-to-email linking still uses the existing Supabase updateUser flow with confirmation; no custom merge is performed. Google-only accounts receive a verified password-setup link option rather than a current-password form. Existing email/password accounts verify their current password before changing it; secure-change nonce controls are supported.

The Worker verifies access tokens with getUser. Nonanonymous accounts need a confirmed email. PostgreSQL repeats that rule using the actual auth.users row; bypassing the Worker cannot bypass verification. Public room reading remains available without an account. Password-reset UI requires a PASSWORD_RECOVERY auth event, not merely a query parameter.

## Google

1. Create a Google OAuth web client and configure consent for this application; while in testing, add authorized test users.
2. In Supabase Auth → Providers → Google, enter its client ID and secret. These belong in Supabase, never Vite variables.
3. Add the exact Supabase callback displayed by that provider to Google's authorized redirect URIs (normally https://PROJECT.supabase.co/auth/v1/callback).
4. Set Supabase Site URL to the frontend HTTPS origin. Allow the frontend /auth/callback URL, including intended query parameters; use a narrowly scoped callback wildcard if required by Supabase redirect matching. Add local callbacks for localhost/127.0.0.1 and the actual development port. Do not allow arbitrary origins.
5. Test cancelled consent, first login, returning login and a deep-linked room using two separate accounts.

Reference: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Email and SMTP

Email registration/recovery is explicitly unavailable until VITE_EMAIL_AUTH_ENABLED=true. Password login and Google are independent of that switch. The switch is a UX configuration flag, not authorization: enable confirmations and anti-abuse controls in Supabase itself.

Brevo's published Free plan currently allows 300 sends/day across the account. Create and approve the sender, then use the SMTP host/port/login/key supplied by Brevo in Supabase Auth → SMTP. Keep the SMTP key in the provider dashboard. Authenticate a domain you control with its required DNS records. A gmail.com-style sender cannot authenticate that domain; do not claim a verified-domain setup if you do not own one. Account approval/deliverability are external blockers, not code fixes. Do not purchase a domain or enable a paid tier automatically.

Keep Supabase email confirmations enabled, password minimum 12, secure password changes, double-confirm email changes, resend throttling, and Turnstile. Set redirect allowlists and test signup, resend, reset and nonce emails before enabling the frontend flag. Do not rely on Supabase's restricted default sender for a public launch.

Sources checked 2026-11-10: [Brevo Free limits](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [domain requirements](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Local Auth testing

Install Docker and Supabase CLI using their official instructions, then run `npx supabase start`. Apply migrations to the disposable local database with `npx supabase db reset` (never run reset against production). Use `npx supabase status` to obtain the local URL, publishable key and Mailpit URL. Place server secrets in .dev.vars and public settings in .env.local; both are ignored. Use local Auth with Mailpit and email confirmation enabled; no external SMTP is needed. See [Supabase password/Mailpit guide](https://supabase.com/docs/guides/auth/passwords).

Docker and Supabase CLI were not available in this session. Live Google, SMTP and local Auth server flows have not been certified. Unit tests exercise provider calls and error states with mocks; PostgreSQL tests exercise real authorization logic separately.
