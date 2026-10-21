import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

export const root = resolve(import.meta.dirname, "..");
export const runtimeVersion = "v22.23.3";
export const hash = bytes => createHash("sha256").update(bytes).digest("hex");
export function within(parent, child) {
  const target = resolve(child);
  if (!target.startsWith(resolve(parent) + sep)) throw new Error("Refusing a path outside the intended output directory");
  return target;
}
export function powershell(code, env = {}) {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "$ErrorActionPreference='Stop'; " + code], {
    stdio: "inherit", env: { ...process.env, ...env }, windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("PowerShell operation failed");
}
export async function officialDownload(url, target) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${new URL(url).hostname}`);
  const data = Buffer.from(await response.arrayBuffer());
  await writeFile(target, data);
  return data;
}
export async function nodeRuntime() {
  const cache = resolve(root, ".release-tools");
  await mkdir(cache, { recursive: true });
  const name = `node-${runtimeVersion}-win-x64.zip`;
  const zip = resolve(cache, name);
  const checks = await fetch(`https://nodejs.org/dist/${runtimeVersion}/SHASUMS256.txt`, { signal: AbortSignal.timeout(30000) }).then(response => {
    if (!response.ok) throw new Error("Cannot retrieve official Node.js checksums");
    return response.text();
  });
  const expected = checks.split(/\r?\n/).find(line => line.trim().endsWith(" " + name))?.split(/\s+/)[0];
  if (!expected) throw new Error("Official Node.js checksum missing");
  let bytes;
  try { bytes = await readFile(zip); } catch { bytes = await officialDownload(`https://nodejs.org/dist/${runtimeVersion}/${name}`, zip); }
  if (hash(bytes) !== expected) throw new Error("Node.js archive failed SHA-256 verification; remove the cached zip and retry");
  const extracted = resolve(cache, `node-${runtimeVersion}-win-x64`);
  await rm(extracted, { recursive: true, force: true });
  powershell("Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory($env:UNFINISHED_ZIP, $env:UNFINISHED_DEST)", { UNFINISHED_ZIP: zip, UNFINISHED_DEST: cache });
  console.log(`Verified official Node.js ${runtimeVersion} runtime`);
  return extracted;
}
