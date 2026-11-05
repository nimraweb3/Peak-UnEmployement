# Accessibility audit — After Hours

Local Chromium + axe-core browser checks cover WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tags. `docs/audits/axe-public.json` contains the current results: zero automated violations on the public page in Day Shift and Night Shift and on the dark join dialog. Automated testing is not a conformance certification.

Responsive checks cover 320, 375, 390, 430, 768, 1280, 1440 and 1920 CSS pixels; no horizontal overflow. Tests also check 200% text resizing and a 320px viewport equivalent to 400% reflow from 1280px. Chat begins within the first mobile viewport. Screenshots in `docs/screenshots` include 390/768/1440, both desktop themes, join, empty and a clearly named TEST_FIXTURE populated feed.

Keyboard checks verify room navigation, modal Escape dismissal and focus restoration to the initiating Join button. Radix supplies dialog focus management and labels. The composer has a label, Shift+Enter handling, disabled empty sends, pending/retry feedback and an idempotent retry key. Contrast tests verify normal text at 4.5:1 and input borders at 3:1 across both themes. Bright coral and lime are decoration; text uses stronger semantic variants.

Message announcements are off by default, delayed and deduplicated, skip initial/older history and do not put the entire transcript in an always-live region. Reduced-motion CSS and preference handling suppress decorative transitions; system theme follows live OS changes and persists explicit overrides. Theme bootstrap runs before CSS and the server-rendered selector now works before React loads.

Outstanding manual release checks: NVDA/VoiceOver reading order and conversational announcement comfort; real mobile keyboard/composer behavior; touch targets on every authenticated screen; linked-member, moderator, DM and profile dialogs with live staging data; high-contrast/forced-colors mode. Local tests cannot establish screen-reader usability or all private-screen states without these checks.
