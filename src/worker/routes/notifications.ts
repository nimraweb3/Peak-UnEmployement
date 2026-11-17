import { Hono } from "hono";
import { z } from "zod";
import { uuid } from "../../shared/schemas";
import { unwrap, type Env } from "../lib";
const app = new Hono<Env>();
app.get("/api/notifications", async (c) => {
  const db = c.get("db");
  const [list, count] = await Promise.all([
    db
      .from("notifications")
      .select(
        "*,actor:profiles!notifications_actor_id_fkey(id,username,avatar_seed,profile_details(avatar_path)),room:rooms(slug,name)",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(100),
    db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
  ]);
  unwrap({ data: true, error: count.error });
  return c.json({ items: unwrap(list), unread: count.count || 0 });
});
app.patch("/api/notifications/read", async (c) => {
  const body = z
    .object({ id: uuid.nullable(), is_read: z.boolean() })
    .strict()
    .parse(await c.req.json());
  return c.json(
    unwrap(
      await c
        .get("db")
        .rpc("read_notifications", { nid: body.id, read_value: body.is_read }),
    ),
  );
});
app.get("/api/notifications/preferences", async (c) =>
  c.json(unwrap(await c.get("db").rpc("notification_settings"))),
);
app.patch("/api/notifications/preferences", async (c) => {
  const payload = z
    .object({
      replies: z.boolean(),
      requests: z.boolean(),
      private_messages: z.boolean(),
    })
    .strict()
    .parse(await c.req.json());
  return c.json(
    unwrap(await c.get("db").rpc("notification_settings", { payload })),
  );
});
export default app;
