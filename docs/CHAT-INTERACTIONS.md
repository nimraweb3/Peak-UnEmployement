# Chat interactions

The public feed continues to read genuine Supabase messages. A separate, explicitly labeled fictional conversation is opt-in below it. Play/pause/replay/skip operate a short local sequence, never API requests. Hidden tabs suspend the timer; reduced-motion users get the complete static transcript. There are no fake presence counts or infinite loops.

Members enter `/app/lounge` or the intended industry room. The shell has independent navigation/history scrolling, mobile room navigation with Radix focus containment, a compact header, and collapsible room information. `/app` restores the last valid room; `/app/profile` has a focused profile editor.

Composer: native multiline textarea, Enter/Shift+Enter and IME handling, 1,000-character cap, cursor/selection-preserving emoji insertion, and idempotent retry. Closed conversations cannot submit through keyboard handlers. Copy uses the Clipboard API with failure feedback. Reply inserts a clearly readable quote into the draft; it is not a threaded-message feature.

The emoji palette has 44 native choices in three categories, case-insensitive search, arrow/Home/End navigation, Escape, outside-dismissal and character-limit enforcement. Native glyphs require no image CDN or trackers. This is a compact curated palette, not a complete Unicode catalog or skin-tone selector. Evaluated [Emoji Mart](https://github.com/missive/emoji-mart) (separate data package) and [emoji-picker-react](https://github.com/ealush/emoji-picker-react) (native mode and comprehensive UI); kept the existing native approach to avoid adding their larger catalog/runtime to this limited picker. No third-party library accessibility claim substitutes for testing our controls.

Reactions retain the five server-allowlisted emoji. The database primary key prevents duplicates, the existing API adds/removes own reactions, and labels announce counts and selected state. Messages receive realtime updates; reaction changes by other members refresh with the 10-second fallback poll. No unsafe unfiltered reaction DELETE subscription was introduced. Report/block/profile controls use the existing permission-aware PersonDialog.

Private messages remain consent-based. Public demo data is never reused to represent real conversations.
