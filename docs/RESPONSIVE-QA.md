# Responsive QA — 2026-11-13

The desktop application uses a 264px independently scrolling sidebar and a flexible full-height chat region. Room information is optional. Mobile uses a compact header, a focus-trapped room menu and bottom navigation; the composer sits within the remaining viewport rather than under fixed navigation. Focusing its textarea hides bottom navigation. Safe-area padding and `interactive-widget=resizes-content` improve on-screen-keyboard behavior where supported.

Public production checks cover 1440, 768, 390 and 320 CSS pixel widths in both shifts. Initial checks found no horizontal overflow, but did find scroll-reveal contrast failures (fixed). Screenshots and raw axe output are generated under ignored `docs/screenshots` and `docs/audits`.

Public-only automation never signs in or posts fixture messages. A full Google login remains deliberately excluded. Physical iOS/Android keyboard behavior, screen-reader output and full two-user production messaging require separate validation; desktop emulation is not proof of those behaviors.

Final deployed public checks: all 3 Playwright tests passed. Eight homepage axe scans (1440/768/390/320px, both themes) and six auth/legal route scans reported zero WCAG A/AA violations. Guidelines navigation/direct refresh, guest route protection and demo controls passed.

## Authenticated browser smoke test — 2026-11-14

With explicit approval, created temporary anonymous qa_review_1113. Verified onboarding into /app/lounge with workspace focus, industry-room navigation, emoji search and insertion with composer focus restored, dark theme, profile save surviving refresh, and displayed 30-day username lock. Deleted the temporary account via Settings; app returned to guest join state. No public test messages were posted. Two-user delivery, live reaction persistence and mobile signed-in interactions remain unverified in this browser session.
