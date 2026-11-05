# After Hours — Peak Unemployment

The internet’s unofficial break room. The homepage gives roughly 40% of its width to an invitation and 60% to a real conversation. Mobile places the chat directly after a compact introduction. Public reading never creates an Auth account. Empty, offline and unavailable states are distinct; production never substitutes sample activity.

## Visual system

Day Shift: canvas #F8F7F2, surface #FFFFFF, ink #171A21, secondary #59616B, border #E1DFD8, primary #3652DD, coral #FF7058, lime #D7F56A, soft blue #EDF1FF, neutral #F0EEE8.
Night Shift: canvas #11151B, surface #1D232B, elevated #262E39, ink #F6F5F0, secondary #B7C0CC, border #394450, accent #9AACFF, coral #FF957F, lime #D7F56A.

All required semantic tokens live in `src/react-app/styles.css`: background, foreground, surface, surface-elevated, muted, muted-foreground, primary, primary-foreground, accent, accent-foreground, border, ring, success and danger. Older component aliases remain for compatibility. Muted is a surface; muted-foreground is text. Decorative borders are not the sole indication of a control. Inputs use a stronger control-border. Light coral text uses #BA332B to meet contrast; bright coral is decoration.

Space Grotesk is the display and wordmark face; DM Sans is the body face. Both are self-hosted Latin WOFF2 variable fonts with local licenses and swap loading. Fluid headings, readable 14px+ message bodies and 44px primary controls take precedence over ornamental density. No external font request or 3D runtime is needed.

## Behavior

Default light; explicit light/dark/system preference persists in browser storage. A small blocking same-origin theme script runs before CSS/paint. System mode subscribes to OS changes; theme-color and toast appearance follow the resolved theme. Storage denial leaves preferences usable for the current visit. Reduced motion respects both the device and browser preference. Panels use restrained motion; existing Motion React chat feedback remains lazy-loaded.

Join preserves the selected room and focuses the composer after onboarding. DM permission starts off. Member composer: “Say something…”. Room cards, profile dialogs, inbox and settings use the same colors and control states. Message content is plain text, never HTML or automatically activated URLs. Screen-reader message announcements are opt-in and do not announce initial history.

## Reference study

[Wensity](https://wensity.com/) was reviewed for a clear headline-to-copy-to-action hierarchy, deliberate negative space, consistent edge treatment and restrained emphasis. This app uses an original split conversation layout, original conversation/peak mark and its own palette and copy. No reference assets or source were copied.
