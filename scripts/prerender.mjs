import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { loadEnv } from "vite";

// Reuse the Cloudflare public renderer for static Vercel delivery. No database,
// user sessions, private content, or server environment values enter these files.
const root = path.resolve("dist/client");
const template = await fs.readFile(path.join(root, "index.html"), "utf8");
const env = loadEnv("production", process.cwd(), "VITE_SITE_URL");
const origin = new URL(
  process.env.VITE_SITE_URL ||
    env.VITE_SITE_URL ||
    "https://peak-unemployment.vercel.app",
).origin;
await fs.mkdir(".vercel", { recursive: true });
const modulePath = path.resolve(".vercel/public-renderer.mjs");
await build({
  stdin: {
    contents:
      'export {default as pages} from "./src/worker/pages"; export {publicPaths} from "./src/shared/seo";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  outfile: modulePath,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "automatic",
  define: { "import.meta.env.PROD": "true" },
});
const { pages, publicPaths } = await import(pathToFileURL(modulePath).href);
const bindings = {
  SITE_URL: origin,
  ASSETS: {
    fetch: async () =>
      new Response(template, { headers: { "Content-Type": "text/html" } }),
  },
};
for (const route of [
  ...publicPaths,
  "/auth",
  "/join",
  "/recover",
  "/app",
  "/404",
  "/sitemap.xml",
  "/robots.txt",
]) {
  const response = await pages.fetch(new Request(origin + route), bindings);
  const file =
    route === "/"
      ? "index.html"
      : route === "/404"
        ? "404.html"
        : route.includes(".")
          ? route.slice(1)
          : route.slice(1) + "/index.html";
  const destination = path.join(root, file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, await response.text());
}
console.log(
  `Prerendered ${publicPaths.length} public routes, private shells, sitemap and 404.`,
);
