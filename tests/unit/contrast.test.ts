import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
const css = readFileSync("src/react-app/styles.css", "utf8");
function tokens(selector: string) {
  return Object.fromEntries(
    [
      ...css
        .match(new RegExp(selector + "\\s*\\{([^}]+)"))![1]
        .matchAll(/--([\w-]+):\s*(#[\da-f]+)/gi),
    ].map((m) => [m[1], m[2]]),
  );
}
function luminance(hex: string) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const c = [0, 2, 4]
    .map((n) => parseInt(h.slice(n, n + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
function ratio(a: string, b: string) {
  const l = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (l[0] + 0.05) / (l[1] + 0.05);
}
describe("After Hours contrast tokens", () => {
  for (const [name, selector] of [
    ["light", ":root"],
    ["dark", '\\[data-theme="dark"\\]'],
  ])
    it(`${name} text and interactive boundaries meet AA ratios`, () => {
      const t = tokens(selector);
      for (const surface of ["bg", "surface", "elevated"])
        for (const foreground of ["text", "muted-foreground", "accent", "coral-text"])
          expect(
            ratio(t[foreground], t[surface]),
            `${foreground} on ${surface}`,
          ).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t["action-text"], t.action)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t["lime-text"], t.lime)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t["control-border"], t.surface)).toBeGreaterThanOrEqual(3);
    });
});
