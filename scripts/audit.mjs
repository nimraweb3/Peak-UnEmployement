import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("docs/audits", { recursive: true });
const chrome = await chromium.launch({
  headless: true,
  args: ["--remote-debugging-port=9333"],
});
const results = [];
try {
  for (const mode of ["mobile", "desktop", "mobile-repeat", "desktop-repeat"]) {
    for (const [name, path] of [
      ["homepage", "/"],
      ["public-room", "/rooms/tech"],
      ["privacy", "/privacy"],
    ]) {
      if (mode.endsWith("repeat") && path !== "/") continue;
      const result = await lighthouse(
        `http://127.0.0.1:4173${path}`,
        {
          port: 9333,
          output: ["html", "json"],
          logLevel: "error",
          onlyCategories: [
            "performance",
            "accessibility",
            "best-practices",
            "seo",
          ],
          disableErrorReporting: true,
          disableStorageReset: mode.endsWith("repeat"),
        },
        mode.startsWith("desktop") ? desktopConfig : undefined,
      );
      writeFileSync(
        `docs/audits/after-hours-${mode}-${name}.html`,
        result.report[0],
      );
      writeFileSync(
        `docs/audits/after-hours-${mode}-${name}.json`,
        result.report[1],
      );
      const row = {
        page: name,
        url: result.lhr.finalDisplayedUrl,
        date: result.lhr.fetchTime,
        version: result.lhr.lighthouseVersion,
        mode: `${mode} simulated throttling; local production build; Supabase unconfigured`,
        scores: Object.fromEntries(
          Object.entries(result.lhr.categories).map(([k, v]) => [
            k,
            Math.round(v.score * 100),
          ]),
        ),
        metrics: Object.fromEntries(
          [
            "first-contentful-paint",
            "largest-contentful-paint",
            "total-blocking-time",
            "cumulative-layout-shift",
            "speed-index",
          ].map((k) => [k, result.lhr.audits[k].numericValue]),
        ),
        failures: Object.values(result.lhr.audits)
          .filter((a) => a.score !== null && a.score < 1)
          .map((a) => ({
            id: a.id,
            title: a.title,
            displayValue: a.displayValue,
            details: a.details,
          })),
      };
      results.push(row);
      console.log(
        JSON.stringify({
          ...row,
          failures: row.failures.map((f) => ({
            id: f.id,
            value: f.displayValue,
          })),
        }),
      );
    }
  }
  writeFileSync(
    "docs/audits/after-hours-lighthouse-summary.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await chrome.close();
}
