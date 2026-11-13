# Application audit and improvements — 2026-11-13

## Findings before changes

- Anonymous onboarding completes inside Landing and returns to `/` or `/rooms/:slug`. Auth's return validator also accepts those marketing destinations. The existing `/app` shell is therefore bypassed in normal joining flows.
- The existing shell has separate sidebar/history scrolling and `100dvh`, but lacks a theme control and a collapsible room information panel. Navigation text is as small as 11px; mobile drawer lacks focus containment.
- The composer has cursor insertion and retry support, but only twelve emoji choices with no search/categories. Message actions omit copy/reply. Reactions already persist through the API and database, with polling refresh.
- Community guidelines have an implemented route, but production boot skips React on legal URLs under the assumption that a Worker rendered them. Vercel serves the empty SPA entry instead. Fixed boot to skip React only when a rendered legal page actually exists.
- Semantic light/dark tokens and contrast tests already exist. Several later layout rules need consolidation/overrides, especially native selects and small app text.
- Username restriction is enforced by a PostgreSQL trigger for seven days, contrary to the new 30-day requirement. Existing migrations must remain immutable; use an additive migration.
- Profile media, private employment data, DM consent, username availability and account security are implemented. Retain their real API integration.
- Google and anonymous Auth are configured; SMTP is not. Personal Google login was explicitly excluded from testing by the user. Do not enable unavailable email delivery or fake it.
- Git ignore currently hides legitimate instructions and design documentation, contrary to the new repository hygiene requirements.

Implementation and verification results are recorded in the accompanying chat, accessibility, responsive, security and performance documents. No test fixtures belong in production conversations.
