# Peak Unemployment

**Job hunting is weird. Talk about it.** An anonymous community for people between jobs, with public rooms and consent-based private conversations.

This is the existing React/Hono/Supabase application, redesigned around the conversation. It is **not deployed**. The preview honestly shows an unavailable-service state until Supabase is configured; no production messages, member counts or online activity are fabricated.

## Run locally

```sh
npm ci
npm run dev
```

Open the Vite URL, normally http://127.0.0.1:5173/. To enable real conversations, fill your own `.env` and `.dev.vars` from the example files, enable anonymous Auth and Turnstile, apply **all** migrations and seed rooms, then restart Vite. Never commit filled environment files.

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --include-seed
```

Set both `SITE_URL` and `VITE_SITE_URL` to the actual production HTTPS origin before deployment. See [deployment](docs/deployment.md) and [database operations](docs/database.md).

## What is implemented

- Offbeat Social: warm-white light theme, coordinated dark mode, local Space Grotesk/Inter fonts and original conversation/peak branding.
- Chat-first homepage and public industry rooms. Guests read a narrow 30-row database projection, with visible-tab 15-second polling and bounded history. Browsing never creates an Auth account.
- Context-preserving four-step join dialog: nickname, industry, optional situation and DM requests off by default. Successful joining focuses the composer.
- Existing authenticated realtime messages, reactions, own-message deletion, history, pending/retry behavior, profile/settings, recovery, reports, blocks and moderation.
- Private conversations require accepted requests, participant membership and no block. These checks remain enforced in PostgreSQL.
- Server-rendered public descriptions and information pages; canonical/OG/Twitter metadata, robots, sitemap, accurate structured data, real 404s and private-route noindex headers. User messages are never rendered into crawler-facing HTML.
- Keyboard-accessible dialogs, focus restoration, contrast-tested tokens, responsive reflow and optional polite message announcements. The message history is not one noisy live region.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

The normal browser suite expects an unconfigured local installation. Explicitly isolated request fixtures test empty/populated guest rendering; production does not include those fixtures. The separate live two-session suite needs `LIVE_E2E=1` and an isolated Supabase test project. It is skipped until credentials exist.

For real local mobile Lighthouse reports:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# In another terminal:
node scripts/audit.mjs
```

Results, limitations and links to reports: [verification](docs/verification.md). Design decisions, complete palette and assets: [redesign report](docs/redesign.md).

## Preview and brand assets

Actual screenshots: [390px](docs/screenshots/redesign-390.png), [768px](docs/screenshots/redesign-768.png), [1440px](docs/screenshots/redesign-1440.png), [dark desktop](docs/screenshots/redesign-dark-desktop.png), [join dialog](docs/screenshots/redesign-join.png). These show the real unconfigured app, not fabricated community activity. Earlier screenshots are historical references.

Original vectors, outlined wordmarks, app icon and social image: [public/brand](public/brand). [Concept exploration](docs/brand/concepts.png) and [font licenses](public/fonts). To regenerate assets, prepare the local TTF using `scripts/prepare-brand.py` (FontTools + Brotli), then run `node scripts/generate-brand.mjs`.

## Architecture and deployment

React/Vite/TypeScript, Hono on Cloudflare Workers, Supabase Auth/PostgreSQL/Realtime, TanStack Query, Radix dialogs, Motion for member message entry, Vitest/PGlite/Playwright. The old 3D component is unused and absent from the production bundle. No always-on Node server, paid chat provider or AI API is required.

[Architecture](docs/architecture.md) · [Security](docs/security.md) · [Deployment](docs/deployment.md) · [Database](docs/database.md)

After live validation and environment setup:

```sh
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SITE_URL
npm run deploy
```

No deployment, cloud provisioning or billing change was performed. The service secret is server-only and used exclusively for self-account deletion. Private messages are not end-to-end encrypted. Blocking protects signed-in interactions, but deliberately public posts remain readable as a guest. Before public launch, complete hosted Auth/Realtime/email checks, publish operator contacts and retention, review the legal text and measure real load/costs. Field INP has not been measured.
