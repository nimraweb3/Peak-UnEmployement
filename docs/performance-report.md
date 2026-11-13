# Performance report — 2026-11-08

Actual Lighthouse 13.5.0 results from the local production Vite/Cloudflare preview at 127.0.0.1:4173. Chromium ran headlessly with Lighthouse mobile and desktop simulated throttling. Supabase was unconfigured, so these measure the honest unavailable-chat state, not a working remote service. Repeat runs disable storage reset; they are repeat navigations in the same browser, not a guarantee of a fully warm production CDN.

## Recorded results

| Page / mode | Performance | Accessibility | Best practices | SEO | FCP (s) | LCP (s) | TBT (ms) | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| homepage / mobile | 70 | 100 | 96 | 100 | 1.92 | 4.82 | 443 | 0.0000 |
| public-room / mobile | 60 | 100 | 96 | 100 | 1.35 | 4.39 | 1329 | 0.0000 |
| privacy / mobile | 98 | 100 | 100 | 100 | 1.84 | 1.99 | 0 | 0.0000 |
| homepage / desktop | 100 | 100 | 96 | 100 | 0.56 | 0.56 | 70 | 0.0003 |
| public-room / desktop | 90 | 100 | 96 | 100 | 0.51 | 1.09 | 221 | 0.0005 |
| privacy / desktop | 100 | 100 | 100 | 100 | 0.50 | 0.50 | 0 | 0.0000 |
| homepage / mobile-repeat | 79 | 100 | 96 | 100 | 1.07 | 3.63 | 435 | 0.0065 |
| homepage / desktop-repeat | 49 | 100 | 96 | 100 | 2.01 | 2.63 | 590 | 0.0003 |

Raw evidence: `docs/audits/after-hours-lighthouse-summary.json` and matching `after-hours-{mode}-{page}.html` / `.json` reports. The earlier November 4 baseline is retained separately. Do not substitute an earlier higher score for the latest results.

## Targets and limitations

Target: performance >=90, accessibility/best-practices/SEO >=95, LCP <=2.5s, CLS <=0.1. Accessibility, best-practices, SEO and CLS meet these numerical targets in this run. Cold desktop pages meet the performance target; mobile chat pages and the desktop repeat run do not. The repeat desktop run deteriorated substantially despite the smaller asset workload, showing that results are variable on this shared Windows host. A precise cause for that variance was not isolated. Performance acceptance is still open; this report does not claim success by discounting the slower samples.

TBT is a laboratory metric, not INP. No field INP or real-user percentile data exists for this undeployed build. The <=200ms field INP target is unverified. Best-practices 96 on chat pages includes the expected 503 console response from an unconfigured backend. No successful response was fabricated to improve the score.

## Changes and bundle evidence

The main client chunk decreased from approximately 297.85KB / 92.78KB gzip to 264.78KB / 84.23KB gzip by loading notifications only when a session exists. This is the main chunk, not the complete initial transfer. CSS is 49.88KB / 10.84KB gzip. Member chat/Motion is a lazy 143.54KB / 48.45KB gzip chunk. Join, dialogs, settings and inbox are separate chunks. The unused Three.js stack was removed (53 installed packages removed). Fonts are self-hosted Latin variable WOFF2 with licenses. Public legal pages remain server-rendered and skip the React app in production.

The theme bootstrap intentionally runs before paint to prevent a theme flash; it adds a small render-blocking request. Public HTML and styles paint before the interactive bundle. The headline no longer fades from invisible on mount. Permanent public-feed configuration errors are displayed immediately instead of retrying first; transient server/network failures retain one retry.

Guest polling runs every 15s only while online and visible, capped at four pages of 30 messages. Member history is capped at ten pages of 40, with visible revalidation every 30s alongside Realtime. These bounds prevent an indefinitely growing transcript DOM; no long-running live multi-user load test was possible without Supabase.

## Remaining work and regression budgets

Use the actual staging HTTPS origin with Supabase connected for repeated mobile/desktop runs and capture cold/warm medians on an idle host. Inspect late conversation-content LCP, initial React/router/query parsing, unused JavaScript and local asset compression/cache behavior. Local Miniflare timings are not production CDN evidence. Avoid fixing scores by hiding chat, delaying usability or injecting sample conversations.

Keep main chunk <=90KB gzip, CSS <=15KB gzip and the member chat chunk <=55KB gzip unless a reviewed feature justifies an increase. Preserve bounded history and zero eager 3D assets. Measure the configured build too: Supabase and Turnstile can add work absent from this unconfigured preview. Production field INP, real Realtime load, offline reconnection, remote latency and free-tier quota behavior remain release checks.
