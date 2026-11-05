import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { uuid } from "../../shared/schemas";
import { unwrap, type Env } from "../lib";
const app = new Hono<Env>();
app.get("/api/admin", async (c) =>
  c.json({ admin: unwrap(await c.get("db").rpc("is_admin")) }),
);
app.use("/api/admin/*", async (c, next) => {
  if (!unwrap(await c.get("db").rpc("is_admin")))
    throw new HTTPException(403, { message: "Admin required" });
  await next();
});
app.get("/api/admin/reports", async (c) =>
  c.json(unwrap(await c.get("db").rpc("review_reports"))),
);
app.get("/api/admin/metrics", async (c) =>
  c.json(unwrap(await c.get("db").rpc("admin_metrics"))),
);
app.post("/api/admin/moderate", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("moderate", {
        payload: z
          .discriminatedUnion("action", [
            z.object({ action: z.literal("hide"), message_id: uuid }).strict(),
            z.object({ action: z.literal("restrict"), user_id: uuid }).strict(),
            z.object({ action: z.literal("resolve"), report_id: uuid }).strict(),
          ])
          .parse(await c.req.json()),
      }),
    ),
  ),
);

export default app;
