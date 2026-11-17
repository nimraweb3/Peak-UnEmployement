# Theme audit

Updated 2026-11-16. Night Shift distinguishes navigation (#151b24), chat (#191f28), incoming bubbles (#262e39), outgoing bubbles (#2c3857), and popovers (#2b3442). Text, secondary text, focus and control borders inherit semantic tokens.

Automated token tests verify normal text >=4.5:1 and control boundaries >=3:1 on the new dark surfaces, alongside existing Day/Night palette checks. Decorative bubble borders are not interactive boundaries. Theme selection remains persisted by the existing preference provider. Explicit selected styling supplements color.

Live browser matrix and limitations are recorded in WEBSITE_IMPROVEMENT_CHECKLIST.md. Token tests do not replace rendered accessibility checks or physical-device review.
