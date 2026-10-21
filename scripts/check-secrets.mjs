import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Scan Git's staged blobs as well as filenames; a later working-tree edit cannot hide a staged secret.
export function auditContent(name, data, privateValues = []) {
  const issues = [];
  const base = name.replaceAll("\\", "/").split("/").pop();
  if (/^\.env(?:\.|$)/i.test(base) && base.toLowerCase() !== ".env.example") issues.push("private environment file");
  if (/\.(pfx|pem|key)$/i.test(base)) issues.push("private credential file");
  const text = data.toString("utf8");
  const patterns = [
    /\bsk-[a-zA-Z0-9_-]{24,}\b/,
    /\bgh[pousr]_[a-zA-Z0-9]{30,}\b/,
    /github_pat_[a-zA-Z0-9_]{40,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ];
  if (patterns.some(pattern => pattern.test(text))) issues.push("credential pattern");
  if (privateValues.some(value => data.includes(Buffer.from(value)))) issues.push("local private value");
  return issues;
}

if (process.argv[1]?.endsWith("check-secrets.mjs")) {
  const staged = process.argv.includes("--staged");
  const files = execFileSync("git", staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"] : ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  const privateValues = [];
  try {
    const env = readFileSync(".env.local", "utf8");
    const key = env.match(/^MODEL_API_KEY\s*=\s*["']?([^\r\n"']+)/m)?.[1]?.trim();
    if (key && key.length > 12) privateValues.push(key);
  } catch { /* A clean checkout does not contain local credentials. */ }
  let failed = false;
  for (const file of files) {
    const data = staged ? execFileSync("git", ["show", ":" + file], { maxBuffer: 30 * 1024 * 1024 }) : readFileSync(file);
    const issues = auditContent(file, data, privateValues);
    if (issues.length) { failed = true; console.error(`Blocked: ${file} (${issues.join(", ")})`); }
  }
  console.log(`Secret audit: ${files.length} files, ${failed ? "FAILED" : "passed"}. Credential values are never printed.`);
  process.exitCode = failed ? 1 : 0;
}
