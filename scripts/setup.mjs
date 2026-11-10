import { copyFileSync, existsSync, readFileSync, constants } from "node:fs";
import { parseEnv } from "node:util";
for (const [source, target] of [
  [".env.example", ".env.local"],
  [".dev.vars.example", ".dev.vars"],
]) {
  if (!existsSync(target)) {
    copyFileSync(source, target, constants.COPYFILE_EXCL);
    console.log("Created " + target + " (ignored by Git).");
  } else console.log("Preserved " + target + ".");
}
const client = parseEnv(readFileSync(".env.local", "utf8"));
const server = parseEnv(readFileSync(".dev.vars", "utf8"));
const requiredClient = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_TURNSTILE_SITE_KEY",
];
const requiredServer = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missing = [
  ...requiredClient.filter((k) => !client[k]),
  ...requiredServer.filter((k) => !server[k]),
];
if (missing.length) {
  console.log("Provider setup remains: " + missing.join(", "));
  console.log(
    "Create the Supabase project and Google OAuth client, then configure SMTP and Turnstile. See docs/community-redesign.md. Do not paste secrets into chat.",
  );
  process.exitCode = 1;
} else {
  console.log(
    "Required local values are present. This checks configuration presence only, not provider connectivity.",
  );
}
