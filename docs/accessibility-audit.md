# Accessibility review — 2026-11-13

Implemented semantic theme radio controls with selected underline/weight, visible keyboard focus, compact message actions with names, emoji search/categories and directional keyboard movement, labeled reactions, a focus-trapped mobile navigation dialog, workspace skip link, route-level focus, and controlled incoming-message announcements. Historical chat remains a readable region instead of an aggressive live log.

The fictional conversation never moves keyboard focus. It has pause, replay and skip; reduced motion gives a static transcript. Hidden pages suspend timers. Theme preference and device motion changes are respected.

The first production axe pass found insufficient text contrast caused by the existing scroll reveal opacity (0.35). Removed fading from text sections while retaining transform movement. Removed body color interpolation that could create intermediate low-contrast combinations during theme changes. Also corrected inherited margins/flex direction on segmented theme labels.

Existing automated semantic-token tests verify normal text at 4.5:1 and control boundaries at 3:1 for both palettes. Production route checks initially reported zero axe violations on auth, signup, forgot-password, guidelines, privacy and terms. Final post-fix results are recorded with responsive QA. Automated scans do not establish full WCAG conformance; assistive-technology and physical-device testing still matter.

Final deployed public checks: all 3 Playwright tests passed. Eight homepage axe scans (1440/768/390/320px, both themes) and six auth/legal route scans reported zero WCAG A/AA violations. Guidelines navigation/direct refresh, guest route protection and demo controls passed.
