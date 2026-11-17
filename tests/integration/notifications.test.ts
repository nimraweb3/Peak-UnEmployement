import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
const authIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
let ids: string[];
let room: string;

async function asUser<T>(index: number, sql: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      authIds[index],
    ]);
    return tx.query<T>(sql, params);
  });
}
async function mutate(
  index: number,
  action: string,
  payload: Record<string, unknown> = {},
) {
  const result = await asUser<{ result: any }>(
    index,
    "select public.mutate($1,$2::jsonb) result",
    [action, JSON.stringify(payload)],
  );
  return result.rows[0].result;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,is_anonymous boolean default true,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;",
  );
  let migration = readFileSync(
    "supabase/migrations/202611020001_initial.sql",
    "utf8",
  );
  migration = migration.replace(
    /alter publication supabase_realtime[^;]*;/g,
    "",
  );
  await db.exec(migration);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f > "202611020001_initial.sql")
    .sort())
    await db.exec(
      readFileSync(`supabase/migrations/${file}`, "utf8").replace(
        /alter publication supabase_realtime[^;]*;/g,
        "",
      ),
    );
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  for (const id of authIds)
    await db.query("insert into auth.users(id) values($1)", [id]);
  ids = [];
  for (let i = 0; i < 3; i++) {
    const row = await asUser<{ p: { id: string } }>(
      i,
      "select to_jsonb(public.bootstrap_profile()) p",
    );
    ids.push(row.rows[0].p.id);
  }
  room = (
    await db.query<{ id: string }>(
      "select id from public.rooms where slug='lounge'",
    )
  ).rows[0].id;
}, 60000);
afterAll(async () => {
  await db?.close();
});
describe("reply and notification authorization with three isolated users", () => {
  let original: string,
    reply: string,
    notification: string,
    conversation: string;
  async function send(user: number, extra: Record<string, unknown> = {}) {
    await db.exec("delete from private.action_events");
    return mutate(user, "send", {
      room_id: room,
      client_id: crypto.randomUUID(),
      content: crypto.randomUUID(),
      ...extra,
    });
  }
  it("persists a reply and delivers one recipient-only notification despite retries", async () => {
    original = (await send(0)).id;
    const client = crypto.randomUUID();
    const payload = { reply_to_message_id: original, client_id: client };
    reply = (await send(1, payload)).id;
    expect((await send(1, payload)).id).toBe(reply);
    const rows = await asUser<any>(0, "select * from public.notifications");
    expect(rows.rows).toHaveLength(1);
    notification = rows.rows[0].id;
    expect(rows.rows[0]).toMatchObject({
      actor_id: ids[1],
      recipient_id: ids[0],
      message_id: reply,
      type: "reply",
      is_read: false,
    });
    expect(
      (await asUser(1, "select * from public.notifications")).rows,
    ).toHaveLength(0);
    expect(
      (await asUser(2, "select * from public.notifications")).rows,
    ).toHaveLength(0);
    expect(
      (
        await asUser<any>(
          0,
          "select reply_to_message_id from public.messages where id=$1",
          [reply],
        )
      ).rows[0].reply_to_message_id,
    ).toBe(original);
  });
  it("prevents notification forgery and cross-account read changes", async () => {
    await expect(
      asUser(
        2,
        "insert into public.notifications(recipient_id,actor_id,type,event_key) values($1,$2,'reply','forged')",
        [ids[0], ids[2]],
      ),
    ).rejects.toThrow(/permission denied/);
    await asUser(2, "select public.read_notifications($1,true)", [
      notification,
    ]);
    expect(
      (
        await asUser<any>(
          0,
          "select is_read from public.notifications where id=$1",
          [notification],
        )
      ).rows[0].is_read,
    ).toBe(false);
    await asUser(0, "select public.read_notifications($1,true)", [
      notification,
    ]);
    expect(
      (
        await asUser<any>(
          0,
          "select is_read from public.notifications where id=$1",
          [notification],
        )
      ).rows[0].is_read,
    ).toBe(true);
    await asUser(0, "select public.read_notifications(null,false)");
  });
  it("rejects cross-room, nonexistent and spoofed reply payloads", async () => {
    const other = (
      await db.query<any>("select id from public.rooms where id<>$1 limit 1", [
        room,
      ])
    ).rows[0].id;
    await expect(
      send(1, { room_id: other, reply_to_message_id: original }),
    ).rejects.toThrow(/Reply target unavailable/);
    await expect(
      send(1, { reply_to_message_id: crypto.randomUUID() }),
    ).rejects.toThrow(/Reply target unavailable/);
    await expect(
      send(1, { reply_to_message_id: original, sender_id: ids[0] }),
    ).rejects.toThrow(/Unknown field/);
  });
  it("suppresses self replies and honors the recipient preferences", async () => {
    const before = (await db.query("select * from public.notifications")).rows
      .length;
    await send(0, { reply_to_message_id: original });
    expect(
      (await db.query("select * from public.notifications")).rows,
    ).toHaveLength(before);
    await asUser(
      0,
      `select public.notification_settings('{"replies":false,"requests":true,"private_messages":true}')`,
    );
    await send(1, { reply_to_message_id: original });
    expect(
      (await db.query("select * from public.notifications")).rows,
    ).toHaveLength(before);
  });
  it("notifies request, acceptance and private message only to their recipients", async () => {
    await mutate(1, "profile", { allows_dm_requests: true });
    const request = await mutate(0, "request", { recipient_id: ids[1] });
    expect(
      (await asUser<any>(1, "select type from public.notifications")).rows.map(
        (n) => n.type,
      ),
    ).toContain("request");
    const accepted = await mutate(1, "respond", {
      id: request.id,
      status: "accepted",
    });
    conversation = accepted.id;
    expect(
      (await asUser<any>(0, "select type from public.notifications")).rows.map(
        (n) => n.type,
      ),
    ).toContain("accepted");
    const privateMessage = await send(0, {
      room_id: null,
      conversation_id: conversation,
    });
    expect(
      (
        await asUser<any>(
          1,
          "select * from public.notifications where message_id=$1",
          [privateMessage.id],
        )
      ).rows[0].type,
    ).toBe("private_message");
    await expect(
      send(2, {
        room_id: null,
        conversation_id: conversation,
        reply_to_message_id: privateMessage.id,
      }),
    ).rejects.toThrow(/Conversation unavailable/);
    await expect(
      send(1, { reply_to_message_id: privateMessage.id }),
    ).rejects.toThrow(/Reply target unavailable/);
    expect(
      (await asUser(2, "select * from public.notifications")).rows,
    ).toHaveLength(0);
  });
  it("handles deleted reply targets and block privacy without leaking snapshots", async () => {
    await mutate(0, "delete_message", { id: original });
    await expect(send(1, { reply_to_message_id: original })).rejects.toThrow(
      /Reply target unavailable/,
    );
    await mutate(0, "block", { user_id: ids[1] });
    expect(
      (await asUser(0, "select * from public.notifications")).rows,
    ).toHaveLength(0);
    expect(
      (await asUser(1, "select * from public.notifications")).rows,
    ).toHaveLength(0);
    await expect(send(1, { reply_to_message_id: original })).rejects.toThrow(
      /Reply target unavailable/,
    );
  });
});
