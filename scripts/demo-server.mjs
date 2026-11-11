import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const people = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Demo_River" },
  { id: "10000000-0000-4000-8000-000000000002", name: "Demo_Jules" },
];
export function demoPlugin() {
  return {
    name: "loopback-demo-database",
    apply: "serve",
    async configureServer(server) {
      const db = new PGlite();
      const initialized = await db.query(
        "select to_regclass('public.profiles') existing",
      );
      const run = (id, sql, params = []) =>
        db.transaction(async (tx) => {
          await tx.exec("set local role authenticated");
          await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
            id,
          ]);
          return (await tx.query(sql, params)).rows;
        });
      const mutate = async (id, action, payload) =>
        (
          await run(id, "select public.mutate($1,$2::jsonb) result", [
            action,
            JSON.stringify(payload),
          ])
        )[0].result;
      if (!initialized.rows[0].existing) {
        await db.exec(
          "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,is_anonymous boolean default true,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;",
        );
        for (const file of readdirSync("supabase/migrations").sort())
          await db.exec(
            readFileSync("supabase/migrations/" + file, "utf8").replace(
              /alter publication supabase_realtime[^;]*;/g,
              "",
            ),
          );
        await db.exec(readFileSync("supabase/seed.sql", "utf8"));
        for (const person of people) {
          await db.query("insert into auth.users(id) values($1)", [person.id]);
          await run(person.id, "select public.bootstrap_profile()");
          await mutate(person.id, "profile", {
            username: person.name,
            onboarding_completed: true,
            allows_dm_requests: true,
          });
        }
        const room = (
          await db.query("select id from public.rooms where slug='lounge'")
        ).rows[0].id;
        await mutate(people[0].id, "send", {
          room_id: room,
          content:
            "Demo conversation: I’m making time for one portfolio update today. What are you working on?",
          client_id: randomUUID(),
        });
        await mutate(people[1].id, "send", {
          room_id: room,
          content:
            "Demo conversation: interview prep, then a proper lunch away from my laptop.",
          client_id: randomUUID(),
        });
      }
      const sessions = new Map();
      server.httpServer?.once("close", () => void db.close());
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const host = req.headers.host || "";
        if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
          res.statusCode = 403;
          return res.end();
        }
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        const send = (data, status = 200) => {
          res.statusCode = status;
          res.end(JSON.stringify(data));
        };
        try {
          if (req.method !== "GET" && req.headers.origin !== "http://" + host)
            return send({ error: "Same-origin request required" }, 403);
          const url = new URL(req.url, "http://" + host);
          const path = url.pathname.slice(4);
          let body = {};
          if (req.method !== "GET") {
            let raw = "";
            for await (const chunk of req) {
              raw += chunk;
              if (raw.length > 8192)
                return send({ error: "Request too large" }, 413);
            }
            body = raw ? JSON.parse(raw) : {};
          }
          const cookie = /(?:^|; )peak_demo=([^;]+)/.exec(
            req.headers.cookie || "",
          )?.[1];
          const id = sessions.get(cookie);
          if (path === "/demo/session") {
            if (req.method === "POST") {
              if (!people.some((p) => p.id === body.id))
                return send({ error: "Unknown demo identity" }, 400);
              if (cookie) sessions.delete(cookie);
              const key = randomUUID();
              sessions.set(key, body.id);
              res.setHeader(
                "Set-Cookie",
                "peak_demo=" + key + "; HttpOnly; SameSite=Strict; Path=/",
              );
              return send({ id: body.id });
            }
            if (req.method === "DELETE") {
              sessions.delete(cookie);
              res.setHeader(
                "Set-Cookie",
                "peak_demo=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
              );
              return send({ ok: true });
            }
            return send({ id: id || null, people });
          }
          const guest = /^\/public\/rooms\/([^/]+)\/messages$/.exec(path);
          if (guest) {
            const cursor = url.searchParams.get("before");
            const before = cursor
              ? JSON.parse(Buffer.from(cursor, "base64").toString())
              : null;
            const result = await db.transaction(async (tx) => {
              await tx.exec("set local role anon");
              return (
                await tx.query(
                  "select public.guest_room_feed($1,$2,$3) result",
                  [guest[1], before?.at || null, before?.id || null],
                )
              ).rows[0].result;
            });
            if (!result) return send({ error: "Room not found" }, 404);
            return send({
              ...result,
              next: result.next
                ? Buffer.from(JSON.stringify(result.next)).toString("base64")
                : null,
            });
          }
          if (!id) return send({ error: "Choose a demo identity first" }, 401);
          const query = (sql, params = []) => run(id, sql, params);
          const change = (action, payload = body) =>
            mutate(id, action, payload);
          if (path === "/me") {
            if (req.method === "PATCH") return send(await change("profile"));
            if (req.method === "DELETE")
              return send(
                {
                  error:
                    "Demo identities are shared fixtures. Use a separate test database for deletion tests.",
                },
                409,
              );
            return send(
              (await query("select to_jsonb(public.bootstrap_profile()) p"))[0]
                .p,
            );
          }
          if (path === "/admin") return send({ admin: false });
          if (path === "/rooms")
            return send(
              await query("select * from public.rooms order by slug"),
            );
          const profile = /^\/profiles\/([^/]+)$/.exec(path);
          if (profile)
            return send(
              (
                await query("select * from public.profiles where id=$1", [
                  profile[1],
                ])
              )[0],
            );
          const messages = /^\/(rooms|conversations)\/([^/]+)\/messages$/.exec(
            path,
          );
          if (messages) {
            const field =
              messages[1] === "rooms" ? "room_id" : "conversation_id";
            if (req.method === "POST")
              return send(
                await change("send", { ...body, [field]: messages[2] }),
                201,
              );
            if (
              field === "conversation_id" &&
              !(
                await query("select public.can_converse($1) ok", [messages[2]])
              )[0].ok
            )
              return send({ error: "Conversation unavailable" }, 403);
            const cursor = url.searchParams.get("before");
            const before = cursor
              ? JSON.parse(Buffer.from(cursor, "base64").toString())
              : null;
            const items = await query(
              "select m.*,to_jsonb(p) profiles,coalesce((select jsonb_agg(jsonb_build_object('user_id',r.user_id,'emoji',r.emoji)) from public.reactions r where r.message_id=m.id),'[]'::jsonb) reactions from public.messages m join public.profiles p on p.id=m.sender_id where m." +
                field +
                "=$1 and ($2::timestamptz is null or (m.created_at,m.id)<($2::timestamptz,$3::uuid)) order by m.created_at desc,m.id desc limit 40",
              [messages[2], before?.at || null, before?.id || null],
            );
            const last = items.at(-1);
            return send({
              items,
              next:
                items.length === 40
                  ? Buffer.from(
                      JSON.stringify({ at: last.created_at, id: last.id }),
                    ).toString("base64")
                  : null,
            });
          }
          const message = /^\/messages\/([^/]+)(\/reactions)?$/.exec(path);
          if (
            message &&
            (message[2]
              ? ["POST", "DELETE"].includes(req.method)
              : req.method === "DELETE")
          )
            return send(
              await change(
                message[2]
                  ? req.method === "POST"
                    ? "react"
                    : "unreact"
                  : "delete_message",
                { ...body, id: message[1] },
              ),
            );
          if (path === "/dm-requests") {
            if (req.method === "POST")
              return send(await change("request"), 201);
            return send(
              await query(
                "select d.*,to_jsonb(s) sender,to_jsonb(r) recipient from public.dm_requests d join public.profiles s on s.id=d.sender_id join public.profiles r on r.id=d.recipient_id order by d.created_at desc limit 100",
              ),
            );
          }
          const request = /^\/dm-requests\/([^/]+)$/.exec(path);
          if (request && req.method === "PATCH")
            return send(await change("respond", { ...body, id: request[1] }));
          if (path === "/conversations")
            return send(
              (await query("select public.list_conversations() result"))[0]
                .result,
            );
          const conversation = /^\/conversations\/([^/]+)$/.exec(path);
          if (
            conversation &&
            req.method === "PATCH" &&
            ["read", "close"].includes(body.action)
          )
            return send(await change(body.action, { id: conversation[1] }));
          if (path === "/blocks") {
            if (req.method === "POST") return send(await change("block"));
            return send(
              await query(
                "select b.*,to_jsonb(p) profile from public.blocks b join public.profiles p on p.id=b.blocked_id",
              ),
            );
          }
          const block = /^\/blocks\/([^/]+)$/.exec(path);
          if (block && req.method === "DELETE")
            return send(await change("unblock", { user_id: block[1] }));
          if (path === "/reports" && req.method === "POST")
            return send(await change("report"), 201);
          return send({ error: "Demo endpoint not found" }, 404);
        } catch (error) {
          return send(
            {
              error:
                error instanceof Error ? error.message : "Demo request failed",
            },
            400,
          );
        }
      });
    },
  };
}
