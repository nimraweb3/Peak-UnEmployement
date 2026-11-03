# Database operations

Use a dedicated Supabase project. The initial migration controls grants on public-schema tables/functions and must not be applied to an unrelated application database.

## Tables

| Table                   | Purpose / read access                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `profiles`              | Public nickname, avatar, self-reported fields and DM preference; signed-in members      |
| `industries`, `rooms`   | Eight industries and nine public rooms; signed-in members                               |
| `messages`              | Public or private text (exactly one destination); RLS applies to destination and blocks |
| `reactions`             | Unique message/user/emoji tuples; message readers                                       |
| `dm_requests`           | One lifetime request per unordered pair; participants only                              |
| `conversations`         | Accepted pairs, optional closed timestamp; unblocked participants                       |
| `conversation_reads`    | Own read cursor                                                                         |
| `blocks`                | Own block list                                                                          |
| `reports`               | Private moderator review                                                                |
| `private.identities`    | Auth UUID → independently generated public UUID; no client access                       |
| `private.moderators`    | Server-maintained admin allowlist                                                       |
| `private.restrictions`  | Accounts barred from mutations                                                          |
| `private.action_events` | Persistent rate-limit window; no client access                                          |

Indexes cover room/conversation history, sender time, both directions of blocking, request recipients, and participant lookup. Foreign keys and cascades remove account-related content. Deleting an Auth user removes its private identity, whose trigger removes the public profile. Deleting an account also removes conversations involving it and all messages in those conversations. Reports may survive with null participant/message references.

## Apply to a hosted project

Install/use the official Supabase CLI with `npx supabase` (Node 24 is supported):

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --include-seed
```

This applies `supabase/migrations/202611020001_initial.sql` and the repeatable seed. Migration tracking prevents applying the initial DDL twice. Alternatively, in a brand-new project run the migration once in SQL Editor, then `supabase/seed.sql`; use one approach consistently, recording migration history before mixing methods.

For local Supabase, install Docker, then run:

```sh
npx supabase start
npx supabase db reset
npx supabase status
```

`db reset` recreates the local database and deletes local data. Never use destructive resets on production. Local GoTrue/CAPTCHA configuration must be set for signup, or use a separate hosted test project with test CAPTCHA keys as described in deployment docs.

Check that `messages`, `dm_requests`, and `conversations` belong to `supabase_realtime`; the migration adds them. Postgres Changes does not require the `realtime.messages` Broadcast policy system. RLS is on each subscribed public table.

## Grant moderator access

Create/link the intended operator account first. Find its Auth user UUID in Supabase's Auth dashboard. Run as the database owner:

```sql
insert into private.moderators(auth_id)
values ('REPLACE_WITH_AUTH_USER_UUID')
on conflict do nothing;
```

Profile fields and JWT user metadata cannot grant moderation access. `/app/admin` appears after the verified allowlist check. A restriction blocks writes, not account deletion or reading already-authorized data.

To remove an erroneous restriction, an operator can run:

```sql
delete from private.restrictions
where profile_id = 'REPLACE_WITH_PUBLIC_PROFILE_UUID';
```

## Retention and maintenance

Rate events are pruned per sender on each mutation, retaining at most the last minute for active accounts. Inactive accounts leave at most their final bounded window; periodically prune globally:

```sql
delete from private.action_events where created_at < now() - interval '1 minute';
```

There is no automated message expiration or anonymous-account cleanup job. Define and disclose retention before public launch. Monitor table/index sizes and export backups appropriate to the selected plan. Do not assume a free plan includes managed backups.

## Tests

`npm test` executes the real migration (excluding only the hosted Realtime publication statement) in PGlite PostgreSQL. Tests create `auth.uid()`/Auth-table fixtures and real authenticated roles, then exercise actual grants, RLS, SQL functions, and cascades. This validates SQL behavior, not Supabase GoTrue, PostgREST embedding, Realtime delivery, cloud configuration or production concurrency. The separate live Playwright suite covers those integration paths once connected.
