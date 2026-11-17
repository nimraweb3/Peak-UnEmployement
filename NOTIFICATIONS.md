# In-app notifications

Updated 2026-11-16. Migration 202611160001_replies_notifications applied successfully to production Supabase on this date.

Database triggers create notifications for replies, private requests, request acceptance and accepted private messages. Self-notifications are excluded. (recipient_id,event_key) is unique, and send retries return the existing message. Block relationships and recipient preferences are checked before insertion. Clients cannot directly insert, update or delete notifications.

Recipient-only RLS additionally checks blocks and referenced conversation/message access. No private message text snapshots are stored. Foreign keys cascade when related records are removed. Read-state and preference RPCs derive the caller from Auth and never accept another recipient ID.

GET /api/notifications returns the latest 100 accessible records and exact unread count. PATCH /api/notifications/read accepts an ID or null for all, with is_read. GET/PATCH /api/notifications/preferences exposes replies, requests, private_messages booleans. The authenticated shell owns one recipient-filtered realtime subscription, debounced invalidation, cleanup, and foreground 30-second reconciliation. Multiple bells share one query. Read/unread remains persisted. Opening content performs authorization again.

No browser push permission or paid provider. Older history beyond 100 is not currently paginated in the UI. In-app counters are not an email delivery system.

Tests: three-user RLS isolation, forgery rejection, cross-user read mutation rejection, idempotency, self suppression, preferences, request/acceptance/private events, inaccessible references and block hiding. Live delivery evidence, if collected, is recorded in the audit checklist.
