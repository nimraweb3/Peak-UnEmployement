// Package only public client output. Never include the Worker output or env files.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("dist/client");
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (
      !entry.name.startsWith(".") &&
      entry.name !== "_headers" &&
      !entry.name.endsWith(".map")
    ) {
      const data = fs.readFileSync(full);
      if (
        /sb_secret_[A-Za-z0-9_-]{20,}|SUPABASE_SERVICE_ROLE_KEY\s*=/.test(
          data.toString(),
        )
      )
        throw new Error("Secret found in client output");
      files.push({
        file: path.relative(root, full).replaceAll("\\", "/"),
        data: data.toString("base64"),
        encoding: "base64",
      });
    }
  }
}
walk(root);
const headers = fs
  .readFileSync("public/_headers", "utf8")
  .split(/\r?\n/)
  .slice(1)
  .filter((l) => l.trim())
  .map((l) => {
    const i = l.indexOf(":");
    return { key: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
  });
const config = {
  version: 2,
  framework: null,
  buildCommand: "",
  installCommand: "",
  headers: [{ source: "/(.*)", headers }],
  routes: undefined,
  rewrites: [
    { source: "/api/:path*", destination: "/api-unavailable.json" },
    { source: "/:path*", destination: "/index.html" },
  ],
};
// Existing static files take precedence over rewrites.
files.push({ file: "vercel.json", data: JSON.stringify(config) });
files.push({
  file: "api-unavailable.json",
  data: JSON.stringify({
    error:
      "Account and chat services are being configured. Please check back soon.",
  }),
});
// Return an actual service-unavailable response instead of a successful API result.
delete config.rewrites;
config.routes = [
  { src: "/api(?:/.*)?", dest: "/api-unavailable.json", status: 503 },
  { src: "/app(?:/.*)?", dest: "/app/index.html" },
  { src: "/u/[^/]+", dest: "/app/index.html" },
  { src: "/auth/callback", dest: "/auth/index.html" },
  { handle: "filesystem" },
  { src: "/.*", dest: "/404.html", status: 404 },
];
const publicDocuments = files.filter(
  (f) =>
    f.file.endsWith("/index.html") &&
    ![
      "app/index.html",
      "auth/index.html",
      "join/index.html",
      "recover/index.html",
    ].includes(f.file),
);
config.routes.splice(
  1,
  0,
  ...publicDocuments.map((f) => ({
    src: "/" + f.file.slice(0, -11) + "/?",
    dest: "/" + f.file,
  })),
  ...["auth", "join", "recover"].map((route) => ({
    src: "/" + route + "/?",
    dest: "/" + route + "/index.html",
  })),
);
config.routes.unshift({
  src: "/(?:app|auth|join|recover|u)(?:/.*)?",
  headers: { "X-Robots-Tag": "noindex, nofollow, nosnippet" },
  continue: true,
});
delete config.headers;
config.routes.unshift({
  src: "/(.*)",
  headers: Object.fromEntries(headers.map((h) => [h.key, h.value])),
  continue: true,
});
files.find((f) => f.file === "vercel.json").data = JSON.stringify(config);
fs.mkdirSync(".vercel", { recursive: true });
const json = JSON.stringify(files);
fs.writeFileSync(".vercel/frontend-upload.json", json);
console.log(
  JSON.stringify({
    files: files.length,
    characters: json.length,
    chunks: Math.ceil(json.length / 24000),
  }),
);
