import { describe, it, expect, vi, afterEach } from "vitest";
import app from "../../src/worker/index";
const env = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "guest-key",
  SITE_URL: "https://community.example",
  ASSETS: {
    fetch: async () =>
      new Response(
        '<html><head><title>Old</title></head><body><div id="root"></div></body></html>',
      ),
  },
};
afterEach(() => vi.unstubAllGlobals());
describe("guest API and crawler boundary", () => {
  it("returns a truthful unavailable state without creating an account", async () => {
    const res = await app.request("/api/public/rooms/lounge/messages", {}, {});
    expect(res.status).toBe(503);
    expect(res.headers.get("X-Robots-Tag")).toContain("noindex");
    expect((await res.json()).code).toBe("NOT_CONFIGURED");
  });
  it("uses only the anonymous credential and rejects malformed cursors", async () => {
    const mock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ room: { slug: "lounge" }, items: [], next: null }),
          { headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", mock);
    const res = await app.request(
      "/api/public/rooms/lounge/messages",
      { headers: { Authorization: "Bearer PRIVATE_TOKEN" } },
      env,
    );
    expect(res.status).toBe(200);
    expect(mock).toHaveBeenCalledTimes(1);
    const args = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(args[0])).toContain("/rest/v1/rpc/guest_room_feed");
    expect(new Headers(args[1].headers).get("Authorization")).toBe(
      "Bearer guest-key",
    );
    expect(
      (
        await app.request(
          "/api/public/rooms/lounge/messages?before=invalid",
          {},
          env,
        )
      ).status,
    ).toBe(400);
  });
  it("renders meaningful public HTML, unique room metadata, and no user messages", async () => {
    const home = await app.request("/", {}, env);
    const html = await home.text();
    expect(home.status).toBe(200);
    expect(html).toContain("The group chat");
    expect(html).toContain("application/ld+json");
    expect(html).toContain("https://community.example/brand/social-share.png");
    expect(html).not.toContain("PRIVATE_TOKEN");
    const room = await app.request("/rooms/tech", {}, env);
    expect(await room.text()).toContain(
      "Tech &amp; Software Chat | Peak Unemployment",
    );
    const privacy = await app.request("/privacy", {}, env);
    expect(await privacy.text()).toContain("Public");
  });
  it("excludes private routes and sends a real 404", async () => {
    for (const path of ["/app/messages", "/join", "/recover"]) {
      const res = await app.request(path, {}, env);
      expect(res.headers.get("X-Robots-Tag")).toContain("noindex");
      expect(await res.text()).not.toContain("application/ld+json");
    }
    const missing = await app.request("/missing", {}, env);
    expect(missing.status).toBe(404);
    expect(missing.headers.get("X-Robots-Tag")).toContain("noindex");
    const sitemap = await (await app.request("/sitemap.xml", {}, env)).text();
    expect(sitemap).toContain("/rooms/tech");
    expect(sitemap).not.toMatch(/\/app|\/join|\/recover/);
  });
});
