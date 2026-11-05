import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
test("chat-first public page, intentional join, keyboard dismissal and room context", async ({
  page,
}) => {
  const auth: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/auth/v1/")) auth.push(r.url());
  });
  await page.goto("/");
  await expect(page).toHaveTitle(/Peak Unemployment/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "The group chat",
  );
  await expect(
    page.getByRole("heading", { name: "Conversation on hold." }),
  ).toBeVisible();
  expect(auth).toEqual([]);
  await page
    .getByRole("navigation", { name: "Public chatrooms" })
    .getByRole("link", { name: "Tech & Software" })
    .click();
  await expect(page).toHaveURL(/rooms\/tech/);
  await expect(page.locator("#public-room-title")).toHaveText(
    "Tech & Software",
  );
  await page.getByRole("button", { name: "Join in", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Continue" })).toBeDisabled();
  await expect(dialog.getByLabel("Your public nickname")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Join in", exact: true }),
  ).toBeFocused();
  await expect(page).toHaveURL(/rooms\/tech/);
  expect(auth).toEqual([]);
  await page.goto("/app/messages");
  await expect(page).toHaveURL(/join/);
});
test("responsive screenshots, reflow, accessible themes and modal", async ({
  page,
}) => {
  test.setTimeout(120000);
  mkdirSync("docs/screenshots", { recursive: true });
  mkdirSync("docs/audits", { recursive: true });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Conversation on hold." }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 375, 390, 430, 768, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 650 ? 844 : 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    ).toBe(true);
    const box = await page.locator(".home-chat").boundingBox();
    expect(box!.y).toBeLessThan(width < 650 ? 650 : 800);
    if ([390, 768, 1440].includes(width))
      await page.screenshot({
        path: `docs/screenshots/redesign-${width}.png`,
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const reports = [];
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByLabel("Color theme").selectOption("dark");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    reports.push({ theme, violations: result.violations });
    await page.screenshot({
      path: `docs/screenshots/redesign-${theme}-desktop.png`,
    });
    expect(result.violations, JSON.stringify(result.violations)).toEqual([]);
  }
  await page.getByRole("button", { name: "Join in", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const modal = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  reports.push({ theme: "dark-modal", violations: modal.violations });
  expect(modal.violations).toEqual([]);
  await page.screenshot({ path: "docs/screenshots/redesign-join.png" });
  await page.keyboard.press("Escape");
  await page.getByLabel("Color theme").selectOption("light");
  await page.setViewportSize({ width: 1280, height: 1000 });
  // Reflow equivalent to a 1280px viewport at 400% browser zoom (320 CSS px).
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "200% text resize",
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-reduced", "true");
  writeFileSync(
    "docs/audits/axe-public.json",
    JSON.stringify(reports, null, 2),
  );
});
test("public HTML and real not-found status are available before JavaScript", async ({
  request,
  page,
}) => {
  const html = await request.get("/");
  expect(html.status()).toBe(200);
  expect(await html.text()).toContain("The group chat");
  expect(await html.text()).toContain("application/ld+json");
  const privacy = await request.get("/privacy");
  expect(privacy.status()).toBe(200);
  expect(await privacy.text()).toContain("Privacy");
  const missing = await request.get("/missing");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["x-robots-tag"]).toContain("noindex");
  await page.goto("/missing");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This page doesn’t exist.",
  );
});
test("isolated guest fixtures: empty, populated, safe text, and gated reactions", async ({
  page,
}) => {
  // Fixtures are only intercepted in this test. Production never serves sample activity.
  let items: unknown[] = [];
  await page.route("**/api/public/rooms/*/messages*", (route) =>
    route.fulfill({ json: { room: { slug: "lounge" }, items, next: null } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Quiet in here/ }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/after-hours-empty.png" });
  items = [
    {
      id: "fixture-1",
      content: '<script>alert("fixture")</script>',
      created_at: "2026-11-03T08:00:00Z",
      deleted_at: null,
      author: { username: "TEST_FIXTURE", avatar_seed: "fixture" },
      reactions: [{ emoji: "🎉", count: 1 }],
    },
  ];
  await page.reload();
  await expect(
    page.getByText('<script>alert("fixture")</script>', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Auto-refresh · every 15s")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/after-hours-test-fixture.png" });
  await page
    .getByRole("button", { name: "Join to react 🎉, 1 reactions" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("system theme follows OS changes and explicit preferences survive reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "Conversation on hold." })).toBeVisible();
  await page.getByLabel("Color theme").selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Color theme").selectOption("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#11151B");
});
