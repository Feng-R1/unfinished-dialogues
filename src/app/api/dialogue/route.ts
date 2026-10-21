import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { byId } from "@/lib/philosophers";
import { configuration, systemPrompt } from "@/lib/model";
import { demoReply, needsImmediateSupport, supportText } from "@/lib/demo";
import type { StreamEvent } from "@/lib/dialogue";

export const runtime = "nodejs";
export const maxDuration = 90;
const schema = z.object({
  philosopherId: z.string().refine(id => !!byId[id]),
  question: z.string().trim().min(1).max(2000),
  opening: z.boolean(),
  mode: z.enum(["demo", "live"]),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20000) })).max(30),
});

export async function POST(request: Request) {
  // This is a local-first application. Do not accept cross-origin browser requests.
  const origin = request.headers.get("origin");
  // Next can normalize request.url to localhost even when the browser used 127.0.0.1.
  const requestURL = new URL(request.url);
  const expectedHost = request.headers.get("host") ?? requestURL.host;
  if (origin) {
    let valid = false;
    try { valid = new URL(origin).host === expectedHost && ["http:", "https:"].includes(new URL(origin).protocol); } catch { /* Reject invalid origins. */ }
    if (!valid) return Response.json({ error: "请求来源不匹配，请从当前网页重试。" }, { status: 403 });
  }
  const raw = await request.text();
  if (raw.length > 75000) return Response.json({ error: "对话过长，请开启一个新问题。" }, { status: 413 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return Response.json({ error: "请求格式不正确。" }, { status: 400 }); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "问题或对话格式不正确，请检查输入后重试。" }, { status: 400 });
  const body = parsed.data;
  const config = configuration();
  if (body.mode !== config.mode) return Response.json({ error: "模型模式已变化，请回到首页开启新问题。已有记录仍保留。" }, { status: 409 });
  if (!config.ready) return Response.json({ error: "模型配置不完整，请在 .env.local 中同时填写密钥、接口地址和模型名，然后重启服务。" }, { status: 503 });

  const lifetime = new AbortController();
  const abort = () => lifetime.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 80000);
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => { if (!lifetime.signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
      try {
        const latest = [...body.messages].reverse().find(m => m.role === "user")?.content ?? body.question;
        if (config.mode === "demo" || needsImmediateSupport(latest)) {
          const content = needsImmediateSupport(latest) ? supportText : demoReply(body.philosopherId, body.question, body.messages, body.opening);
          const chunks = content.match(/[\s\S]{1,9}/g) ?? [];
          for (const text of chunks) {
            if (lifetime.signal.aborted) break;
            send({ type: "delta", text });
            await new Promise<void>(resolve => setTimeout(resolve, 22));
          }
        } else {
          const provider = createOpenAICompatible({
            name: "configuredModel", apiKey: config.key, baseURL: config.baseURL!,
            // Flash defaults to thinking mode. This conversational experience streams the answer directly,
            // so hidden reasoning cannot exhaust the short opening's token budget before text appears.
            transformRequestBody: args => config.deepseek ? { ...args, thinking: { type: "disabled" } } : args,
          });
          const result = streamText({
            model: provider.chatModel(config.model!),
            system: systemPrompt(body.philosopherId, body.opening),
            messages: body.opening ? [{ role: "user", content: body.question }] : body.messages,
            maxOutputTokens: body.opening ? 600 : 1200,
            maxRetries: 0,
            abortSignal: lifetime.signal,
            // Replace the SDK's default raw-error logger; fullStream still propagates failure below.
            onError: () => { console.error("[dialogue] model_stream_failed"); },
          });
          let hasText = false;
          for await (const part of result.fullStream) {
            if (part.type === "error") throw part.error;
            if (part.type === "text-delta") { hasText = true; send({ type: "delta", text: part.text }); }
          }
          if (!hasText) throw new Error("empty response");
        }
        if (lifetime.signal.aborted) {
          if (!cancelled && !request.signal.aborted) controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: "回复超时。已收到的内容已保留，请重试。" }) + "\n"));
        } else send({ type: "done", mode: config.mode });
      } catch {
        // Never return provider bodies, credentials, prompts or private conversations in errors.
        if (!cancelled && !request.signal.aborted) controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: "模型暂时未能完成回复。请重试；若持续失败，请检查接口地址、模型名称、密钥和服务额度。" }) + "\n"));
      } finally {
        clearTimeout(timeout);
        request.signal.removeEventListener("abort", abort);
        try { controller.close(); } catch { /* The browser may already have cancelled its reader. */ }
      }
    },
    cancel() { cancelled = true; lifetime.abort(); clearTimeout(timeout); request.signal.removeEventListener("abort", abort); },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
}
