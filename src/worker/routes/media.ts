import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { HTTPException } from "hono/http-exception";
import { type Env, unwrap } from "../lib";
import { sanitizeProfileImage } from "../media";
const app = new Hono<Env>();
for (const method of ["post", "delete"] as const)
  app[method]("/api/me/media/:kind", async (c) => {
    const kind = c.req.param("kind");
    if (kind !== "avatar" && kind !== "banner")
      throw new HTTPException(400, { message: "Choose avatar or banner." });
    if (!c.env.SUPABASE_SERVICE_ROLE_KEY)
      throw new HTTPException(503, {
        message: "Profile uploads aren’t configured.",
      });
    const pid = unwrap(await c.get("db").rpc("my_profile_id")) as string;
    const lease = unwrap(
      await c.get("db").rpc("begin_profile_media"),
    ) as string;
    let bytes: Uint8Array | undefined;
    if (method === "post") {
      if (c.req.header("Content-Type") !== "image/jpeg")
        throw new HTTPException(415, {
          message: "Use the image cropper to upload a JPEG.",
        });
      try {
        bytes = sanitizeProfileImage(
          new Uint8Array(await c.req.arrayBuffer()),
          kind,
        );
      } catch {
        throw new HTTPException(400, {
          message:
            "The image is invalid, too large, or has the wrong dimensions.",
        });
      }
    }
    const admin = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const bucket = admin.storage.from("profile-media");
    const path = bytes ? `${pid}/${kind}/${lease}.jpg` : null;
    if (bytes && path) {
      const uploaded = await bucket.upload(path, bytes, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });
      if (uploaded.error)
        throw new HTTPException(503, {
          message: "Upload failed. Try again in two minutes.",
        });
    }
    const saved = await admin.rpc("finish_profile_media", {
      pid,
      lease,
      kind,
      path,
    });
    if (saved.error) {
      if (path) await bucket.remove([path]);
      throw new HTTPException(409, {
        message: "The upload expired. Please try again.",
      });
    }
    const previous = saved.data?.previous;
    if (previous) {
      const cleanup = await bucket.remove([previous]);
      if (cleanup.error)
        console.error("media_cleanup_pending", { profile: pid });
    }
    return c.json({ path });
  });
export default app;
