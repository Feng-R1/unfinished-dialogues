import { z } from "zod";
import { byId } from "./philosophers";

export const MAX_QUESTION = 2000;
const messageSchema = z.object({
  id: z.string(), role: z.enum(["user", "assistant"]), content: z.string().max(20000),
  status: z.enum(["complete", "streaming", "error", "stopped"]), error: z.string().optional(),
});
const openingSchema = z.object({ content: z.string().max(20000), status: z.enum(["idle", "streaming", "complete", "error", "stopped"]), error: z.string().optional() });
export const sessionSchema = z.object({
  version: z.literal(1), id: z.string(), question: z.string().min(1).max(MAX_QUESTION),
  createdAt: z.number(), updatedAt: z.number(), mode: z.enum(["demo", "live"]),
  selectedIds: z.array(z.string().refine(id => !!byId[id])).min(1).max(3),
  branches: z.record(z.string().refine(id => !!byId[id]), z.object({ opening: openingSchema, messages: z.array(messageSchema).max(200) })),
}).refine(value => value.selectedIds.every(id => !!value.branches[id]) && new Set(value.selectedIds).size === value.selectedIds.length, "人物与对话分支不匹配");
export type Session = z.infer<typeof sessionSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type Branch = Session["branches"][string];
export type Mode = Session["mode"];

export function presentOpening(content: string, fallbackTitle: string) {
  const paragraphs = content.trim().split(/\r?\n+/).map(text => text.trim()).filter(Boolean);
  // A model may omit the requested heading. Keep the complete answer in normal body type.
  const hasTitle = paragraphs.length > 1 && paragraphs[0].length <= 34;
  return { title: hasTitle ? paragraphs[0].replace(/^#{1,6}\s+/, "").replace(/^\*\*(.*?)\*\*$/, "$1") : fallbackTitle, paragraphs: hasTitle ? paragraphs.slice(1) : paragraphs };
}

export function chooseCouncil(question: string): string[] {
  const scores = new Map<string, number>(Object.keys(byId).map(id => [id, 0]));
  const rules: [RegExp, string[]][] = [
    [/方向|意义|迷茫|空虚|为什么活|人生/, ["camus", "zhuangzi", "socrates"]],
    [/稳定|工作|职业|选择|辞职|转行|未来|毕业/, ["epictetus", "beauvoir", "zhuangzi"]],
    [/评价|比较|别人|认可|成功|失败|自卑|焦虑/, ["zhuangzi", "epictetus", "nietzsche"]],
    [/关系|父母|朋友|爱情|恋爱|孤独|伴侣|分手|家庭/, ["confucius", "beauvoir", "aristotle"]],
    [/行动|拖延|开始|努力|学习|坚持|习惯/, ["wang", "aristotle", "epictetus"]],
    [/自由|应该|价值|责任|公平|女性/, ["beauvoir", "nietzsche", "socrates"]],
    [/执着|失去|变化|痛苦|身份|自我/, ["nagarjuna", "zhuangzi", "camus"]],
  ];
  for (const [pattern, ids] of rules) if (pattern.test(question)) ids.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 5 - i));
  const ranked = [...scores].sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0) return ["socrates", "zhuangzi", "epictetus"];
  return ranked.slice(0, 3).map(([id]) => id);
}

export function createSession(question: string, mode: Mode): Session {
  const selectedIds = chooseCouncil(question);
  return { version: 1, id: crypto.randomUUID(), question: question.trim(), createdAt: Date.now(), updatedAt: Date.now(), mode, selectedIds,
    branches: Object.fromEntries(selectedIds.map(id => [id, { opening: { content: "", status: "idle" }, messages: [] }])) };
}

export function restoreSession(raw: unknown): Session | null {
  const result = sessionSchema.safeParse(raw);
  if (!result.success) return null;
  const value = result.data;
  for (const branch of Object.values(value.branches)) {
    if (branch.opening.status === "streaming" || branch.opening.status === "idle") branch.opening.status = "stopped";
    branch.messages.forEach(m => { if (m.status === "streaming") m.status = "stopped"; });
  }
  return value;
}

export function contextFor(session: Session, id: string, messages: Message[]) {
  const branch = session.branches[id];
  const context: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: session.question }];
  if (branch.opening.content) context.push({ role: "assistant", content: branch.opening.content });
  const complete = messages.filter(m => m.content.trim() && (m.role === "user" || m.status === "complete"));
  // Keep the original question and opening, then a bounded recent window.
  let remaining = 26000;
  const recent: typeof context = [];
  for (const m of complete.slice(-24).reverse()) {
    if (remaining < m.content.length) break;
    remaining -= m.content.length;
    recent.unshift({ role: m.role, content: m.content });
  }
  return [...context, ...recent];
}

export type StreamEvent = { type: "delta"; text: string } | { type: "done"; mode: Mode } | { type: "error"; message: string };

export async function consumeResponse(response: Response, onDelta: (text: string) => void): Promise<Mode> {
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `请求未完成（${response.status}），请重试。`);
  }
  if (!response.body) throw new Error("没有收到回复内容，请重试。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneMode: Mode | null = null;
  const processLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as StreamEvent;
    if (event.type === "delta" && typeof event.text === "string") onDelta(event.text);
    else if (event.type === "error") throw new Error(event.message);
    else if (event.type === "done") doneMode = event.mode;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      lines.forEach(processLine);
      if (done) { processLine(buffer); break; }
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  if (!doneMode) throw new Error("连接已中断，已收到的内容为未完成回复。请重试。");
  return doneMode;
}
