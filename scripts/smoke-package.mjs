import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as netServer } from "node:net";
import { readFile, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { hash, powershell, root, within } from "./release-utils.mjs";

const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const name = `unfinished-dialogues-${pkg.version}-windows-x64`;
const dist = resolve(root, "dist");
const zip = resolve(dist, name + ".zip");
const expected = (await readFile(resolve(dist, "SHA256SUMS.txt"), "utf8")).split(/\s+/)[0];
assert.equal(hash(await readFile(zip)), expected, "Release zip checksum");
// Verify the distributed ZIP after extraction, not the staging directory.
const acceptance = within(dist, resolve(dist, "acceptance"));
await rm(acceptance, { recursive: true, force: true });
await mkdir(acceptance, { recursive: true });
powershell("Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory($env:UNFINISHED_ZIP, $env:UNFINISHED_DEST)", { UNFINISHED_ZIP: zip, UNFINISHED_DEST: acceptance });
const portable = resolve(acceptance, name);
const report = resolve(acceptance, "launcher-report.txt");
const run = (file, args, options) => new Promise((resolveResult, reject) => {
  const child = spawn(file, args, { windowsHide: true, ...options });
  child.once("error", reject); child.once("exit", code => code === 0 ? resolveResult() : reject(new Error(`Process exited ${code}`)));
});
await run(join(portable, "未竟.exe"), ["--self-test"], { env: { ...process.env, UNFINISHED_SELF_TEST_REPORT: report } });
assert.match(await readFile(report, "utf8"), /passed/);
console.log("Launcher: DPAPI, bundled runtime, identity health check, loopback and process cleanup passed");
async function freePort() {
  const server = netServer(); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
let child;
async function stop() {
  if (!child) return;
  const current = child; child = undefined;
  if (process.platform === "win32") {
    await new Promise(resolve => {
      if (current.exitCode !== null) return resolve();
      const timer = setTimeout(resolve, 8000);
      current.once("exit", () => { clearTimeout(timer); resolve(); });
      const killer = spawn("taskkill.exe", ["/pid", String(current.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
      killer.once("exit", () => { if (current.exitCode !== null) { clearTimeout(timer); resolve(); } });
    });
  } else await new Promise(resolve => { if (current.exitCode !== null) return resolve(); current.once("exit", resolve); current.kill(); });
}
async function start(extra) {
  const port = await freePort();
  child = spawn(join(portable, "runtime/node.exe"), ["server.js"], {
    cwd: join(portable, "app"), windowsHide: true, stdio: "ignore",
    env: { ...process.env, NODE_OPTIONS: "", HOSTNAME: "127.0.0.1", PORT: String(port), NEXT_TELEMETRY_DISABLED: "1", MODEL_API_KEY: "", MODEL_BASE_URL: "", MODEL_NAME: "", UNFINISHED_INSTANCE: "package-smoke-test", ...extra },
  });
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 40000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Packaged server exited before readiness");
    try { const health = await fetch(url + "/api/health").then(r => r.json()); if (health.instance === "package-smoke-test") return url; } catch { /* Readiness check, bounded below. */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("Packaged server readiness timeout");
}
let mock;
try {
  let url = await start({});
  assert.deepEqual(await fetch(url + "/api/config").then(r => r.json()), { mode: "demo", ready: true, modelLabel: null });
  const home = await fetch(url).then(r => r.text()); assert.match(home, /未竟/);
  const script = home.match(/<script[^>]+src="([^"?]+\.js[^" ]*)"/)[1];
  assert.equal((await fetch(url + script.replaceAll("&amp;", "&"))).status, 200, "Packaged static scripts");
  const response = await fetch(url + "/api/dialogue", { method: "POST", headers: { "Content-Type": "application/json", Origin: url }, body: JSON.stringify({ philosopherId: "zhuangzi", question: "我想寻找方向", opening: true, mode: "demo", messages: [] }) });
  const body = await response.text(); assert.match(body, /"type":"done","mode":"demo"/);
  assert.equal((await fetch(url + "/api/dialogue", { method: "POST", headers: { Origin: "https://unrelated.example" }, body: "{}" })).status, 403);
  console.log("Portable ZIP: home, static assets, demo streaming, public config and origin rejection passed");
  await stop();
  let captured;
  mock = createServer(async (req, res) => {
    let input = ""; for await (const chunk of req) input += chunk; captured = JSON.parse(input);
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write(`data: ${JSON.stringify({ id: "package-test", object: "chat.completion.chunk", created: 1, model: "test-model", choices: [{ index: 0, delta: { content: "仅使用本机模拟模型" }, finish_reason: null }] })}\n\n`);
    res.end(`data: ${JSON.stringify({ id: "package-test", object: "chat.completion.chunk", created: 1, model: "test-model", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`);
  });
  await new Promise(resolve => mock.listen(0, "127.0.0.1", resolve));
  url = await start({ MODEL_API_KEY: "test-package-private", MODEL_BASE_URL: `http://127.0.0.1:${mock.address().port}/v1`, MODEL_NAME: "test-model" });
  const config = await fetch(url + "/api/config").then(r => r.json()); assert.equal(config.mode, "live"); assert.ok(!JSON.stringify(config).includes("test-package-private"));
  const live = await fetch(url + "/api/dialogue", { method: "POST", headers: { "Content-Type": "application/json", Origin: url }, body: JSON.stringify({ philosopherId: "socrates", question: "我该如何提问", opening: true, mode: "live", messages: [] }) }).then(r => r.text());
  assert.match(live, /仅使用本机模拟模型/); assert.match(live, /"mode":"live"/); assert.equal(captured.model, "test-model");
  console.log("Portable ZIP: server-side runtime model settings and SDK streaming with local mock passed (no paid calls)");
} finally { await stop(); if (mock) await new Promise(resolve => mock.close(resolve)); }
console.log("All packaged application checks passed.");
