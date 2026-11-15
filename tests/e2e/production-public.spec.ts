import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

// Public-only acceptance checks. Never create users or post fixture messages.
test("static documents and crawler boundaries work without JavaScript", async ({request}) => {
  for (const path of ["/", "/rooms/tech", "/community-guidelines"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('<link rel="canonical"');
    expect(html).toMatch(/<h1[\s>]/);
  }
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.headers()["content-type"]).toContain("xml");
  expect(await sitemap.text()).toContain("/rooms/tech");
  expect(await sitemap.text()).not.toContain("/app/");
  const privatePage = await request.get("/app/messages");
  expect(privatePage.headers()["x-robots-tag"]).toContain("noindex");
  expect(await privatePage.text()).toContain('content="noindex, nofollow"');
  const missing = await request.get("/audit-missing-page");
  expect(missing.status()).toBe(404);
});

test("production guidelines navigation and direct refresh", async ({page}) => {
  await page.goto("/");
  await page.getByRole("navigation", {name:"Main navigation"}).getByRole("link", {name:"House rules"}).click();
  await expect(page.getByRole("heading", {level:1})).toHaveText("A few ground rules.");
  await page.reload();
  await expect(page.getByRole("heading", {level:1})).toHaveText("A few ground rules.");
  await expect(page).toHaveTitle(/Community Guidelines/);
});
test("public demo and both shifts reflow with no axe violations", async ({page}) => {
  test.setTimeout(120000);
  mkdirSync("docs/audits",{recursive:true}); mkdirSync("docs/screenshots",{recursive:true});
  const results = [];
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:900});
    await page.goto("/");
    await expect(page.getByRole("heading",{level:1})).toContainText("The group chat");
    for(const theme of ["Day Shift","Night Shift"]) {
      await page.getByRole("radio",{name:theme,exact:true}).check();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const result = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
      results.push({width,theme,violations:result.violations});
      await page.screenshot({path:`docs/screenshots/ux-${width}-${theme.split(" ")[0]}.png`,fullPage:true});
    }
  }
  writeFileSync("docs/audits/ux-public-axe.json",JSON.stringify(results,null,2));
  expect(results.flatMap(r=>r.violations.map(v=>({width:r.width,theme:r.theme,id:v.id,nodes:v.nodes.map(n=>n.target)})))).toEqual([]);
  await page.getByRole("button",{name:"Play demo",exact:true}).click();
  await expect(page.getByText(/Got rejected from a job/)).toBeVisible();
  await page.getByRole("button",{name:"Pause demo"}).click();
  await page.getByRole("button",{name:"Replay demo"}).click();
  await page.getByRole("button",{name:"Skip demonstration"}).click();
  await expect(page.getByLabel("Fictional conversation")).toHaveCount(0);
});
test("auth and legal pages render accessibly; guest workspace is protected", async ({page}) => {
  test.setTimeout(120000);
  const reports=[];
  for(const path of ["/auth", "/auth?mode=signup", "/auth?mode=forgot", "/community-guidelines", "/privacy", "/terms"]) {
    await page.goto(path);
    await expect(page.getByRole("heading",{level:1})).toBeVisible();
    const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
    reports.push({path,violations:result.violations});
  }
  mkdirSync("docs/audits",{recursive:true});
  writeFileSync("docs/audits/ux-routes-axe.json",JSON.stringify(reports,null,2));
  expect(reports.flatMap(r=>r.violations)).toEqual([]);
  await page.goto("/app/rooms/tech");
  await expect(page).toHaveURL(/join\?returnTo=/);
  await expect(page.getByRole("dialog")).toBeVisible();
});
