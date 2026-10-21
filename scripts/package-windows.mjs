import { spawnSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, writeFile, rm, stat, access } from "node:fs/promises";
import { basename, join, resolve, relative } from "node:path";
import { auditContent } from "./check-secrets.mjs";
import { hash, nodeRuntime, powershell, root, runtimeVersion, within } from "./release-utils.mjs";

if (process.platform !== "win32" || process.arch !== "x64") throw new Error("Build Windows x64 releases on Windows x64");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const dist = resolve(root, "dist");
await mkdir(dist, { recursive: true });
const name = `unfinished-dialogues-${pkg.version}-windows-x64`;
const destination = within(dist, resolve(dist, name));
const standalone = resolve(root, ".next-release/standalone");
await access(resolve(standalone, "server.js"));
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
const app = resolve(destination, "app");
const allowed = source => {
  const base = basename(source);
  return !/^\.env(?:\.|$)/i.test(base) && !["cache", ".git", ".npm-cache"].includes(base);
};
await cp(standalone, app, { recursive: true, dereference: true, filter: allowed });
await cp(resolve(root, ".next-release/static"), resolve(app, ".next-release/static"), { recursive: true });
try { await cp(resolve(root, "public"), resolve(app, "public"), { recursive: true }); } catch (error) { if (error.code !== "ENOENT") throw error; }
const runtime = await nodeRuntime();
await mkdir(resolve(destination, "runtime"));
await cp(resolve(runtime, "node.exe"), resolve(destination, "runtime/node.exe"));
await mkdir(resolve(destination, "licenses"));
await cp(resolve(runtime, "LICENSE"), resolve(destination, "licenses/Node.js-LICENSE.txt"));

// Include licenses from every installed package, including transitives used by Next's trace.
async function licenses(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === ".bin") continue;
    const folder = join(directory, entry.name);
    if (entry.name.startsWith("@")) { await licenses(folder); continue; }
    let metadata;
    try { metadata = JSON.parse(await readFile(join(folder, "package.json"), "utf8")); } catch { continue; }
    const documents = (await readdir(folder)).filter(name => /^(licen[sc]e|copying|notice)(\.|$|-)/i.test(name));
    for (const document of documents) {
      const source = join(folder, document);
      if (!(await stat(source)).isFile()) continue;
      const target = resolve(destination, "licenses", `${metadata.name.replaceAll("/", "__")}@${metadata.version}`);
      await mkdir(target, { recursive: true }); await cp(source, join(target, document));
    }
    try { await licenses(join(folder, "node_modules")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
await licenses(resolve(root, "node_modules"));
for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) await cp(resolve(root, file), resolve(destination, file));
await cp(resolve(root, "desktop/portable-help.txt"), resolve(destination, "使用说明.txt"));
const compiler = resolve(process.env.WINDIR || "C:/Windows", "Microsoft.NET/Framework64/v4.0.30319/csc.exe");
const compile = spawnSync(compiler, ["/nologo", "/target:winexe", "/platform:x64", "/optimize+", "/utf8output", `/out:${resolve(destination, "未竟.exe")}`, "/reference:System.Windows.Forms.dll", "/reference:System.Drawing.dll", "/reference:System.Security.dll", "/reference:System.Web.Extensions.dll", resolve(root, "desktop/Launcher.cs")], { stdio: "inherit", windowsHide: true });
if (compile.error) throw compile.error;
if (compile.status !== 0) throw new Error("Launcher compilation failed");

const privateValues = [];
try {
  const env = await readFile(resolve(root, ".env.local"), "utf8");
  const key = env.match(/^MODEL_API_KEY\s*=\s*["']?([^\r\n"']+)/m)?.[1]?.trim();
  if (key && key.length > 12) privateValues.push(key);
} catch { /* CI contains no private configuration. */ }
let count = 0;
async function audit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { await audit(path); continue; }
    if (!entry.isFile()) throw new Error("Unexpected non-file in release");
    const issues = auditContent(relative(destination, path), await readFile(path), privateValues);
    if (issues.length) throw new Error(`Release audit blocked ${relative(destination, path)} (${issues.join(", ")})`);
    count++;
  }
}
await audit(destination);
await writeFile(resolve(destination, "release.json"), JSON.stringify({ app: pkg.name, version: pkg.version, platform: "windows-x64", runtime: runtimeVersion, license: "MIT", credentialFiles: false }, null, 2) + "\n");
await audit(destination);
const zip = within(dist, resolve(dist, name + ".zip"));
await rm(zip, { force: true });
powershell("Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:UNFINISHED_SOURCE, $env:UNFINISHED_ZIP, [IO.Compression.CompressionLevel]::Optimal, $true)", { UNFINISHED_SOURCE: destination, UNFINISHED_ZIP: zip });
const checksum = hash(await readFile(zip));
await writeFile(resolve(dist, "SHA256SUMS.txt"), `${checksum}  ${name}.zip\n`);
console.log(`Release audit passed: ${count} files, no private environment or credentials.`);
console.log(`Created ${relative(root, zip)} (${((await stat(zip)).size / 1024 / 1024).toFixed(1)} MiB)`);
