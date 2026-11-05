import { describe, it, expect, vi, afterEach } from "vitest";
import app from "../../src/worker/index";
const env = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "test-key",
  SUPABASE_SERVICE_ROLE_KEY: "",
};
afterEach(() => vi.unstubAllGlobals());
describe("Worker trust boundary", () => {
  it("rejects oversized bodies before Auth and malformed JSON before mutation", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: crypto.randomUUID(), aud: "authenticated", role: "authenticated" }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const oversized = await app.request("/api/me", { method: "PATCH", headers: { Authorization: "Bearer test", "Content-Type": "application/json" }, body: "x".repeat(9000) }, env);
    expect(oversized.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
    const malformed = await app.request("/api/me", { method: "PATCH", headers: { Authorization: "Bearer test", "Content-Type": "application/json" }, body: "{" }, env);
    expect(malformed.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("exposes configuration status without secrets", async () => {
    const res = await app.request("/api/health", {}, env);
    expect(await res.json()).toEqual({ ok: true, configured: true });
  });
  it("rejects missing credentials", async () => {
    const res = await app.request("/api/me", {}, env);
    expect(res.status).toBe(401);
  });
  it("fails clearly when not configured", async () => {
    const res = await app.request("/api/me", {}, {});
    expect(res.status).toBe(503);
  });
  it("verifies tokens with Supabase instead of trusting claims", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "Invalid JWT" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const res = await app.request(
      "/api/me",
      { headers: { Authorization: "Bearer fake-admin-token" } },
      env,
    );
    expect(res.status).toBe(401);
  });
  it("rejects sender impersonation before writing", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: crypto.randomUUID(),
            aud: "authenticated",
            role: "authenticated",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await app.request(
      `/api/rooms/${crypto.randomUUID()}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "hello",
          client_id: crypto.randomUUID(),
          sender_id: crypto.randomUUID(),
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
