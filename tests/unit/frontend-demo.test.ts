// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import type { Message, Request, Conversation } from "../../src/shared/types";
let demo: typeof import("../../src/react-app/lib/frontend-demo");
beforeEach(async () => {
  vi.resetModules();
  demo = await import("../../src/react-app/lib/frontend-demo");
});
it("lets guests read samples but requires a local identity for writes", async () => {
  expect(
    (await demo.localApi<{ items: unknown[] }>("/public/rooms/lounge/messages"))
      .items.length,
  ).toBeGreaterThan(0);
  await expect(
    demo.localApi("/rooms/lounge/messages", "POST", { content: "Hello" }),
  ).rejects.toThrow("Join anonymously");
  expect(demo.joinLocal().allows_dm_requests).toBe(false);
});
it("deduplicates sends and clears personal messages on leaving", async () => {
  demo.joinLocal();
  const body = { content: "A small win today 😀", client_id: "one-send" };
  const first = await demo.localApi<Message>(
    "/rooms/lounge/messages",
    "POST",
    body,
  );
  expect(
    (await demo.localApi<Message>("/rooms/lounge/messages", "POST", body)).id,
  ).toBe(first.id);
  demo.leaveLocal();
  demo.joinLocal();
  expect(
    (
      await demo.localApi<{ items: Message[] }>("/rooms/lounge/messages")
    ).items.some((m) => m.id === first.id),
  ).toBe(false);
});
it("requires opt-in and acceptance before a sample private conversation", async () => {
  demo.joinLocal();
  await expect(demo.localApi("/demo/incoming", "POST")).rejects.toThrow(
    "Enable requests first",
  );
  await demo.localApi("/me", "PATCH", { allows_dm_requests: true });
  await demo.localApi("/demo/incoming", "POST");
  expect(await demo.localApi("/conversations")).toEqual([]);
  const [request] = await demo.localApi<Request[]>("/dm-requests");
  await demo.localApi(`/dm-requests/${request.id}`, "PATCH", {
    status: "accepted",
  });
  const [conversation] = await demo.localApi<Conversation[]>("/conversations");
  await demo.localApi("/blocks", "POST", { user_id: request.sender_id });
  await expect(
    demo.localApi(`/conversations/${conversation.id}/messages`, "POST", {
      content: "Hello",
    }),
  ).rejects.toThrow("unavailable");
});
it("does not pretend to submit moderation reports", async () => {
  demo.joinLocal();
  await expect(
    demo.localApi("/reports", "POST", { reason: "spam" }),
  ).rejects.toThrow("Nothing was submitted");
});
