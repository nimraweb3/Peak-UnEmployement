import { describe, it, expect } from "vitest";
import { nickname, dailyPrompt, prompts } from "../../src/shared/config";
import {
  messageSchema,
  profileSchema,
  reportSchema,
} from "../../src/shared/schemas";
import { timeLabel } from "../../src/react-app/lib/utils";
describe("safe community inputs", () => {
  it("generates safe public nicknames without auth IDs", () => {
    for (let i = 0; i < 100; i++)
      expect(nickname()).toMatch(/^[A-Za-z]+_\d{1,5}$/);
  });
  it("rotates curated prompts on UTC days", () => {
    expect(dailyPrompt(new Date("2026-11-02T00:00:00Z"))).toBe(
      dailyPrompt(new Date("2026-11-02T23:59:59Z")),
    );
    expect(prompts).toContain(dailyPrompt());
  });
  it("trims input and preserves emoji", () => {
    expect(
      messageSchema.parse({
        content: " hello 🫂 ",
        client_id: crypto.randomUUID(),
      }).content,
    ).toBe("hello 🫂");
  });
  it("rejects empty, excessive, multi-link and spoofed messages", () => {
    for (const content of [
      "  ",
      "x".repeat(1001),
      "https://a.test https://b.test",
    ])
      expect(
        messageSchema.safeParse({ content, client_id: crypto.randomUUID() })
          .success,
      ).toBe(false);
    expect(
      messageSchema.safeParse({
        content: "hello",
        client_id: crypto.randomUUID(),
        sender_id: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
  it("rejects admin escalation and unsafe nicknames", () => {
    expect(profileSchema.safeParse({ role: "admin" }).success).toBe(false);
    expect(profileSchema.safeParse({ username: "<script>" }).success).toBe(
      false,
    );
  });
  it("requires a supported report category", () => {
    expect(
      reportSchema.safeParse({
        target_user: crypto.randomUUID(),
        category: "bad",
      }).success,
    ).toBe(false);
  });
  it("formats timestamps without rendering markup", () =>
    expect(timeLabel("2026-11-02T12:30:00Z")).toMatch(/\d/));
});
