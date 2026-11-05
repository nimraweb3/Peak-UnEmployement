import { Hono } from "hono";
import { z } from "zod";
import { reportSchema, uuid } from "../../shared/schemas";
import { unwrap, type Env } from "../lib";
const app = new Hono<Env>();
app.get("/api/dm-requests", async (c) =>
  c.json(
    unwrap(
      await c
        .get("db")
        .from("dm_requests")
        .select(
          "*,sender:profiles!dm_requests_sender_id_fkey(*),recipient:profiles!dm_requests_recipient_id_fkey(*)",
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ),
  ),
);
app.post("/api/dm-requests", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("mutate", {
        action: "request",
        payload: z
          .object({ recipient_id: uuid })
          .strict()
          .parse(await c.req.json()),
      }),
    ),
    201,
  ),
);
app.patch("/api/dm-requests/:id", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("mutate", {
        action: "respond",
        payload: {
          id: uuid.parse(c.req.param("id")),
          ...z
            .object({ status: z.enum(["accepted", "declined"]) })
            .strict()
            .parse(await c.req.json()),
        },
      }),
    ),
  ),
);
app.get("/api/conversations", async (c) =>
  c.json(unwrap(await c.get("db").rpc("list_conversations"))),
);
app.patch("/api/conversations/:id", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("mutate", {
        action: z
          .object({ action: z.enum(["read", "close"]) })
          .strict()
          .parse(await c.req.json()).action,
        payload: { id: uuid.parse(c.req.param("id")) },
      }),
    ),
  ),
);
app.get("/api/blocks", async (c) =>
  c.json(
    unwrap(
      await c
        .get("db")
        .from("blocks")
        .select("*,profile:profiles!blocks_blocked_id_fkey(*)"),
    ),
  ),
);
app.post("/api/blocks", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("mutate", {
        action: "block",
        payload: z
          .object({ user_id: uuid })
          .strict()
          .parse(await c.req.json()),
      }),
    ),
  ),
);
app.delete("/api/blocks/:id", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("mutate", {
        action: "unblock",
        payload: { user_id: uuid.parse(c.req.param("id")) },
      }),
    ),
  ),
);
app.post("/api/reports", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("mutate", {
        action: "report",
        payload: reportSchema.parse(await c.req.json()),
      }),
    ),
    201,
  ),
);

export default app;
