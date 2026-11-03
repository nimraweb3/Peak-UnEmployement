# Verification record

Local checks on November 2, 2026, Windows / Node 24.13.1:

| Check                            | Result                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| Strict TypeScript                | Passed                                                                                  |
| ESLint                           | Passed                                                                                  |
| Vitest                           | 34 tests passed across 5 files                                                          |
| PostgreSQL integration           | Real migration, grants, RLS, consent/rates and cleanup tested in PGlite                 |
| Production Vite + Worker build   | Passed                                                                                  |
| Public Playwright Chromium       | 2 passed (desktop flow and mobile layout/route guards)                                  |
| Live Supabase Playwright journey | 1 skipped; requires isolated project credentials                                        |
| npm audit                        | 0 known vulnerabilities after minimatch patch                                           |
| Visual review                    | Desktop/mobile landing and join screenshots inspected; clipped mobile heading corrected |
| Cloudflare deployment            | Not performed                                                                           |

PGlite supplies PostgreSQL behavior with test Auth fixtures. It does not verify hosted Supabase Auth, PostgREST relationship queries, CAPTCHA, email delivery, Realtime websocket behavior, or cloud permissions. The tests are not a production load benchmark. Browser screenshots contain only fictional landing examples or setup UI.

The production build warns about the lazy Three.js chunk (roughly 920 KB before gzip / 243 KB gzip in the unconfigured build). It is dynamically imported only on the landing page. The installed R3F/Drei stack emits a development Three.Clock deprecation warning; rendering and the browser tests succeed. Wrangler also emits a dependency-level punycode deprecation warning. These warnings are not test failures.

No server, cloud project, user population, uptime, live-chat success, or deployment URL is invented. Follow `deployment.md` to connect an isolated environment and complete the skipped live test before treating the MVP as production-verified.
