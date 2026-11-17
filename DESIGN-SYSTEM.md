# Peak Unemployment design system

Updated 2026-11-16. Existing brand preserved: DM Sans body, Space Grotesk display, warm Day Shift, blue-accented Night Shift.

Semantic color and spacing tokens are in src/react-app/styles.css. Shared social geometry, typography roles, layered surfaces and elevations are in src/react-app/social.css, loaded after existing styles. Buttons/inputs use 12px corners; cards 20px; chat bubbles 18px; modals 24px; avatars 14px. Standard controls are at least 44px tall. Bubble text is 15px with 1.6 line height; metadata is 12px.

Use MessageBubble for conversation text. Use existing Button, Modal, Avatar, Loading, Empty and ErrorState components. Do not duplicate page-specific palettes. Message actions use hover/focus on desktop and an explicit disclosure on touch layouts; Escape restores the trigger. Selected reactions use border and weight as well as color.

Motion: short opacity and transform transitions only. Reduced motion disables reaction scaling and provides a static fictional conversation. Avoid animating theme foreground/background colors independently: intermediate contrast can be unreadable.
