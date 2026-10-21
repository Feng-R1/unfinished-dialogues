import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseCouncil, consumeResponse, contextFor, createSession, presentOpening, restoreSession } from "../src/lib/dialogue";
import { byId, philosophers } from "../src/lib/philosophers";
import { needsImmediateSupport } from "../src/lib/demo";

test("真实模型漏写标题或只用单换行时，正文完整保留且不会变成巨幅标题", () => {
  const body = "分清想换方向与怕失败是两件事。前者是你的判断，后者多由对评价的想象放大。家人期待要听，却不该替你决定。";
  assert.deepEqual(presentOpening(body, "先区分能够掌控的事"), { title: "先区分能够掌控的事", paragraphs: [body] });
  assert.deepEqual(presentOpening("分清掌控的边界\n" + body + "\n你能控制什么？", "后备标题"), { title: "分清掌控的边界", paragraphs: [body, "你能控制什么？"] });
  assert.deepEqual(presentOpening("## 分清边界\n\n" + body, "后备标题"), { title: "分清边界", paragraphs: [body] });
});

test("选角始终返回三位已配置人物，并对不同主题采用不同视角", () => {
  for (const question of ["你好", "工作该选择稳定还是热爱", "我总在意别人的评价", "父母和我的关系", "自由与责任", "我拖延不行动"]) {
    const ids = chooseCouncil(question);
    assert.equal(new Set(ids).size, 3);
    assert.ok(ids.every(id => !!byId[id]));
  }
  assert.notDeepEqual(chooseCouncil("父母和我的关系"), chooseCouncil("我拖延不行动"));
  assert.ok(chooseCouncil("不知道该选择稳定，还是热爱。").includes("zhuangzi"));
  assert.ok(!chooseCouncil("不知道该选择稳定，还是热爱。").includes("confucius"));
  assert.equal(philosophers.length, 10);
});

test("不同哲学家拥有独立分支，上下文不会泄漏到另一位", () => {
  const session = createSession("我不知道方向", "demo");
  const [first, second] = session.selectedIds;
  session.branches[first].opening = { content: "第一位的观点", status: "complete" };
  session.branches[first].messages.push({ id: "private", role: "user", content: "只告诉第一位的信息", status: "complete" });
  const context = contextFor(session, second, session.branches[second].messages);
  assert.equal(context.length, 1);
  assert.equal(context[0].content, session.question);
  assert.ok(!JSON.stringify(context).includes("只告诉第一位"));
});

test("恢复记录把中断流标成未完成，损坏数据不能恢复", () => {
  const session = createSession("一个问题", "demo");
  const branch = session.branches[session.selectedIds[0]];
  branch.opening = { content: "部分文字", status: "streaming" };
  branch.messages.push({ id: "reply", role: "assistant", content: "尚未结束", status: "streaming" });
  const restored = restoreSession(JSON.parse(JSON.stringify(session)))!;
  assert.equal(restored.branches[session.selectedIds[0]].opening.status, "stopped");
  assert.equal(restored.branches[session.selectedIds[0]].messages[0].status, "stopped");
  assert.equal(restoreSession({ ...session, selectedIds: ["made-up-person"] }), null);
  assert.equal(restoreSession({ ...session, branches: {} }), null);
  assert.equal(restoreSession({ ...session, selectedIds: [session.selectedIds[0], session.selectedIds[0]] }), null);
  assert.equal(restoreSession({}), null);
});

test("流读取可处理分块中文和末尾无换行，但拒绝被截断的回复", async () => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode('{"type":"delta","text":"你好，世界"}\n{"type":"done","mode":"demo"}');
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 5) controller.enqueue(bytes.slice(i, i + 5)); controller.close(); } });
  let result = "";
  assert.equal(await consumeResponse(new Response(stream), part => { result += part; }), "demo");
  assert.equal(result, "你好，世界");
  await assert.rejects(consumeResponse(new Response('{"type":"delta","text":"部分"}\n'), () => {}), /连接已中断/);
  await assert.rejects(consumeResponse(new Response('{"type":"error","message":"测试错误"}\n'), () => {}), /测试错误/);
});

test("未完成的助手文本不进入后续上下文，原问题保持可用", () => {
  const session = createSession("原始问题", "demo");
  const id = session.selectedIds[0];
  const context = contextFor(session, id, [
    { id: "u", role: "user", content: "我的追问", status: "complete" },
    { id: "a", role: "assistant", content: "不完整回答", status: "stopped" },
  ]);
  assert.deepEqual(context.map(m => m.content), ["原始问题", "我的追问"]);
});

test("明确即时危机表达采用现实支持路径", () => {
  assert.equal(needsImmediateSupport("我不想活了"), true);
  assert.equal(needsImmediateSupport("我不知道工作的意义"), false);
});
