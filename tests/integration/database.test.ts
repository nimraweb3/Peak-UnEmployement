import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
const authIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
let ids: string[];
let room: string;
let conversation: string;
let message: string;
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
    "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;",
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
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  for (const id of authIds)
    await db.query("insert into auth.users values($1)", [id]);
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
describe("actual PostgreSQL authorization and mutations", () => {
  it("creates unique public identities distinct from Auth UUIDs", async () => {
    expect(new Set(ids).size).toBe(3);
    ids.forEach((id, i) => expect(id).not.toBe(authIds[i]));
    const row = await asUser<{
      p: { id: string; allows_dm_requests: boolean };
    }>(0, "select to_jsonb(public.bootstrap_profile()) p");
    expect(row.rows[0].p.id).toBe(ids[0]);
    expect(row.rows[0].p.allows_dm_requests).toBe(false);
  });
  it("denies direct writes and private identity access", async () => {
    await expect(
      asUser(
        0,
        "insert into public.messages(room_id,sender_id,content,client_id) values($1,$2,$3,$4)",
        [room, ids[1], "spoofed", crypto.randomUUID()],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(asUser(0, "select * from private.identities")).rejects.toThrow(
      /permission denied/,
    );
  });
  it("does not allow profile admin escalation through RPC", async () => {
    await expect(mutate(0, "profile", { role: "admin" })).rejects.toThrow(
      /Unknown profile field/,
    );
    await expect(
      asUser(0, 'select public.moderate(\'{"action":"restrict"}\')'),
    ).rejects.toThrow(/Admin required/);
  });
  it("creates messages as the authenticated sender and retries idempotently", async () => {
    const client = crypto.randomUUID();
    const payload = {
      room_id: room,
      content: "hello from the lounge",
      client_id: client,
      sender_id: ids[1],
    };
    const row = await mutate(0, "send", payload);
    message = row.id;
    expect(row.sender_id).toBe(ids[0]);
    expect(row.created_at).toBeTruthy();
    expect((await mutate(0, "send", payload)).id).toBe(message);
  });
  it("denies deleting someone else’s message", async () => {
    await expect(mutate(1, "delete_message", { id: message })).rejects.toThrow(
      /Cannot delete/,
    );
  });
  it("enforces DM opt-in even through direct RPC", async () => {
    await expect(
      mutate(0, "request", { recipient_id: ids[1] }),
    ).rejects.toThrow(/not accepting/);
  });
  it("requires acceptance and prevents duplicate requests", async () => {
    await mutate(1, "profile", { allows_dm_requests: true });
    const request = await mutate(0, "request", { recipient_id: ids[1] });
    await expect(
      mutate(0, "request", { recipient_id: ids[1] }),
    ).rejects.toThrow(/duplicate key/);
    await expect(
      mutate(0, "respond", { id: request.id, status: "accepted" }),
    ).rejects.toThrow(/Request unavailable/);
    expect(
      (await asUser(0, "select * from public.conversations")).rows,
    ).toHaveLength(0);
    const row = await mutate(1, "respond", {
      id: request.id,
      status: "accepted",
    });
    conversation = row.id;
  });
  it("permits accepted participants and denies strangers", async () => {
    await mutate(0, "send", {
      conversation_id: conversation,
      content: "a private hello",
      client_id: crypto.randomUUID(),
    });
    expect(
      (
        await asUser(
          1,
          "select * from public.messages where conversation_id=$1",
          [conversation],
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(
          2,
          "select * from public.messages where conversation_id=$1",
          [conversation],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      mutate(2, "send", {
        conversation_id: conversation,
        content: "intruder",
        client_id: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/Conversation unavailable/);
  });
  it("keeps existing conversations when requests are disabled", async () => {
    await mutate(1, "profile", { allows_dm_requests: false });
    await mutate(1, "send", {
      conversation_id: conversation,
      content: "still our conversation",
      client_id: crypto.randomUUID(),
    });
  });
  it("persists reports but hides reporter identities from users", async () => {
    await mutate(1, "report", {
      target_user: ids[0],
      message_id: message,
      category: "Spam",
      detail: "Test report",
    });
    expect((await asUser(0, "select * from public.reports")).rows).toHaveLength(
      0,
    );
    expect((await db.query("select * from public.reports")).rows).toHaveLength(
      1,
    );
  });
  it("blocks both private delivery and public visibility", async () => {
    await mutate(1, "block", { user_id: ids[0] });
    expect(
      (await asUser(1, "select * from public.messages where id=$1", [message]))
        .rows,
    ).toHaveLength(0);
    expect(
      (await asUser(0, "select * from public.conversations")).rows,
    ).toHaveLength(0);
    await expect(
      mutate(0, "send", {
        conversation_id: conversation,
        content: "blocked",
        client_id: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/Conversation unavailable/);
    await mutate(1, "unblock", { user_id: ids[0] });
  });
  it("enforces duplicate, link and length limits directly in SQL", async () => {
    await expect(
      mutate(0, "send", {
        room_id: room,
        content: "hello from the lounge",
        client_id: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/Duplicate message/);
    await expect(
      mutate(2, "send", {
        room_id: room,
        content: "https://a.test https://b.test",
        client_id: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/One link/);
    await expect(
      mutate(2, "send", {
        room_id: room,
        content: "x".repeat(1001),
        client_id: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/Invalid message/);
  });
  it("atomically rejects the sixth message in ten seconds", async () => {
    for (let i = 0; i < 5; i++)
      await mutate(2, "send", {
        room_id: room,
        content: `rate test ${i}`,
        client_id: crypto.randomUUID(),
      });
    await expect(
      mutate(2, "send", {
        room_id: room,
        content: "sixth",
        client_id: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/Message limit/);
  });
  it("erases deleted bodies and prevents new reactions", async () => {
    await mutate(0, "react", { id: message, emoji: "💜" });
    await mutate(0, "delete_message", { id: message });
    const result = await asUser<{ content: string; deleted_at: string }>(
      1,
      "select content,deleted_at from public.messages where id=$1",
      [message],
    );
    expect(result.rows[0].content).toBe("");
    expect(result.rows[0].deleted_at).toBeTruthy();
    await expect(
      mutate(1, "react", { id: message, emoji: "🎉" }),
    ).rejects.toThrow(/unavailable/);
  });
  it("keeps inbox counts scoped to participants and tracks reads", async () => {
    const inbox = await asUser<{ value: any[] }>(
      0,
      "select public.list_conversations() value",
    );
    expect(inbox.rows[0].value).toHaveLength(1);
    expect(inbox.rows[0].value[0].unread).toBe(1);
    expect(
      (
        await asUser<{ value: any[] }>(
          2,
          "select public.list_conversations() value",
        )
      ).rows[0].value,
    ).toEqual([]);
    await mutate(0, "read", { id: conversation });
    expect(
      (
        await asUser<{ value: any[] }>(
          0,
          "select public.list_conversations() value",
        )
      ).rows[0].value[0].unread,
    ).toBe(0);
  });
  it("enforces the minute window independently of the burst window", async () => {
    await db.query("delete from private.action_events where profile_id=$1", [
      ids[2],
    ]);
    await db.query(
      "insert into private.action_events(profile_id,kind,created_at) select $1,'send',clock_timestamp()-interval '15 seconds' from generate_series(1,60)",
      [ids[2]],
    );
    await expect(
      mutate(2, "send", {
        room_id: room,
        content: "minute limit",
        client_id: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/Message limit/);
  });
  it("allows only provisioned moderators to review and restrict", async () => {
    await expect(asUser(0, "select public.review_reports()")).rejects.toThrow(
      /Admin required/,
    );
    await db.query("insert into private.moderators values($1)", [authIds[2]]);
    const reports = await asUser<{ value: any[] }>(
      2,
      "select public.review_reports() value",
    );
    expect(reports.rows[0].value[0].category).toBe("Spam");
    await asUser(2, "select public.moderate($1::jsonb)", [
      JSON.stringify({ action: "restrict", user_id: ids[1] }),
    ]);
    await expect(
      mutate(1, "profile", { public_status: "bypass" }),
    ).rejects.toThrow(/Account restricted/);
  });
  it("cleans up profile and associated data when Auth user is deleted", async () => {
    await db.query("delete from auth.users where id=$1", [authIds[0]]);
    expect(
      (await db.query("select * from public.profiles where id=$1", [ids[0]]))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query("select * from public.messages where sender_id=$1", [
          ids[0],
        ])
      ).rows,
    ).toHaveLength(0);
  });
});
