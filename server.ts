import { timingSafeEqual } from "node:crypto";
// Optional Vercel Node entry: the same Hono API, without migrating its routes.
import { Hono } from "hono";
import { cors } from "hono/cors";
import api from "./src/worker/index";
const app = new Hono();
app.use("/api/*", async (c, next) => {
  const secret = process.env.API_PROXY_SECRET;
  if (process.env.NODE_ENV === "production" && !secret)
    return c.json({ error: "API proxy protection is not configured." }, 503);
  if (secret) {
    const supplied = Buffer.from(c.req.header("X-API-Proxy-Secret") || "");
    const expected = Buffer.from(secret);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      return c.json({ error: "Use the frontend API origin." }, 403);
  }
  return next();
});
app.use("/api/*", async (c, next) => {
  const origin = process.env.FRONTEND_ORIGIN;
  if (!origin)
    return c.json({ error: "Frontend origin is not configured." }, 503);
  return cors({
    origin,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 600,
  })(c, next);
});
app.all("/api/*", (c) =>
  api.fetch(c.req.raw, {
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    SITE_URL: process.env.FRONTEND_ORIGIN,
  }),
);
app.notFound((c) => c.json({ error: "Not found" }, 404));
export default app;
