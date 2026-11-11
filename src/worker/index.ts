import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { dbClient, type Env } from "./lib";
import media from "./routes/media";
import accounts from "./routes/accounts";
import profile from "./routes/profile";
import chat from "./routes/chat";
import social from "./routes/social";
import admin from "./routes/admin";
import publicRoutes from "./routes/public";
import pages from "./pages";
const app = new Hono<Env>();
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow, nosnippet");
  await next();
});
app.use("/api/*", secureHeaders(), async (c, next) =>
  bodyLimit({
    maxSize: /^\/api\/me\/media\/(avatar|banner)$/.test(c.req.path)
      ? 524288
      : 8192,
    onError: (c) => c.json({ error: "Request too large" }, 413),
  })(c, next),
);
// Coarse, shared edge protection. PostgreSQL remains authoritative for atomic user limits.
app.use("/api/*", async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP");
  if (c.env.NETWORK_LIMITER && ip) {
    const result = await c.env.NETWORK_LIMITER.limit({ key: `network:${ip}` });
    if (!result.success) {
      c.header("Retry-After", "60");
      return c.json({ error: "Too many requests. Try again shortly." }, 429);
    }
  }
  await next();
});
// Optional same-origin forwarding to the Node runtime for CPU-intensive image work.
app.use("/api/*", async (c, next) => {
  if (!c.env.BACKEND_ORIGIN) return next();
  let origin: URL;
  try {
    origin = new URL(c.env.BACKEND_ORIGIN);
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/"
    )
      throw new Error();
  } catch {
    throw new HTTPException(503, {
      message: "Backend origin is not configured correctly.",
    });
  }
  if (origin.origin === new URL(c.req.url).origin)
    throw new HTTPException(503, {
      message: "Backend origin must be separate from the frontend.",
    });
  const target = new URL(c.req.path + new URL(c.req.url).search, origin);
  const request = new Request(target, c.req.raw);
  if (c.env.API_PROXY_SECRET)
    request.headers.set("X-API-Proxy-Secret", c.env.API_PROXY_SECRET);
  return fetch(request, { redirect: "manual" });
});
app.get("/api/health", (c) =>
  c.json({
    ok: true,
    configured: !!(c.env.SUPABASE_URL && c.env.SUPABASE_PUBLISHABLE_KEY),
  }),
);
app.route("/", publicRoutes);
app.use("/api/*", async (c, next) => {
  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_PUBLISHABLE_KEY)
    throw new HTTPException(503, {
      message: "Connect Supabase to enable authentication and live chat.",
    });
  const token = c.req.header("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HTTPException(401, { message: "Sign in to continue." });
  const db = dbClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_PUBLISHABLE_KEY,
    token,
  );
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new HTTPException(401, {
      message: "Your session expired. Please sign in again.",
    });
  if (!data.user.is_anonymous && !data.user.email_confirmed_at)
    throw new HTTPException(403, {
      message: "Verify your email before joining the conversation.",
    });
  c.set("db", db);
  c.set("authId", data.user.id);
  await next();
});
app.route("/", media);
app.route("/", accounts);
app.route("/", profile);
app.route("/", chat);
app.route("/", social);
app.route("/", admin);
app.route("/", pages);
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  if (err instanceof z.ZodError)
    return c.json({ error: err.issues.map((i) => i.message).join(" ") }, 400);
  if (err instanceof HTTPException)
    return c.json({ error: err.message }, err.status);
  if (err instanceof SyntaxError)
    return c.json({ error: "Invalid request" }, 400);
  console.error("api_error", { path: c.req.path, type: err.name });
  return c.json({ error: "Something went wrong. Please try again." }, 500);
});
export default app;
