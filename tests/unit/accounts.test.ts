import { it, expect } from "vitest";
import jpeg from "jpeg-js";
import { sanitizeProfileImage } from "../../src/worker/media";
import {
  usernameSchema,
  periodSchema,
  monthDuration,
  detailsSchema,
} from "../../src/shared/accounts";
it("normalizes safe usernames and rejects reserved names", () => {
  expect(usernameSchema.parse("  Some_Name ")).toBe("some_name");
  expect(usernameSchema.safeParse("ADMIN").success).toBe(false);
  expect(usernameSchema.safeParse("bad space").success).toBe(false);
});
it("validates dates and computes inclusive calendar months", () => {
  expect(
    periodSchema.safeParse({
      start_month: "2025-04-01",
      end_month: "2025-03-01",
    }).success,
  ).toBe(false);
  expect(monthDuration("2025-12-01", "2026-02-01")).toBe(3);
  expect(detailsSchema.safeParse({ bio: "x".repeat(301) }).success).toBe(false);
});
it("decodes and re-encodes real images; rejects spoofed SVG and bad dimensions", () => {
  expect(() =>
    sanitizeProfileImage(new TextEncoder().encode("<svg/>"), "avatar"),
  ).toThrow();
  const bytes = jpeg.encode(
    { width: 32, height: 32, data: new Uint8Array(32 * 32 * 4).fill(255) },
    80,
  ).data;
  const clean = sanitizeProfileImage(bytes, "avatar");
  expect(jpeg.decode(clean).width).toBe(32);
  expect(() => sanitizeProfileImage(bytes, "banner")).toThrow();
  expect(() =>
    sanitizeProfileImage(new Uint8Array(600000), "avatar"),
  ).toThrow();
});
