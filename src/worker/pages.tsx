import { Hono } from "hono";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicPage, roomNames } from "../shared/public-page";
import { LegalPage } from "../shared/public-legal";
import { publicPaths, pageMetadata, structuredData } from "../shared/seo";
import type { Env } from "./lib";
const app = new Hono<Env>();
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function siteOrigin(c: { env: Env["Bindings"]; req: { url: string } }) {
  const configured = c.env.SITE_URL;
  return new URL(configured || c.req.url).origin;
}
app.get("/robots.txt", (c) => {
  const origin = siteOrigin(c);
  return c.text(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /cdn-cgi/\n\nSitemap: ${origin}/sitemap.xml\n`,
  );
});
app.get("/sitemap.xml", (c) => {
  const origin = siteOrigin(c);
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths.map((path) => `<url><loc>${escape(new URL(path, origin).href)}</loc></url>`).join("")}</urlset>`,
    200,
    {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  );
});
app.get("*", async (c) => {
  if (c.req.path.startsWith("/api/"))
    return c.json({ error: "Not found" }, 404);
  if (!c.env.ASSETS) return c.text("Frontend assets are unavailable.", 503);
  const path = c.req.path;
  const slug = path.match(/^\/rooms\/([a-z-]+)$/)?.[1];
  const known =
    publicPaths.includes(path) ||
    path === "/join" ||
    path === "/recover" ||
    /^\/app(?:\/(?:lounge|profile|settings|admin|messages(?:\/[a-f0-9-]+)?|rooms\/[a-z-]+))?$/.test(
      path,
    );
  const base = await c.env.ASSETS.fetch(
    new Request(new URL("/", c.req.url), c.req.raw),
  );
  if (!base.ok) return base;
  let html = await base.text();
  const origin = siteOrigin(c);
  const meta = pageMetadata(path, origin);
  const head = `<title>${escape(meta.title)}</title><meta name="description" content="${escape(meta.description)}"><meta name="robots" content="${meta.indexable ? "index, follow" : "noindex, nofollow"}"><link rel="canonical" href="${escape(meta.canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Peak Unemployment"><meta property="og:title" content="${escape(meta.title)}"><meta property="og:description" content="${escape(meta.description)}"><meta property="og:url" content="${escape(meta.canonical)}"><meta property="og:image" content="${escape(meta.image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Peak Unemployment. The group chat between jobs."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(meta.title)}"><meta name="twitter:description" content="${escape(meta.description)}"><meta name="twitter:image" content="${escape(meta.image)}">${meta.indexable ? `<script type="application/ld+json">${JSON.stringify(structuredData(origin)).replace(/</g, "\\u003c")}</script>` : ""}`;
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta name="description"[^>]*>/, "")
    .replace("</head>", head + "</head>");
  const content =
    path === "/" || (slug && roomNames[slug])
      ? renderToStaticMarkup(<PublicPage slug={slug || "lounge"} />)
      : ["/privacy", "/terms", "/community-guidelines"].includes(path)
        ? renderToStaticMarkup(<LegalPage path={path} />)
        : !known
          ? '<main class="state not-found"><h1>This page doesn’t exist.</h1><p>The conversation is back this way.</p><a class="button button-primary" href="/">Back to the lounge</a></main>'
          : "";
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${content}</div>`,
  );
  return c.html(html, known ? 200 : 404, {
    "Cache-Control": "no-cache",
    "X-Robots-Tag": meta.indexable ? "index, follow" : "noindex, nofollow",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    ...(new URL(c.req.url).protocol === "https:" ? { "Strict-Transport-Security": "max-age=31536000" } : {}),
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...(import.meta.env.PROD
      ? {
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloudflareinsights.com https://*.cloudflareinsights.com; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
        }
      : {}),
  });
});
export default app;
