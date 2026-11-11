import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const auth = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
const ids: string[] = [];
async function user<T = any>(n: number, sql: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      auth[n],
    ]);
    return tx.query<T>(sql, params);
  });
}
async function action(n: number, kind: string, payload: unknown) {
  return user(n, "select public.account_action($1,$2::jsonb) value", [
    kind,
    JSON.stringify(payload),
  ]);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,is_anonymous boolean default true,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;",
  );
  await db.exec(
    "create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant all on storage.objects to authenticated;create policy prior_broad_policy on storage.objects for all to authenticated using(true) with check(true);",
  );
  for (const f of readdirSync("supabase/migrations").sort())
    await db.exec(
      readFileSync("supabase/migrations/" + f, "utf8").replace(
        /alter publication supabase_realtime[^;]*;/g,
        "",
      ),
    );
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  for (let n = 0; n < 3; n++) {
    await db.query("insert into auth.users(id) values($1)", [auth[n]]);
    ids.push(
      (await user(n, "select public.bootstrap_profile() value")).rows[0].value
        .id,
    );
  }
}, 60000);
afterAll(async () => {
  await db?.close();
});
it("bootstraps once without using Google name or email", async () => {
  expect(
    (await user(0, "select public.bootstrap_profile() value")).rows[0].value.id,
  ).toBe(ids[0]);
  expect(ids[0]).not.toBe(auth[0]);
});
it("normalizes username claims and rejects case-insensitive collisions", async () => {
  await user(0, "select public.mutate('profile',$1::jsonb)", [
    JSON.stringify({ username: "Frontend_Nomad" }),
  ]);
  expect(
    (
      await user(
        1,
        "select public.username_availability('FRONTEND_NOMAD') value",
      )
    ).rows[0].value.available,
  ).toBe(false);
  await expect(
    user(1, "select public.mutate('profile',$1::jsonb)", [
      JSON.stringify({ username: "frontend_nomad" }),
    ]),
  ).rejects.toThrow(/unique|duplicate/i);
});
it("returns checked suggestions without private identity data", async () => {
  const r = (
    await user(1, "select public.username_availability('frontend_nomad') value")
  ).rows[0].value;
  expect(r.suggestions).toHaveLength(4);
  for (const s of r.suggestions)
    expect(
      (await user(1, "select public.username_availability($1) value", [s]))
        .rows[0].value.available,
    ).toBe(true);
  expect(JSON.stringify(r)).not.toContain(auth[0]);
});
it("rejects reserved, invalid and rapid username changes at the database", async () => {
  for (const name of ["ADMIN", "bad space", "x".repeat(21)])
    await expect(
      user(1, "select public.mutate('profile',$1::jsonb)", [
        JSON.stringify({ username: name }),
      ]),
    ).rejects.toThrow(/Invalid|reserved/);
  await expect(
    user(0, "select public.mutate('profile',$1::jsonb)", [
      JSON.stringify({ username: "another_name" }),
    ]),
  ).rejects.toThrow(/limit/);
});
it("keeps rich profiles and employment private until explicitly shared", async () => {
  await action(0, "details", {
    display_name: "A nickname",
    bio: "<script>alert(1)</script>",
    visibility: "private",
  });
  await action(0, "employment", { status: "Currently unemployed" });
  await action(0, "period", {
    start_month: "2025-01-01",
    end_month: "2025-03-01",
    note: "Private note",
  });
  expect(
    (await user(1, "select public.public_profile('frontend_nomad') value"))
      .rows[0].value,
  ).toBeNull();
  expect(
    (await user(1, "select * from public.employment_profiles")).rows,
  ).toHaveLength(0);
  expect(
    (await user(1, "select * from public.unemployment_periods")).rows,
  ).toHaveLength(0);
  await action(0, "details", { visibility: "public" });
  const hidden = (
    await user(1, "select public.public_profile('frontend_nomad') value")
  ).rows[0].value;
  expect(hidden.employment_status).toBeNull();
  expect(hidden.history).toBeNull();
  expect(hidden.bio).toBe("<script>alert(1)</script>");
  await action(0, "employment", { show_status: true, show_history: true });
  const shown = (
    await user(1, "select public.public_profile('frontend_nomad') value")
  ).rows[0].value;
  expect(shown.history).toHaveLength(1);
  expect(shown.employment_status).toBe("Currently unemployed");
});
it("rejects direct cross-account writes and mass assignment", async () => {
  await expect(
    user(
      1,
      "update public.profile_details set bio='spoof' where profile_id=$1",
      [ids[0]],
    ),
  ).rejects.toThrow(/permission/);
  await expect(
    action(1, "details", { profile_id: ids[0], bio: "spoof" }),
  ).rejects.toThrow(/Unknown/);
  await expect(
    action(1, "details", { avatar_path: "other/avatar.jpg" }),
  ).rejects.toThrow(/Unknown/);
  await expect(
    user(1, "select public.finish_profile_media($1,$2,'avatar',null)", [
      ids[0],
      crypto.randomUUID(),
    ]),
  ).rejects.toThrow(/permission/);
});
it("validates history ranges, overlap, owner editing, deletion and ongoing periods", async () => {
  const existing = (await user(0, "select * from public.unemployment_periods"))
    .rows[0];
  await expect(
    action(1, "period", {
      id: existing.id,
      start_month: "2025-01-01",
      end_month: null,
    }),
  ).rejects.toThrow(/unavailable/);
  await expect(
    action(0, "period", { start_month: "2025-02-01", end_month: "2025-04-01" }),
  ).rejects.toThrow(/overlap/);
  await expect(
    action(0, "period", { start_month: "2099-01-01", end_month: null }),
  ).rejects.toThrow(/Invalid/);
  await expect(
    action(0, "period", { start_month: "2024-01-02", end_month: "2024-02-01" }),
  ).rejects.toThrow();
  const p = (
    await action(0, "period", { start_month: "2025-05-01", end_month: null })
  ).rows[0].value;
  await expect(
    action(0, "period", { start_month: "2025-07-01", end_month: null }),
  ).rejects.toThrow(/overlap/);
  await action(0, "period", {
    id: p.id,
    start_month: "2025-05-01",
    end_month: "2025-06-01",
  });
  await action(0, "delete_period", { id: p.id });
});
it("enforces verification even on direct RPC calls", async () => {
  await db.query("update auth.users set is_anonymous=false where id=$1", [
    auth[2],
  ]);
  await expect(user(2, "select public.bootstrap_profile()")).rejects.toThrow(
    /Verify/,
  );
  await expect(action(2, "details", { bio: "blocked" })).rejects.toThrow(
    /Authentication/,
  );
  await db.query("update auth.users set email_confirmed_at=now() where id=$1", [
    auth[2],
  ]);
  expect(
    (await user(2, "select public.bootstrap_profile() value")).rows[0].value.id,
  ).toBe(ids[2]);
});
it("serializes competing media uploads and queues abandoned paths", async () => {
  await user(0, "select public.begin_profile_media()");
  await expect(user(0, "select public.begin_profile_media()")).rejects.toThrow(
    /progress/,
  );
  expect(
    (await db.query("select * from private.media_cleanup")).rows.length,
  ).toBeGreaterThanOrEqual(2);
});

it("allows only one winner when two accounts claim the same handle", async () => {
  const results = await Promise.allSettled(
    [1, 2].map((n) =>
      user(n, "select public.mutate('profile',$1::jsonb)", [
        JSON.stringify({ username: "same_candidate" }),
      ]),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    (
      await db.query(
        "select id from public.profiles where lower(username)='same_candidate'",
      )
    ).rows,
  ).toHaveLength(1);
});

it("prevents direct storage writes even with a pre-existing permissive policy", async () => {
  await expect(
    user(
      1,
      "insert into storage.objects(bucket_id,name) values('profile-media','spoof.jpg')",
    ),
  ).rejects.toThrow(/row-level security/);
  await user(
    1,
    "insert into storage.objects(bucket_id,name) values('unrelated-bucket','allowed.jpg')",
  );
  await db.exec(
    "insert into storage.objects(bucket_id,name) values('profile-media','protected.jpg')",
  );
  expect(
    (
      await user(
        1,
        "delete from storage.objects where bucket_id='profile-media' returning id",
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await user(
        1,
        "update storage.objects set name='spoof' where bucket_id='profile-media' returning id",
      )
    ).rows,
  ).toHaveLength(0);
});
it("queues media when its Auth owner is deleted", async () => {
  const path = ids[2] + "/avatar/test.jpg";
  await db.query(
    "update public.profile_details set avatar_path=$1 where profile_id=$2",
    [path, ids[2]],
  );
  await db.query("delete from auth.users where id=$1", [auth[2]]);
  expect(
    (
      await db.query("select path from private.media_cleanup where path=$1", [
        path,
      ])
    ).rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query(
        "select * from public.profile_details where profile_id=$1",
        [ids[2]],
      )
    ).rows,
  ).toHaveLength(0);
});
