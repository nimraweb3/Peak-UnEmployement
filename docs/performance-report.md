# Performance review — 2026-11-13

The production TypeScript/Vite build passes. Heavy routes remain lazy-loaded; profile editing is shared between profile and settings chunks. The illustrative conversation uses a single cancellable timeout, runs only after Play, stops at the end and pauses on hidden pages. It adds no WebGL, external imagery or backend calls. Emoji glyphs are native and need no CDN.

Lighthouse results will be recorded from the deployed public pages after final verification. Do not infer scores from bundle size or unit tests. Field INP and real-user Core Web Vitals are not measured in this work. Authenticated-route Lighthouse results require a permitted test session; redirect pages must not be mislabeled as lounge/profile scores.

## Deployed mobile Lighthouse results (2026-11-14)

Single lab run per route; scores vary with network and host load.

| Route | Performance | Accessibility | Best practices | SEO |
|---|---:|---:|---:|---:|
| / | 87 | 100 | 100 | 92 |
| /auth | 60 | 100 | 100 | 58 |
| /auth?mode=signup | 73 | 100 | 100 | 58 |
| /community-guidelines | 96 | 100 | 100 | 92 |

Homepage LCP 2.5s, total blocking time 380ms. Performance targets are not yet met. Follow-up: reduce initial JavaScript/main-thread work and render-blocking resources. The run found missing static robots.txt falling through to SPA HTML. Added a real robots.txt afterward; the scores above are retained as measured, not recomputed. Auth pages intentionally avoid indexing; their SEO scores are not public landing-page targets. No authenticated Lighthouse score is claimed.
