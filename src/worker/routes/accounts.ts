import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { unwrap, type Env } from "../lib";
import {
  detailsSchema,
  employmentSchema,
  periodSchema,
  usernameSchema,
} from "../../shared/accounts";
import { uuid, profileSchema } from "../../shared/schemas";
const app = new Hono<Env>();
app.post("/api/onboarding/complete", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("complete_onboarding", {
        payload: profileSchema
          .extend({
            start_month: z
              .string()
              .regex(/^\d{4}-(0[1-9]|1[0-2])-01$/)
              .nullable()
              .optional(),
            show_employment: z.boolean().optional(),
          })
          .strict()
          .parse(await c.req.json()),
      }),
    ),
  ),
);
app.get("/api/auth/session", (c) => c.json({ authenticated: true }));
for (const path of [
  "/api/usernames/availability",
  "/api/usernames/suggestions",
])
  app.get(path, async (c) =>
    c.json(
      unwrap(
        await c.get("db").rpc("username_availability", {
          candidate: z
            .string()
            .max(60)
            .parse(c.req.query("username") || ""),
        }),
      ),
    ),
  );
app.get("/api/me/profile", async (c) =>
  c.json(
    unwrap(
      await c
        .get("db")
        .from("profile_details")
        .select("*")
        .eq("profile_id", unwrap(await c.get("db").rpc("my_profile_id")))
        .maybeSingle(),
    ),
  ),
);
app.patch("/api/me/profile", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("account_action", {
        action: "details",
        payload: detailsSchema.parse(await c.req.json()),
      }),
    ),
  ),
);
app.get("/api/me/username", async (c) =>
  c.json(unwrap(await c.get("db").rpc("username_change_status"))),
);
app.patch("/api/me/username", async (c) => {
  const payload = z
    .object({ username: usernameSchema })
    .strict()
    .parse(await c.req.json());
  const result = await c
    .get("db")
    .rpc("mutate", { action: "profile", payload });
  if (result.error?.message.startsWith("Username change limit:"))
    return c.json({ error: "You can change your username once every 30 days. Check your profile for the next available date." }, 429);
  if (result.error?.code === "23505") {
    const checked = await c
      .get("db")
      .rpc("username_availability", { candidate: payload.username });
    return c.json(
      {
        error: "That username was just taken. Choose another.",
        suggestions: checked.data?.suggestions || [],
      },
      409,
    );
  }
  return c.json(unwrap(result));
});
app.get("/api/users/:username", async (c) => {
  const result = unwrap(
    await c.get("db").rpc("public_profile", {
      handle: z.string().max(30).parse(c.req.param("username")),
    }),
  );
  if (!result)
    throw new HTTPException(404, { message: "This profile is unavailable." });
  return c.json(result);
});
app.get("/api/industries", async (c) =>
  c.json(
    unwrap(
      await c.get("db").from("industries").select("id,name").order("name"),
    ),
  ),
);
app.get("/api/industries/:id/professions", async (c) =>
  c.json(
    unwrap(
      await c
        .get("db")
        .from("professions")
        .select("id,name,industry_id")
        .eq("industry_id", c.req.param("id"))
        .order("name"),
    ),
  ),
);
app.get("/api/me/employment", async (c) =>
  c.json(
    unwrap(
      await c.get("db").from("employment_profiles").select("*").maybeSingle(),
    ),
  ),
);
app.patch("/api/me/employment", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("account_action", {
        action: "employment",
        payload: employmentSchema.parse(await c.req.json()),
      }),
    ),
  ),
);
app.get("/api/me/unemployment-periods", async (c) =>
  c.json(
    unwrap(
      await c
        .get("db")
        .from("unemployment_periods")
        .select("*")
        .order("start_month", { ascending: false })
        .limit(50),
    ),
  ),
);
app.post("/api/me/unemployment-periods", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("account_action", {
        action: "period",
        payload: periodSchema.parse(await c.req.json()),
      }),
    ),
    201,
  ),
);
app.patch("/api/me/unemployment-periods/:id", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("account_action", {
        action: "period",
        payload: {
          ...periodSchema.parse(await c.req.json()),
          id: uuid.parse(c.req.param("id")),
        },
      }),
    ),
  ),
);
app.delete("/api/me/unemployment-periods/:id", async (c) =>
  c.json(
    unwrap(
      await c.get("db").rpc("account_action", {
        action: "delete_period",
        payload: { id: uuid.parse(c.req.param("id")) },
      }),
    ),
  ),
);
export default app;
