# Community redesign and provider setup

## Design sources — checked 8 November 2026

Among the directly checked repositories, [Taste Skill](https://github.com/Leonxlnx/taste-skill) had approximately 111.8k stars, [Impeccable](https://github.com/pbakaus/impeccable) 106k, [Hallmark](https://github.com/Nutlope/hallmark) 50.6k, and [Anti-Slop](https://github.com/miqdadbadjuber/anti-slop) 8.6k. Counts change. This is a comparison of these relevant repositories, not an exhaustive ranking.

Selected Taste Skill's design-system recommendations: consistent edges and spacing, readable type, restrained emphasis, and showing the actual product. Used Impeccable's operate/read distinction to favor a usable community workspace over a promotional card grid. These are referenced recommendations; no repository scripts were installed or executed. Wensity informed the restrained hierarchy and spacing, without copying its branding. There is no meaningful guarantee of passing every AI-design detector.

The public view now has a room navigation rail, a central conversation, and a quiet community context column. Mobile collapses navigation into a horizontal room list. The actual feed remains authoritative: no fabricated live users or activity.

## Internal testing only

Run `npm run test:internal`. The runner starts an isolated server on port 5175, creates two test browser sessions through a test-only endpoint, then stops the server. The normal preview on port 5174 has no demo controls or test data.

Tests use a fresh in-memory PGlite database with the real migrations, authenticated SQL roles and production mutation functions. Reload persistence is tested within the run; fixture data is discarded when the server stops. Test sessions use HttpOnly, SameSite cookies. Updates poll every two seconds; this does not test Supabase Realtime. Account deletion authorization is covered separately by database tests.

Test middleware is loaded only by Vite's explicit test mode. Ordinary development and production never register its endpoints. The production backend remains Cloudflare Workers + Supabase, with bearer authentication, RLS, rate limits, CAPTCHA and explicit private-chat consent.

## Connect the production service

1. Create a Supabase project. Apply all files in `supabase/migrations` in filename order, then `supabase/seed.sql`. Use the Supabase CLI migrations workflow for future updates.
2. Copy `.env.example` to ignored `.env.local` and fill in the project URL, publishable key and Turnstile site key. Copy `.dev.vars.example` to ignored `.dev.vars` for local Worker values. Put the service-role key only in server secrets; it is used for account deletion, never browser configuration.
3. In Supabase Auth, enable anonymous sign-in and the email provider. Enable **Confirm email** and secure email changes. Configure a production SMTP sender and verified sending domain. Configure Turnstile in Auth with the secret key; the browser receives only its site key.
4. In Auth > Email templates > Magic Link, include the token: `<p>Your verification code is {{ .Token }}</p>`. The /recover screen sends an OTP and calls verifyOtp with type email. A successful send does not establish a session; only verification does. Use the confirmation-link template for email changes so anonymous users keep the same identity when linking from Settings. Configure OTP expiry and rate limits in Supabase.
5. Set Auth Site URL to your HTTPS production origin and allow its exact `/app/settings` redirect, plus local development redirects as needed. Avoid wildcard production redirects.
6. Create a Google Cloud OAuth consent screen and Web application OAuth client. Set authorized origins to your app origins. Set the authorized redirect URI to the Supabase callback shown in Auth > Google, normally `https://PROJECT.supabase.co/auth/v1/callback`. Enter the Google client ID and secret in Supabase's Google provider configuration. Never put the client secret in a VITE variable. Publish the consent screen or add test users while it is in testing.
7. Set Cloudflare Worker secrets from the server environment example and deploy the build. Verify allowed origins, TLS, custom SMTP delivery, CAPTCHA, and rate limits before opening registration.

Official references: [Google auth](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Live acceptance checks still required

Provider credentials are not configured here. Real Google redirects, email delivery, expired/reused OTP rejection, anonymous account email conversion, production Realtime and remote deployment must be tested against the configured project. The local demo is not evidence that external providers are configured.

## Verification for this revision

- Production TypeScript/Vite build passed. Wrangler could not write its external diagnostic log in the sandbox; build artifacts completed successfully.
- 50 existing unit/database tests passed; two new authentication UI tests passed (52 total).
- Five public browser tests passed, covering guest behavior, SSR, mobile reflow, theme persistence and accessibility.
- The two-identity demo browser test passed: session switching, UI message sending, persistence after reload, reactions, recipient-only DM acceptance, private messages, blocking, Settings, responsive layout and accessibility.
- Production output was searched for demo session paths, cookie names and fixture identities: none were present.
- Real-provider end-to-end verification remains pending provider configuration, as described above.
