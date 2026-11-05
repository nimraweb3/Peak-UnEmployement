import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { Env } from "../lib";
const app = new Hono<Env>();
app.get("/api/public/rooms/:slug/messages", async (c) => {
  c.header("X-Robots-Tag", "noindex, nofollow, nosnippet");
  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_PUBLISHABLE_KEY)
    return c.json(
      {
        error:
          "The community isn’t connected yet. Public conversations will appear here once the service is configured.",
        code: "NOT_CONFIGURED",
      },
      503,
    );
  const slug = z
    .string()
    .regex(/^[a-z][a-z-]{0,39}$/)
    .parse(c.req.param("slug"));
  let cursor: { at: string; id: string } | null = null;
  if (c.req.query("before")) {
    try {
      z.string().max(256).parse(c.req.query("before"));
      cursor = z
        .object({
          at: z.string().datetime({ offset: true }),
          id: z.string().uuid(),
        })
        .parse(JSON.parse(atob(c.req.query("before")!)));
    } catch {
      throw new HTTPException(400, { message: "Invalid history cursor" });
    }
  }
  // No caller token or service credential: this client has only the anon RPC grant.
  const db = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc("guest_room_feed", {
    room_slug: slug,
    before_at: cursor?.at || null,
    before_id: cursor?.id || null,
  });
  if (error)
    throw new HTTPException(503, {
      message: "The conversation is unavailable right now. Try again shortly.",
    });
  if (!data)
    throw new HTTPException(404, { message: "This room does not exist." });
  c.header("Cache-Control", "public, max-age=0, s-maxage=10");
  return c.json({
    ...data,
    next: data.next ? btoa(JSON.stringify(data.next)) : null,
  });
});
export default app;
