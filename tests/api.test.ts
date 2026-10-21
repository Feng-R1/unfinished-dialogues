import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { POST } from "../src/app/api/dialogue/route";
import { GET as configResponse } from "../src/app/api/config/route";
import { configuration } from "../src/lib/model";
import { consumeResponse } from "../src/lib/dialogue";

const request = (overrides: Record<string, unknown> = {}, origin?: string) => new Request("http://localhost:3000/api/dialogue", {
  method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { origin } : {}) },
  body: JSON.stringify({ philosopherId: "zhuangzi", question: "我该往哪里走？", opening: true, mode: "demo", messages: [], ...overrides }),
});

test("接口与流式协议验证（全部使用本机模拟服务，不产生付费调用）", async t => {
  const original = { MODEL_API_KEY: process.env.MODEL_API_KEY, MODEL_BASE_URL: process.env.MODEL_BASE_URL, MODEL_NAME: process.env.MODEL_NAME };
  delete process.env.MODEL_API_KEY; delete process.env.MODEL_BASE_URL; delete process.env.MODEL_NAME;
  try {
    await t.test("拒绝非法人物、超长问题和跨来源请求", async () => {
      assert.equal((await POST(request({ philosopherId: "unknown" }))).status, 400);
      assert.equal((await POST(request({ question: "a".repeat(2001) }))).status, 400);
      assert.equal((await POST(request({}, "https://unrelated.example"))).status, 403);
    });
    await t.test("Next 本机规范化 URL 不应误拒绝同 Host 的 127.0.0.1 来源", async () => {
      const response = await POST(new Request("http://localhost:3000/api/dialogue", { method: "POST", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "Content-Type": "application/json" }, body: "{}" }));
      // It must reach body validation (400), not be rejected as cross-origin (403).
      assert.equal(response.status, 400);
    });
    await t.test("演示输出带明确结束状态与模式", async () => {
      const response = await POST(request());
      let content = "";
      assert.equal(await consumeResponse(response, text => { content += text; }), "demo");
      assert.match(content, /借来的尺子/);
    });
    await t.test("模式变化和部分配置必须报错，不能静默回退到演示", async () => {
      process.env.MODEL_API_KEY = "test-only-key";
      assert.equal((await POST(request())).status, 409);
      assert.equal((await POST(request({ mode: "live" }))).status, 503);
    });
    await t.test("DeepSeek 正式模型别名可识别，公开配置不包含密钥或接口地址", async () => {
      process.env.MODEL_API_KEY = "test-only-private-key";
      process.env.MODEL_BASE_URL = "https://api.deepseek.com";
      process.env.MODEL_NAME = "deepseek-flash";
      assert.equal(configuration().deepseek, true);
      const response = await configResponse().json();
      assert.deepEqual(response, { mode: "live", ready: true, modelLabel: "DeepSeek V4.1 Flash" });
      assert.ok(!JSON.stringify(response).includes("test-only-private-key"));
      assert.ok(!JSON.stringify(response).includes("api.deepseek.com"));
      process.env.MODEL_BASE_URL = "https://api.deepseek.com.other.example";
      assert.equal(configuration().deepseek, false);
    });
    await t.test("真实 SDK 可解析本机模拟 Chat Completions 流，错误不泄露服务响应", async () => {
      let payload: { model?: string; messages?: { role: string; content: string }[] } = {};
      let fail = false;
      const server = createServer(async (req, res) => {
        let input = "";
        for await (const chunk of req) input += chunk;
        payload = JSON.parse(input);
        if (fail) { res.writeHead(401, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: { message: "secret-test-only-key-sensitive-body" } })); return; }
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        for (const text of ["模拟", "哲学回复"]) res.write(`data: ${JSON.stringify({ id: "local-test", object: "chat.completion.chunk", created: 1, model: "test-model", choices: [{ index: 0, delta: { content: text }, finish_reason: null }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ id: "local-test", object: "chat.completion.chunk", created: 1, model: "test-model", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
        res.end("data: [DONE]\n\n");
      });
      await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      process.env.MODEL_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
      process.env.MODEL_NAME = "test-model";
      try {
        let content = "";
        const mode = await consumeResponse(await POST(request({ mode: "live" })), text => { content += text; });
        assert.equal(mode, "live"); assert.equal(content, "模拟哲学回复");
        assert.equal(payload.model, "test-model");
        assert.equal(payload.messages?.[0]?.role, "system");
        assert.match(payload.messages?.[0]?.content ?? "", /庄子/);
        fail = true;
        const originalLogger = console.error;
        const diagnostics: unknown[][] = [];
        console.error = (...values) => { diagnostics.push(values); };
        try {
          await assert.rejects(consumeResponse(await POST(request({ mode: "live" })), () => {}), error => error instanceof Error && error.message.includes("模型暂时") && !error.message.includes("secret"));
          assert.ok(!JSON.stringify(diagnostics).includes("secret"));
          assert.ok(!JSON.stringify(diagnostics).includes("requestBodyValues"));
        } finally { console.error = originalLogger; }
      } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
    });
  } finally {
    for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
