import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

// Scan tracked and untracked, non-ignored source. Never print matched values.
const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp|github_pat|sb_secret)_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /["']?SUPABASE_SERVICE_ROLE_KEY["']?\s*[:=]\s*["'](?:eyJ|sb_secret_)[A-Za-z0-9_.-]{20,}/,
];
const hits = [];
for (const file of new Set(files)) {
  try {
    if (
      statSync(file).size > 2_000_000 ||
      /\.(png|woff2?|jpg|jpeg|ico|pdf)$/i.test(file)
    )
      continue;
    const content = readFileSync(file, "utf8");
    if (patterns.some((pattern) => pattern.test(content))) hits.push(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (hits.length) {
  console.error("Potential secrets found in:", hits.join(", "));
  process.exitCode = 1;
} else
  console.log(
    `Secret pattern check passed (${new Set(files).size} files). This is not a full credential audit.`,
  );
