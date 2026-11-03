import { test, expect } from "@playwright/test";
test("landing, honest setup state, legal pages, and unknown routes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/peak/);
  await expect(
    page.getByRole("heading", { name: /Unemployed\? You've got company/ }),
  ).toBeVisible();
  await expect(page.getByText("Fictional preview")).toBeVisible();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Enter the unemployment era" }).click();
  await expect(page.getByRole("heading", { name: /A new era/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Join anonymously" }),
  ).toBeDisabled();
  await page.screenshot({ path: "test-results/join-desktop.png" });
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Anonymous doesn’t mean invisible." }),
  ).toBeVisible();
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "This page is between jobs." }),
  ).toBeVisible();
});
test("mobile landing has no horizontal overflow and private routes require auth", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Unemployed\?/ }),
  ).toBeVisible();
  expect(
    await page
      .locator(".hero h1")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Join the chaos" }).first().click();
  await expect(page).toHaveURL(/join/);
  await page.goto("/app/messages");
  await expect(page).toHaveURL(/join/);
});
