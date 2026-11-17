# Chat enhancements

Updated 2026-11-16. Messages now use rounded bubbles, grouped consecutive author messages within five minutes, compact metadata and touch action disclosure. Existing copy, delete, report and emoji actions remain.

Replies are references, not copied quotes. messages.reply_to_message_id is a foreign key. A database trigger checks existence, soft-deletion, room/conversation equality and caller access. The send RPC owns sender identity. The composer previews/cancels the target, retains it through retry, and uses the existing client_id for idempotency. Clicking context focuses a loaded message or fetches one authorized message through GET /api/{rooms|conversations}/:id/messages/:mid. Deleted/inaccessible originals show an unavailable state.

Homepage mode is build configuration VITE_HOMEPAGE_CHAT_MODE=demo (default) or live. Demo is opt-in, explicitly fictional, has typing/replies/reactions/scrolling and pause/replay/skip controls; reduced motion shows static content. It never writes data. Industry pages continue using the bounded real public feed. Shared MessageBubble is presentation only; data adapters remain separate. No production demo identities are seeded.

Database authorization is covered with three isolated PostgreSQL users. UI tests cover reply cancel without losing a draft and failed-send retry retaining the target. This is not a claim of end-to-end realtime verification.
