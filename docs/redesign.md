# Peak Unemployment — Offbeat Social redesign

## 1. Previous design audit

The old homepage foregrounded purple glass styling, a 3D decorative scene, large marketing sections and a fictional conversation preview. Visitors could not read the real community before onboarding. The visible shortened wordmark conflicted with the official name. Typography, copy and themes felt disconnected from a messaging product. Client-only public content and generic metadata limited search visibility.

## 2. Implemented changes

The existing repository, Auth flow, database/RLS and private-chat permissions are retained. The homepage now puts public conversation beside a concise introduction. Shared design tokens cover public pages, onboarding, member rooms, inbox, profiles, settings and moderation. Private chat retains a softer bubble treatment; public messages use compact rows.

## 3. Final palette and typography

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | #F7F7F2 | #101318 |
| Surface | #FFFFFF | #1C2028 |
| Elevated/muted surface | #F0F1ED | #252B35 |
| Primary text | #181A20 | #F7F8F5 |
| Secondary text | #626775 | #B8C0CC |
| Link/focus blue | #3558E8 | #8BA2FF |
| Primary button / label | #3558E8 / #FFFFFF | #3558E8 / #FFFFFF |
| Coral decoration | #E85249 | #FB8B80 |
| Coral text | #BA332B | #FB8B80 |
| Lime / label | #C7F36B / #27370E | #C7F36B / #27370E |
| Subtle border | #E2E3E5 | #39414D |
| Interactive boundary | #858994 | #8993A3 |
| Soft blue | #EDF1FF | #26304A |
| Soft coral | #FFF0EB | #3A2525 |

Decorative borders need not carry control affordance: controls use a stronger boundary token. Text combinations are tested at 4.5:1 and interactive boundaries at 3:1. Space Grotesk headings and Inter body fonts are self-hosted variable Latin WOFF2 files with OFL licenses. Font sizes use relative units so text resizing works.

## 4. Original logo

Three vector concepts were explored in [the concept sheet](brand/concepts.png). The selected offset speech shapes combine a conversation pair with a negative-space peak. It has a compact silhouette, works at small sizes, and supports a single-color version. The full wordmark deliberately stacks the official name; exported text is outlined.

Assets in `public/brand`: `icon-light.svg`, `icon-dark.svg`, `icon-mono.svg`, `wordmark-light.svg`, `wordmark-dark.svg`, `wordmark-mono.svg`, `app-icon.svg`, `app-icon.png` (512px), `social-share.svg`, `social-share.png` (1200×630). The favicon is `public/favicon.svg`; the manifest uses the full name. Original SVG geometry and local font conversion only; no remote image generator.

## 5. Homepage layout

The desktop introduction is about 40% and chat about 60%, with the conversation above the fold. On mobile, a compact header, short headline and join action lead directly into chat within the first viewport. The directory follows the conversation. There are no testimonials, fabricated counts, giant decorative blobs or placeholder chat activity.

## 6. Copy

“Job hunting is weird. Talk about it.” leads the page. Actions use “Join anonymously,” “Browse rooms,” and “Write a message…”. Empty rooms say “Quiet in here. Someone has to start.” Unconfigured service, empty data, loading and offline states are distinct. Member settings and consent use direct language. Public visibility and the limits of blocking are explained alongside the relevant controls.

## 7. Guest conversation

The new guest-only `guest_room_feed` SQL function projects public messages, display nicknames/avatars and aggregate reactions. It excludes Auth IDs, profile IDs, client idempotency IDs, private fields, DM messages and reaction identities. Existing table grants and authenticated RLS remain intact. Cursor pages contain at most 30 messages; the guest view retains at most 120.

The Worker uses only its publishable key, never a caller token or service-role credential, for this endpoint. Visible online guest tabs poll every 15 seconds, with a 10-second shared-cache directive. They create no Auth accounts or Realtime subscriptions. Member chat retains its authenticated Realtime subscription. Joining, posting and reacting remain intentional. Public posts remain public when an account signs out.

## 8. SEO

Public descriptions and information pages are rendered by the Worker before JavaScript. The same shared components supply client content. Private pages use noindex headers and metadata. Unknown paths return real 404s. Route-specific titles, descriptions, canonical links, OG/Twitter images, robots, sitemap and factual Organization/WebSite structured data are present. Configure the real origin with SITE_URL and VITE_SITE_URL.

Live messages are fetched separately and never injected into server HTML. APIs carry noindex/nosnippet; feed regions use data-nosnippet. These are crawler controls, not confidentiality guarantees for public messages. No guest Realtime channels are opened by rendering crawlers.

## 9. Accessibility and responsive behavior

Visible focus, skip links, semantic landmarks/headings, named icon controls, scrollable history, keyboard dialogs with Escape and restored focus, explicit input labels, disabled states, and optional polite new-message notices are implemented. Initial/older history is not announced. Reduced motion follows the system preference and a saved setting.

Checks cover 320, 375, 390, 430, 768, 1280, 1440 and 1920 CSS pixels, 200% text resizing, and 320px reflow equivalent to a 1280px viewport at 400% browser zoom. This is not a claim that every OS screen-reader/mobile-keyboard combination was manually certified. Screenshots at 390, 768 and 1440 are in `docs/screenshots`.

## 10. Measured Lighthouse results

See [verification](verification.md) and the HTML/JSON reports in `docs/audits`. Audits use the local production Worker with mobile simulated throttling and no Supabase credentials. These are real lab results, not invented production scores or field INP. Informational documents need no React download; interactive pages paint server HTML before loading the app. Fonts are local; member chat and join UI are lazy-loaded. No 3D code is loaded.

## 11. Tests

The automated suite covers SQL grants/RLS/consent/rates, guest field privacy and pagination, Worker authentication/SEO/status headers, text safety, retries, contrast, announcements, responsive layout, room context and gated joining. Public fixture data exists only inside an explicit intercepted browser test. Full results and reproduction commands are in [verification](verification.md).

## 12. Remaining external work

No credentials were supplied and no cloud deployment was performed. Apply all migrations, configure Supabase anonymous Auth/Turnstile/Realtime, and run the isolated two-session live suite before claiming hosted message delivery works. Verify email recovery, deployed CSP/cache/compression/robots/canonical URLs, moderation operations and mobile keyboards. Publish the operator contact/retention policy and adapt the legal copy before public launch. Measure actual field INP and load; registration targets are not concurrent-user guarantees.
