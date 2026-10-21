"use client";

import { useEffect, useRef, useState } from "react";
import { consumeResponse, contextFor, createSession, type Session, type Mode, type Message } from "@/lib/dialogue";
import { readSessions, saveSession, deleteSession } from "@/lib/storage";

type Configuration = { mode: Mode; ready: boolean; modelLabel: string | null };
type RequestEntry = { controller: AbortController; token: string };

export function useGarden() {
  const [session, setSession] = useState<Session | null>(null);
  const current = useRef<Session | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [configError, setConfigError] = useState("");
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const requests = useRef(new Map<string, RequestEntry>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function replace(next: Session | null) { current.current = next; setSession(next); }
  function update(fn: (draft: Session) => void) {
    if (!current.current) return;
    const next = structuredClone(current.current);
    fn(next);
    next.updatedAt = Date.now();
    replace(next);
  }
  async function persist(value: Session) {
    try {
      await saveSession(value);
      setHistory(previous => [value, ...previous.filter(item => item.id !== value.id)].sort((a, b) => b.updatedAt - a.updatedAt));
    } catch { setNotice("本机记录未能保存。请检查浏览器的存储权限或剩余空间；当前对话仍可继续。"); }
  }
  async function refreshConfig() {
    setConfigError("");
    try {
      const response = await fetch("/api/config", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const body = await response.json();
      if (!["demo", "live"].includes(body.mode) || typeof body.ready !== "boolean") throw new Error();
      setConfig(body);
    } catch { setConfigError("暂时无法连接服务，请检查网页服务后重试。"); }
  }
  useEffect(() => {
    void refreshConfig();
    let mounted = true;
    readSessions().then(items => {
      if (!mounted) return;
      setHistory(items);
      try {
        const saved = JSON.parse(sessionStorage.getItem("unfinished-active") || "null");
        const found = items.find(item => item.id === saved?.id);
        if (found) { replace(found); setActiveId(saved.activeId && found.branches[saved.activeId] ? saved.activeId : null); }
      } catch { /* An invalid view marker does not invalidate stored dialogues. */ }
    }).catch(() => { if (mounted) setNotice("本机存储暂不可用。你仍可体验对话，但刷新后可能无法恢复。"); }).finally(() => { if (mounted) setHydrated(true); });
    const activeRequests = requests.current;
    return () => { mounted = false; activeRequests.forEach(r => r.controller.abort()); activeRequests.clear(); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = null; };
    // All request continuations use current refs instead of captured render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem("unfinished-active", JSON.stringify(session ? { id: session.id, activeId } : null)); } catch { /* IndexedDB remains the source of history. */ }
    if (!session) return;
    // Throttle saves so that a long-running reply is recoverable before it finishes.
    if (!saveTimer.current) saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      if (current.current) void persist(current.current);
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, activeId, hydrated]);

  const isCurrent = (key: string, token: string, id: string) => requests.current.get(key)?.token === token && current.current?.id === id;

  function stop(id?: string) {
    const value = current.current;
    if (!value) return;
    for (const [key, entry] of requests.current) {
      if (!id || key === `${value.id}:${id}`) { requests.current.delete(key); entry.controller.abort(); }
    }
    update(draft => {
      Object.entries(draft.branches).forEach(([branchId, branch]) => {
        if (id && branchId !== id) return;
        if (branch.opening.status === "streaming" || branch.opening.status === "idle") branch.opening.status = "stopped";
        branch.messages.forEach(m => { if (m.status === "streaming") m.status = "stopped"; });
      });
    });
  }

  async function opening(id: string) {
    const value = current.current;
    if (!value) return;
    const key = `${value.id}:${id}`;
    if (requests.current.has(key)) return;
    const controller = new AbortController();
    const token = crypto.randomUUID();
    requests.current.set(key, { controller, token });
    update(draft => { draft.branches[id].opening = { content: "", status: "streaming" }; });
    try {
      const response = await fetch("/api/dialogue", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ philosopherId: id, question: value.question, opening: true, mode: value.mode, messages: [] }) });
      await consumeResponse(response, text => { if (isCurrent(key, token, value.id)) update(draft => { draft.branches[id].opening.content += text; }); });
      if (isCurrent(key, token, value.id)) update(draft => { draft.branches[id].opening.status = "complete"; });
    } catch (error) {
      if (isCurrent(key, token, value.id)) update(draft => { const entry = draft.branches[id].opening; entry.status = controller.signal.aborted ? "stopped" : "error"; entry.error = error instanceof Error ? error.message : "未能完成回复，请重试。"; });
    } finally { if (requests.current.get(key)?.token === token) requests.current.delete(key); }
  }

  function start(question: string) {
    if (!config?.ready) { setNotice(configError || "模型配置尚未就绪，请查看设置。"); return; }
    stop();
    if (current.current) void persist(current.current);
    const value = createSession(question, config.mode);
    replace(value);
    void persist(value);
    setActiveId(null);
    value.selectedIds.forEach(id => { void opening(id); });
  }

  async function send(id: string, text: string, retry = false) {
    const value = current.current;
    if (!value || !text.trim()) return;
    const key = `${value.id}:${id}`;
    if (requests.current.has(key)) return;
    if (value.branches[id].opening.status !== "complete") { setNotice("请先完成这位哲学家的首轮回应，再继续对话。"); return; }
    if (value.branches[id].messages.length >= 198 && !retry) { setNotice("这段对话已经很长，可以带着新的问题重新开始。已有记录仍会保留。"); return; }
    const controller = new AbortController();
    const token = crypto.randomUUID();
    requests.current.set(key, { controller, token });
    const replyId = crypto.randomUUID();
    let messages: Message[] = [];
    update(draft => {
      const branch = draft.branches[id];
      if (retry) {
        if (branch.messages.at(-1)?.role === "assistant") branch.messages.pop();
      } else branch.messages.push({ id: crypto.randomUUID(), role: "user", content: text.trim(), status: "complete" });
      messages = [...branch.messages];
      branch.messages.push({ id: replyId, role: "assistant", content: "", status: "streaming" });
    });
    try {
      const response = await fetch("/api/dialogue", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ philosopherId: id, question: value.question, opening: false, mode: value.mode, messages: contextFor(value, id, messages) }) });
      await consumeResponse(response, part => {
        if (isCurrent(key, token, value.id)) update(draft => { const reply = draft.branches[id].messages.find(m => m.id === replyId); if (reply) reply.content += part; });
      });
      if (isCurrent(key, token, value.id)) update(draft => { const reply = draft.branches[id].messages.find(m => m.id === replyId); if (reply) reply.status = "complete"; });
    } catch (error) {
      if (isCurrent(key, token, value.id)) update(draft => { const reply = draft.branches[id].messages.find(m => m.id === replyId); if (reply) { reply.status = controller.signal.aborted ? "stopped" : "error"; reply.error = error instanceof Error ? error.message : "未能完成回复，请重试。"; } });
    } finally { if (requests.current.get(key)?.token === token) requests.current.delete(key); }
  }

  function retry(id: string) {
    const messages = current.current?.branches[id].messages;
    const lastUser = messages?.findLast(m => m.role === "user");
    if (lastUser) void send(id, lastUser.content, true);
  }

  function home() {
    stop();
    if (current.current) void persist(current.current);
    replace(null); setActiveId(null);
  }
  function restore(value: Session) {
    stop();
    if (current.current) void persist(current.current);
    const next = structuredClone(value);
    Object.values(next.branches).forEach(branch => {
      if (["idle", "streaming"].includes(branch.opening.status)) branch.opening.status = "stopped";
      branch.messages.forEach(m => { if (m.status === "streaming") m.status = "stopped"; });
    });
    replace(next); setActiveId(null);
  }
  function replacePerson(previousId: string, nextId: string) {
    stop(previousId);
    update(draft => {
      draft.selectedIds = draft.selectedIds.map(id => id === previousId ? nextId : id);
      draft.branches[nextId] ??= { opening: { content: "", status: "idle" }, messages: [] };
    });
    if (current.current?.branches[nextId].opening.status === "idle") void opening(nextId);
  }
  async function remove(id: string) {
    if (current.current?.id === id) {
      stop();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
      replace(null); setActiveId(null);
    }
    try { await deleteSession(id); setHistory(items => items.filter(item => item.id !== id)); }
    catch { setNotice("删除未完成，请检查浏览器存储权限后重试。"); }
  }
  return { session, activeId, setActiveId, history, config, configError, refreshConfig, hydrated, notice, setNotice, start, opening, send, retry, stop, home, restore, replacePerson, remove };
}
