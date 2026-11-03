import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { dbClient, type Env } from "./lib";
import profile from "./routes/profile";
import chat from "./routes/chat";
import social from "./routes/social";
import admin from "./routes/admin";
const app = new Hono<Env>();
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});
app.use(
  "/api/*",
  secureHeaders(),
  bodyLimit({
    maxSize: 8192,
    onError: (c) => c.json({ error: "Request too large" }, 413),
  }),
);
app.get("/api/health", (c) =>
  c.json({
    ok: true,
    configured: !!(c.env.SUPABASE_URL && c.env.SUPABASE_PUBLISHABLE_KEY),
  }),
);
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
  c.set("db", db);
  c.set("authId", data.user.id);
  await next();
});
app.route("/", profile);
app.route("/", chat);
app.route("/", social);
app.route("/", admin);
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
