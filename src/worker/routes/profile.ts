import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createClient } from "@supabase/supabase-js";
import { profileSchema } from "../../shared/schemas";
import { unwrap, type Env } from "../lib";
const app = new Hono<Env>();
app.get("/api/me", async (c) =>
  c.json(unwrap(await c.get("db").rpc("bootstrap_profile"))),
);
for (const path of ["/api/me", "/api/settings"])
  app.patch(path, async (c) =>
    c.json(
      unwrap(
        await c.get("db").rpc("mutate", {
          action: "profile",
          payload: profileSchema.parse(await c.req.json()),
        }),
      ),
    ),
  );
app.get("/api/settings", async (c) =>
  c.json(unwrap(await c.get("db").rpc("bootstrap_profile"))),
);
app.delete("/api/me", async (c) => {
  if (!c.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new HTTPException(503, {
      message: "Account deletion is not configured. Contact the operator.",
    });
  const admin = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { error } = await admin.auth.admin.deleteUser(c.get("authId"));
  if (error)
    throw new HTTPException(500, {
      message: "Deletion failed. Please try again.",
    });
  return c.json({ ok: true });
});

export default app;
