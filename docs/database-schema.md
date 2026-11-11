# Database schema and API

## Migrations

Apply all existing migrations in order, followed by `202611100001_accounts.sql` and `202611100002_media.sql`. The Supabase migration ledger applies each once. Existing users, profile IDs, rooms, messages and DM consent are preserved. No production database was changed.

- profiles: existing public chat identity; case-insensitive unique username index retained. New/changed handles normalize to lowercase, 3–20 characters, reserved-name rejection and seven-day change cooldown. Legacy handles are grandfathered until changed; old renamed URLs return unavailable rather than redirecting to a different identity.
- profile_details: display name, bio, mood, visibility and controlled image paths. Full-profile default is members-only. Private profiles return no full-profile result to other accounts. Basic chat identity remains visible.
- employment_profiles: owner-only situation and publication preferences. Existing situation values migrate here and are removed from the broadly readable legacy column.
- unemployment_periods: owner-only month dates and notes, maximum 50 periods, one nonoverlapping timeline; null end means ongoing. Public RPC projects only fields explicitly shared. Calendar-month duration includes start/end months and does not infer employment from an end date.
- professions: industry-linked lookup records. Onboarding and settings read these from the database. Customer Support is added as a room/category.
- private username_changes/reserved_usernames: cooldown and reserved-name rules.
- private media_leases/media_cleanup: serialized bounded uploads and durable cleanup of replaced/abandoned/deleted-account assets.

Writes use narrowly granted SECURITY DEFINER RPCs with an empty search_path, authenticated identity derived internally, ownership checks, allowlisted fields and persistent limits. Direct table writes are denied. Employment writes lock the owner row before overlap checks. Username uniqueness is ultimately enforced by the unique PostgreSQL index; availability is only advisory.

## REST surface

All paths below are under /api. Member endpoints require a verified or anonymous Supabase access token. Public profile access without a token works only when visibility is public. All account/profile API responses are no-store/noindex.

| Method | Path | Purpose |
|---|---|---|
| GET | /health | Configuration presence, not provider health |
| GET | /auth/session | Verified session gate |
| GET/PATCH/DELETE | /me | Existing profile, basic edits, full account deletion |
| GET | /usernames/availability, /usernames/suggestions | Normalized candidate and checked alternatives; authenticated, 60 checks/minute |
| PATCH | /me/username | Atomic rename; 409 with fresh suggestions on collision |
| POST | /onboarding/complete | Atomic profile, optional start month, explicit publication preference |
| GET/PATCH | /me/profile | Rich profile details |
| GET | /users/:username | Visibility-filtered full profile |
| GET | /industries, /industries/:id/professions | Database lookup options |
| GET/PATCH | /me/employment | Private situation and sharing choices |
| GET/POST | /me/unemployment-periods | List/add own periods |
| PATCH/DELETE | /me/unemployment-periods/:id | Edit/remove own period |
| POST/DELETE | /me/media/:kind | Validated avatar/banner upload/removal |

Existing rooms/messages/reactions/requests/conversations/blocks/reports endpoints remain. Appearance preferences remain in existing browser storage; DM preference remains on the existing /me endpoint rather than creating duplicate preference state. Account deletion is /me, not a misleading deletion of only the public profile.

## Uploads

The browser accepts JPEG/PNG/WebP under 8 MB, checks dimensions, provides reposition/zoom cropping and outputs JPEG (384-square avatar, 960×320 banner). The server limits request size, verifies the real JPEG through decoding, rejects invalid dimensions and re-encodes to strip metadata. Targets are <=200 KB avatar and <=500 KB banner. No SVG uploads or external URL processing.

The profile-media bucket is public-read: image contents must be intentionally public even when a full profile is private. No client direct-write policy exists; restrictive policies prevent broad existing policies from granting writes to this bucket. Only the validated server pipeline uses its server-only service role to upload versioned owner/lease paths. Members cannot call the finalization RPC.

Replacements remove old objects immediately when possible. Failed cleanup, abandoned uploads and account-deletion assets remain in a durable queue. Run `node scripts/cleanup-media.mjs` with server environment variables regularly; repeat until it reports zero. Queue processing is idempotent. Public CDN copies may remain cached for up to the configured cache TTL after origin removal.
