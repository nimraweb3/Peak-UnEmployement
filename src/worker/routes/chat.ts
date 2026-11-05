import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { messageSchema, reactionSchema, uuid } from "../../shared/schemas";
import { unwrap, messageSelect, type Env } from "../lib";
const app = new Hono<Env>();
app.get("/api/rooms", async (c) =>
  c.json(unwrap(await c.get("db").from("rooms").select("*").order("slug"))),
);
app.get("/api/profiles/:id", async (c) =>
  c.json(
    unwrap(
      await c
        .get("db")
        .from("profiles")
        .select("*")
        .eq("id", uuid.parse(c.req.param("id")))
        .single(),
    ),
  ),
);
for (const kind of ["rooms", "conversations"] as const) {
  const field = kind === "rooms" ? "room_id" : "conversation_id";
  app.get(`/api/${kind}/:id/messages`, async (c) => {
    const id = uuid.parse(c.req.param("id"));
    const db = c.get("db");
    if (
      kind === "conversations" &&
      !unwrap(await db.rpc("can_converse", { cid: id }))
    )
      throw new HTTPException(403, { message: "Conversation unavailable" });
    let query = db
      .from("messages")
      .select(messageSelect)
      .eq(field, id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(40);
    const cursor = c.req.query("before");
    if (cursor) {
      z.string().max(256).parse(cursor);
      let decoded: unknown;
      try {
        decoded = JSON.parse(atob(cursor));
      } catch {
        throw new HTTPException(400, { message: "Invalid history cursor" });
      }
      const parsed = z
        .object({ at: z.string().datetime({ offset: true }), id: uuid })
        .parse(decoded);
      query = query.or(
        `created_at.lt.${parsed.at},and(created_at.eq.${parsed.at},id.lt.${parsed.id})`,
      );
    }
    const items = unwrap(await query);
    const last = items.at(-1);
    return c.json({
      items,
      next:
        items.length === 40 && last
          ? btoa(JSON.stringify({ at: last.created_at, id: last.id }))
          : null,
    });
  });
  app.post(`/api/${kind}/:id/messages`, async (c) => {
    const payload = messageSchema.parse(await c.req.json());
    return c.json(
      unwrap(
        await c.get("db").rpc("mutate", {
          action: "send",
          payload: { ...payload, [field]: uuid.parse(c.req.param("id")) },
        }),
      ),
      201,
    );
  });
}
app.delete("/api/messages/:id", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("mutate", {
        action: "delete_message",
        payload: { id: uuid.parse(c.req.param("id")) },
      }),
    ),
  ),
);
for (const method of ["post", "delete"] as const)
  app[method]("/api/messages/:id/reactions", async (c) =>
    c.json(
      unwrap(
        await c.get("db").rpc("mutate", {
          action: method === "post" ? "react" : "unreact",
          payload: {
            id: uuid.parse(c.req.param("id")),
            ...reactionSchema.parse(await c.req.json()),
          },
        }),
      ),
    ),
  );

export default app;
