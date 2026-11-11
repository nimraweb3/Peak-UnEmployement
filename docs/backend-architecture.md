# Backend architecture

The existing Hono API is retained. It runs in the local Cloudflare Worker, or through the optional server.ts Node entry on Vercel. A same-origin Worker proxy can forward API calls to Node with a server-only shared secret; this keeps network limiting at the edge and CPU-heavy media work in Node. React, typography, themes, room navigation and Supabase Realtime remain in place.

## Boundaries

- Auth: official Supabase SDK for password/OAuth/session flows; getUser verifies tokens at the API. PostgreSQL checks the real auth.users verification state before giving a caller their public identity.
- Validation: shared Zod schemas plus PostgreSQL constraints and RPC allowlists. Frontend availability is advisory; unique index and atomic mutations decide the winner.
- Persistence: existing profiles/social tables retained; additive details, employment, profession and media bookkeeping tables. Hidden employment data is never stored in broadly readable public columns.
- Authorization: user-scoped PostgREST client and narrowly granted RPCs. IDs are derived from Auth, not submitted owner IDs. Service role is restricted to validated media finalization/cleanup and account deletion.
- Media: browser cropping/compression, strict server decode/re-encode, leased versioned storage paths, restrictive direct-write policies and durable garbage queue.
- Frontend: separate profile/username/employment/media/security components. Typed in-memory demo remains explicit development-only; production does not simulate missing account services.

## External dependencies and verification

Supabase, Google OAuth, SMTP sender/DNS verification and Turnstile must be configured by the operator. No live project or production migration was changed. See authentication.md, database-schema.md, backend-deployment.md and backend-delivery.md for commands, boundaries and remaining live checks.

New media dependency: jpeg-js (BSD-3-Clause); the installed package retains its license. No paid image transformation API was added.
