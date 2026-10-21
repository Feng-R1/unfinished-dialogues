"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { byId, philosophers, quotations, type Philosopher } from "@/lib/philosophers";
import { MAX_QUESTION, presentOpening, type Branch, type Message, type Session } from "@/lib/dialogue";
import { useGarden } from "./use-garden";
import { Icon, Mark } from "./icons";
import { Modal } from "./modal";
import { Portrait } from "./portrait";
import { ThoughtAtmosphere } from "./thought-atmosphere";
import { CinematicIntro } from "./cinematic-intro";
import { useSoundscape } from "./use-soundscape";
import { SoundSettings } from "./sound-settings";

type Panel = "library" | "history" | "settings" | "sources" | "about" | null;
const suggestions = ["不知道该选择稳定，还是热爱。", "很在意别人的评价，怎么办？", "努力的意义究竟是什么？"];

export function Garden() {
  const garden = useGarden();
  const { session, activeId, setActiveId } = garden;
  const [panel, setPanel] = useState<Panel>(null);
  const [swapId, setSwapId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [question, setQuestion] = useState("");
  const [validation, setValidation] = useState("");
  const [focused, setFocused] = useState(false);
  const [filter, setFilter] = useState("全部");
  const [introOpen, setIntroOpen] = useState(false);
  const introDecided = useRef(false);
  const introReturnFocus = useRef<HTMLButtonElement | null>(null);
  const reduced = useReducedMotion();
  const input = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const isChat = !!(session && activeId);
  const person = activeId ? byId[activeId] : null;
  const sound = useSoundscape(introOpen ? "intro" : isChat ? "chat" : session ? "council" : "home", panel === "settings");

  useEffect(() => {
    if (session) { const timer = setTimeout(() => heading.current?.focus(), 100); return () => clearTimeout(timer); }
  }, [session?.id, activeId]); // Move focus only for navigation, never for streamed text.

  useEffect(() => {
    try { setPaused(localStorage.getItem("unfinished-paused") === "true"); } catch { /* Optional preference. */ }
  }, []);

  useEffect(() => {
    if (!garden.hydrated || reduced === null || introDecided.current) return;
    introDecided.current = true;
    try {
      const seen = sessionStorage.getItem("unfinished-intro-seen");
      const still = localStorage.getItem("unfinished-paused") === "true";
      sessionStorage.setItem("unfinished-intro-seen", "true");
      if (!seen && !session && !reduced && !still) setIntroOpen(true);
    } catch { /* Storage is optional; the core conversation remains available. */ }
  }, [garden.hydrated, reduced, session]);

  function toggleMotion() {
    setPaused(value => { const next = !value; try { localStorage.setItem("unfinished-paused", String(next)); } catch { /* Optional preference. */ } return next; });
  }

  function finishIntro() {
    setIntroOpen(false);
    requestAnimationFrame(() => { introReturnFocus.current?.focus(); introReturnFocus.current = null; });
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = question.trim();
    if (!text) { setValidation("写下一点想法，再听听他们的看法。试着从一件最近困扰你的事说起。"); input.current?.focus(); return; }
    if (text.length > MAX_QUESTION) { setValidation(`先用 ${MAX_QUESTION} 字以内描述这个问题，之后可以慢慢补充。`); return; }
    setValidation(""); sound.cue("ask"); garden.start(text);
  }

  function onInputKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) submit();
  }

  function openLibrary(id?: string) { setSwapId(id ?? null); setFilter("全部"); setPanel("library"); }
  function selectPerson(id: string) { if (id !== activeId) sound.cue("enter"); setActiveId(id); }
  function choose(personId: string) {
    if (swapId && session) { sound.cue("enter"); garden.replacePerson(swapId, personId); setSwapId(null); setPanel(null); }
    else if (session?.selectedIds.includes(personId)) { selectPerson(personId); setPanel(null); }
    else { setPanel("sources"); setSourceId(personId); }
  }
  const [sourceId, setSourceId] = useState<string | null>(null);
  const sourcePerson = sourceId ? byId[sourceId] : null;

  return <MotionConfig reducedMotion="user"><div className={`garden ${session ? "garden-started" : ""} ${isChat ? "garden-chat" : ""} ${paused || reduced ? "motion-paused" : ""} ${focused ? "input-focused" : ""}`}>
    <a href="#main" className="skip-link" tabIndex={introOpen ? -1 : undefined}>跳到主要内容</a>
    <ThoughtAtmosphere quiet={!!session}/><div className="paper-grain" aria-hidden="true"/>

    <header className="site-header" inert={introOpen}>
      <button className="brand" onClick={garden.home} aria-label="未竟，回到首页"><Mark/><span className="brand-name">未竟<span className="brand-sub">与先贤对话</span></span></button>
      <nav aria-label="主导航">
        <button className="nav-link library-link" onClick={() => openLibrary()}><Icon name="book" size={17}/><span>遇见先贤</span></button>
        <button className="nav-link" onClick={() => setPanel("history")}><Icon name="clock" size={17}/><span>过往对话</span>{garden.history.length > 0 && <span className="nav-count">{garden.history.length}</span>}</button>
        <span className="nav-divider"/>
        <button className={`icon-button sound-toggle ${sound.playing ? "sound-on" : ""}`} aria-pressed={sound.enabled} aria-label={sound.playing ? "静音" : "开启声音"} title={sound.playing ? "静音；可在设置中调整音量" : "开启殿堂回响"} disabled={sound.starting} onClick={() => void sound.toggle()}><Icon name={sound.playing ? "volume" : "mute"} size={19}/></button>
        <button className="icon-button" aria-label="设置与模型连接" onClick={() => setPanel("settings")}><Icon name="settings" size={19}/></button>
      </nav>
    </header>

    <main id="main" className={`main ${session ? "main-dialogue" : "main-home"}`} inert={introOpen}>
      <AnimatePresence mode="wait" initial={false}>
        {!session ? <motion.section key="home" className="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .35 }} aria-labelledby="home-title">
          <div className="home-inner">
            <div className="home-seal" aria-hidden="true"><span/><Mark size={30}/><span/></div>
            <h1 id="home-title">与千年思想<br/>共赴此刻之问</h1>
            <p className="home-subtitle">写下此刻的困惑，听见不同的回答。<br/>选择一位先贤，继续这场未竟的对话。</p>
            <form className={`question-form ${validation ? "has-error" : ""}`} onSubmit={submit}>
              <label htmlFor="question" className="sr-only">你想与先贤讨论的问题</label>
              <textarea ref={input} id="question" placeholder="此刻，什么让你困惑？" value={question} maxLength={MAX_QUESTION} onChange={e => { setQuestion(e.target.value); setValidation(""); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={onInputKey} aria-describedby={validation ? "question-error" : "question-help"} aria-invalid={!!validation} rows={3}/>
              <div className="question-form-bottom"><span id="question-help" className="input-hint">{question.length > 0 ? `${question.length} / ${MAX_QUESTION}` : <><span className="tiny-orbit"/>不必组织好语言</>}</span><button className="primary-button" type="submit" disabled={!garden.hydrated || !garden.config?.ready}><span>{!garden.hydrated || !garden.config ? "正在准备" : "听听不同的看法"}</span><Icon name="arrow" size={18}/></button></div>
            </form>
            {validation && <p className="field-error" id="question-error" role="alert">{validation}</p>}
            {garden.configError && <div className="connection-error" role="alert">{garden.configError}<button onClick={() => void garden.refreshConfig()}>重新连接</button></div>}
            {garden.config && !garden.config.ready && <div className="connection-error" role="alert">模型连接尚未配置完整。<button onClick={() => setPanel("settings")}>查看设置</button></div>}
            <div className="suggestions"><span className="suggestion-label">也许，你正想着</span><div>{suggestions.map(text => <button key={text} onClick={() => { setQuestion(text); setValidation(""); input.current?.focus(); }}>{text}<Icon name="arrow" size={13}/></button>)}</div></div>
            <div className="waiting-philosophers"><div className="mini-portraits">{[byId.zhuangzi, byId.socrates, byId.beauvoir].map(p => <span key={p.id}><Portrait person={p}/></span>)}</div><span>十位先贤，十种看待世界的方式</span><button onClick={() => openLibrary()} aria-label="浏览十位先贤"><Icon name="arrow" size={17}/></button></div>
            {garden.history[0] && <button className="resume-link" onClick={() => garden.restore(garden.history[0])}><Icon name="clock" size={13}/>继续上次的思考<span>{garden.history[0].question}</span><Icon name="arrow" size={13}/></button>}
          </div>
        </motion.section> : isChat && person ? <motion.section key={`chat-${person.id}`} className="chat-layout" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}>
          <aside className="chat-sidebar" aria-label="这次对话的其他视角"><button className="text-button back-link" onClick={() => setActiveId(null)}><Icon name="back" size={16}/>返回所有观点</button><p className="sidebar-label">此刻，与你对话</p><Portrait person={person} large/><h2 className="sidebar-name">{person.name}</h2><p className="roman-name">{person.romanName}</p><p className="sidebar-era">{person.era}<br/>{person.tradition}</p><p className="sidebar-lens">{person.description}</p><button className="source-link" onClick={() => { setSourceId(person.id); setPanel("sources"); }}><Icon name="book" size={15}/>思想依据<Icon name="external" size={12}/></button><div className="other-voices"><p className="sidebar-label">也听听其他声音</p>{session.selectedIds.filter(id => id !== person.id).map(id => <button key={id} onClick={() => selectPerson(id)}><span className="voice-dot" style={{ background: byId[id].color }}/><span>{byId[id].name}</span><Icon name="arrow" size={15}/></button>)}</div></aside>
          <div className="chat-main"><div className="chat-heading"><div><button className="mobile-back icon-button" aria-label="返回所有观点" onClick={() => setActiveId(null)}><Icon name="back"/></button><div><h1 ref={heading} tabIndex={-1}>与{person.name}的对话</h1><p>{person.lens}</p></div></div><button className={`mode-tag ${session.mode}`} onClick={() => setPanel("settings")}><span/>{session.mode === "demo" ? "演示对话" : "模型已连接"}</button></div>
            <ChatThread key={`${session.id}-${person.id}`} session={session} person={person} branch={session.branches[person.id]} onSend={text => garden.send(person.id, text)} onRetry={() => garden.retry(person.id)} onRetryOpening={() => garden.opening(person.id)} onStop={() => garden.stop(person.id)} onSources={() => { setSourceId(person.id); setPanel("sources"); }}/>
          </div>
        </motion.section> : <motion.section key={`council-${session.id}`} className="council" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .4 }} aria-labelledby="council-title">
          <div className="council-topline"><button className="text-button back-link" onClick={garden.home}><Icon name="plus" size={15}/>一个新的问题</button><button className={`mode-tag ${session.mode}`} onClick={() => setPanel("settings")}><span/>{session.mode === "demo" ? "预写示例 · 演示模式" : "模型已连接"}</button></div>
          <div className="council-intro"><span className="small-ornament" aria-hidden="true">✧</span><p className="council-eyebrow">你正在思考</p><h1 id="council-title" ref={heading} tabIndex={-1}>{session.question}</h1><p>答案也许不止一个。<span className="desktop-space"> </span><br className="mobile-break"/>看看哪一种声音，让你想继续。</p></div>
          <div className="council-grid">{session.selectedIds.map((id, i) => <CouncilCard key={id} person={byId[id]} branch={session.branches[id]} index={i} onSelect={() => selectPerson(id)} onRetry={() => garden.opening(id)} onStop={() => garden.stop(id)} onSwap={() => openLibrary(id)}/>)}</div>
          <p className="council-note"><Icon name="leaf" size={15}/>你可以认同，也可以质疑。选择一位，继续你的思考。</p>
        </motion.section>}
      </AnimatePresence>
    </main>

    <footer className="site-footer" inert={introOpen}><div><span className="footer-star">✧</span><span>{session?.mode === "demo" || (!session && garden.config?.mode === "demo") ? "演示模式 · 回应为预写示例" : "AI 思想演绎，并非历史人物原话"}<button onClick={() => setPanel("about")}>了解更多</button></span></div><div><button className="intro-replay" onClick={event => { introReturnFocus.current = event.currentTarget; setIntroOpen(true); }}><Icon name="play" size={11}/>重映开场</button><button className="footer-sources" onClick={() => { setSourceId(null); setPanel("sources"); }}>文字出处</button><button className="motion-toggle" aria-pressed={paused || !!reduced} aria-label={paused || reduced ? "启用背景动效（遵循系统设置）" : "暂停背景动效"} onClick={toggleMotion}><Icon name={paused || reduced ? "play" : "pause"} size={12}/><span>{paused || reduced ? "静止" : "光影流转"}</span></button></div></footer>

    {garden.notice && <div className="notice" role="status"><span>{garden.notice}</span><button className="icon-button" onClick={() => garden.setNotice("")} aria-label="关闭通知"><Icon name="close" size={16}/></button></div>}
    {sound.error && panel !== "settings" && <div className="sound-notice" role="status">{sound.error}</div>}

    {panel === "library" && <Modal title={swapId ? "邀请另一种视角" : "遇见先贤"} subtitle={swapId ? "替换一位声音，已经聊过的内容仍会保留。" : "来自不同的时代，也带来不同的提问方式。"} onClose={() => { setPanel(null); setSwapId(null); }} wide>
      <div className="filter-tabs" role="group" aria-label="按思想传统筛选">{["全部", "东方", "西方"].map(value => <button key={value} aria-pressed={filter === value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>{value}</button>)}<span>首辑 · 十位先贤</span></div>
      <div className="library-grid">{philosophers.filter(p => filter === "全部" || (filter === "东方" ? ["east", "monk"].includes(p.portrait) : !["east", "monk"].includes(p.portrait))).map(p => { const selected = !!session?.selectedIds.includes(p.id); return <button key={p.id} className={`library-person ${selected ? "invited" : ""}`} onClick={() => choose(p.id)} disabled={!!swapId && selected}><Portrait person={p}/><div><span className="library-name">{p.name}</span><span className="library-tradition">{p.tradition}</span><p>{p.lens}</p><span className="library-action">{selected ? <><Icon name="check" size={12}/>已在本次对话</> : swapId ? <>邀请对话<Icon name="arrow" size={13}/></> : <>了解思想<Icon name="arrow" size={13}/></>}</span></div></button>; })}</div><p className="fine-print">肖像为原创矢量艺术化形象，不代表经考证的历史容貌。</p>
    </Modal>}

    {panel === "history" && <HistoryPanel items={garden.history} currentId={session?.id} onClose={() => setPanel(null)} onOpen={value => { garden.restore(value); setPanel(null); }} onDelete={id => garden.remove(id)}/>}
    {panel === "sources" && <Modal title={sourcePerson ? `${sourcePerson.name} · 思想依据` : "文字有来处"} subtitle={sourcePerson ? sourcePerson.description : "背景引文采用固定文本，译文与原文分开标注。"} onClose={() => setPanel(null)}>
      {sourcePerson ? <><div className="source-person"><Portrait person={sourcePerson}/><div><p className="source-person-name">{sourcePerson.name}</p><p>{sourcePerson.tradition} · {sourcePerson.era}</p></div></div><p className="source-intro">{sourcePerson.principles}</p><div className="source-list">{sourcePerson.sources.map(source => <a key={source.title} href={source.url} target="_blank" rel="noopener noreferrer"><span><strong>{source.title}</strong><Icon name="external" size={14}/></span><p>{source.detail}</p></a>)}</div><div className="quiet-callout">这些条目是思想背景和阅读入口，不是对每句生成内容的逐句引证。对话中的现代情境分析属于思想演绎。</div></> : <div className="quotation-list">{quotations.map(quote => <a key={quote.text} href={quote.url} target="_blank" rel="noopener noreferrer"><blockquote>“{quote.text}”</blockquote><p>{quote.author} · {quote.source}<Icon name="external" size={13}/></p><span>{quote.note}</span></a>)}</div>}
    </Modal>}

    {panel === "settings" && <Modal title="让对话继续" subtitle="选择安静的体验，也了解当前的连接方式。" onClose={() => setPanel(null)}>
      <SoundSettings sound={sound}/>
      <div className="setting-row"><div><h3>背景文字动效</h3><p>{reduced ? "已遵循系统的减少动态效果设置" : "缓慢浮现，让阅读保留呼吸"}</p></div><button className={`switch ${!paused && !reduced ? "on" : ""}`} role="switch" aria-checked={!paused && !reduced} aria-label="背景文字动效" onClick={toggleMotion} disabled={!!reduced}><span/></button></div>
      <div className="connection-panel"><div className="connection-panel-title"><Icon name="spark"/><h3>{garden.config?.mode === "live" ? garden.config.ready ? garden.config.modelLabel ?? "模型已配置" : "模型配置未完整" : "当前为演示模式"}</h3></div><p>{garden.config?.mode === "live" ? "已使用服务端配置连接模型，密钥不会发送到网页。对话将发送至模型服务；过往记录仍保存在这个浏览器。" : "你可以体验完整交互。演示回复是预写的思想示例，不能理解任意追问，也不消耗模型额度。"}</p><details><summary>模型连接与隐私</summary><ol><li>服务端从项目的 <code>.env.local</code> 读取连接配置。</li><li>真实调用只发送问题、人物思想背景与当前分支所需的对话。</li><li>修改模型配置后重启服务，再开始一个新问题。</li></ol><p>真实调用按服务商规则计费；旧演示记录会保留演示标记。</p></details></div>
      <div className="setting-privacy"><Icon name="clock" size={18}/><div><h3>记录留在这个浏览器</h3><p>清除网站数据或更换浏览器后，记录不会自动迁移。可在“过往对话”中逐条删除；没有云同步。</p></div></div>
    </Modal>}

    {panel === "about" && <Modal title="思考可以尚未完成" subtitle="这是一处可以带着问题停留的地方。" onClose={() => setPanel(null)}><div className="about-copy"><Mark size={46}/><p>未竟，希望让不同的思想成为一盏灯。它可以照见原先没看见的角落，决定往哪里走的，仍然是你。</p><p>这里的哲学家是根据作品与思想资料设计的 AI 对话角色，回应不是历史人物原话，也不能代替原著阅读或专业帮助。不同思想之间的分歧可以保留下来。</p><p>演示模式使用预写示例；连接真实模型后，问题与必要的对话上下文将发送给所配置的服务。本网站不提供账号和云同步，历史保存在当前浏览器。</p><button className="secondary-button" onClick={() => { setSourceId(null); setPanel("sources"); }}>看看文字的来处<Icon name="book" size={16}/></button></div></Modal>}
    {introOpen && <CinematicIntro reduced={!!reduced || paused} onFinish={finishIntro} soundPlaying={sound.playing} soundStarting={sound.starting} soundError={sound.error} onToggleSound={() => void sound.toggle()}/>}
  </div></MotionConfig>;
}

function CouncilCard({ person, branch, index, onSelect, onRetry, onStop, onSwap }: { person: Philosopher; branch: Branch; index: number; onSelect: () => void; onRetry: () => void; onStop: () => void; onSwap: () => void }) {
  const { opening } = branch;
  const { title, paragraphs } = presentOpening(opening.content, person.lens);
  const streaming = opening.status === "streaming" || opening.status === "idle";
  return <motion.article className="council-card" style={{ "--person-color": person.color } as CSSProperties} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * .1, duration: .4 }}>
    <div className="card-person"><Portrait person={person}/><div><p className="person-tradition">{person.tradition}</p><h2 className={person.name.length > 4 ? "long-name" : undefined}>{person.name}</h2><p className="roman-name">{person.romanName}</p></div></div>
    <div className="card-response">{opening.content ? <><h3>{title}</h3>{paragraphs.map((paragraph, i) => <p key={i} className={i === paragraphs.length - 1 && paragraphs.length > 1 && opening.status === "complete" && /[？?]$/.test(paragraph) ? "card-question" : ""}>{paragraph}</p>)}</> : streaming ? <div className="response-loading"><span className="thinking-dots"><i/><i/><i/></span><span>{person.name}的视角正在展开</span></div> : <p>这份回应还没有展开。</p>}{streaming && opening.content && <span className="stream-cursor" aria-label="正在生成"/>}</div>
    {(opening.status === "error" || opening.status === "stopped") && <div className="reply-error" role="status"><p>{opening.status === "stopped" ? "这份回应尚未完成。" : opening.error}</p><button className="text-button" onClick={onRetry}><Icon name="retry" size={14}/>重新回应</button></div>}
    <div className="card-actions"><button className="continue-button" onClick={onSelect} disabled={!opening.content && opening.status !== "complete"}>与{person.name}继续聊<Icon name="arrow" size={17}/></button><button className="card-swap" onClick={streaming ? onStop : onSwap}>{streaming ? <><Icon name="stop" size={12}/>暂停回应</> : <><Icon name="retry" size={12}/>换一种视角</>}</button></div>
  </motion.article>;
}

function ChatThread({ session, person, branch, onSend, onRetry, onRetryOpening, onStop, onSources }: { session: Session; person: Philosopher; branch: Branch; onSend: (text: string) => Promise<void>; onRetry: () => void; onRetryOpening: () => Promise<void>; onStop: () => void; onSources: () => void }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [follow, setFollow] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const last = branch.messages.at(-1);
  const busy = branch.opening.status === "streaming" || last?.status === "streaming";
  const ready = branch.opening.status === "complete";
  useEffect(() => { if (follow) bottom.current?.scrollIntoView({ behavior: "instant", block: "end" }); }, [branch.opening.content, branch.messages, follow]);
  async function submit(event?: FormEvent, text?: string) {
    event?.preventDefault();
    const value = (text ?? draft).trim();
    if (busy || !ready) return;
    if (!value) { setError("写下一句想法，再继续对话。"); composer.current?.focus(); return; }
    if (value.length > MAX_QUESTION) { setError(`请控制在 ${MAX_QUESTION} 字以内。`); return; }
    setError(""); setDraft(""); setFollow(true);
    await onSend(value);
    composer.current?.focus();
  }
  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && (event.ctrlKey || event.metaKey || window.matchMedia("(pointer: fine)").matches)) { event.preventDefault(); void submit(); }
  }
  return <>
    <div className="thread-wrap"><div className="thread" ref={scroller} tabIndex={0} aria-label="对话记录" onScroll={() => { const element = scroller.current; if (element) setFollow(element.scrollHeight - element.scrollTop - element.clientHeight < 110); }}>
      <div className="thread-date"><span/>这场对话，从这里开始<span/></div>
      <div className="user-message original-question"><span className="message-label">我的困惑</span><p>{session.question}</p></div>
      <div className="assistant-message"><div className="message-author"><span style={{ background: person.color }}/>{person.name}</div><TextContent content={branch.opening.content}/>{busy && !branch.opening.content && <Thinking/>}{branch.opening.status === "streaming" && branch.opening.content && <span className="stream-cursor"/>}{branch.opening.status === "complete" && <button className="inline-source" onClick={onSources}><Icon name="book" size={12}/>思想依据</button>}{["stopped", "error"].includes(branch.opening.status) && <div className="reply-error"><p>{branch.opening.error || "首轮回应尚未完成，请重试后继续。"}</p><button className="text-button" onClick={() => void onRetryOpening()}><Icon name="retry" size={14}/>重新回应</button></div>}</div>
      {branch.messages.map((message, i) => <ChatMessage key={message.id} message={message} person={person} isLast={i === branch.messages.length - 1} onRetry={onRetry}/>)}
      <div ref={bottom} className="thread-bottom"/>
    </div>{!follow && <button className="jump-button" onClick={() => { setFollow(true); bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }}><Icon name="down" size={15}/>回到最新</button>}</div>
    <div className="composer-area">{branch.messages.length === 0 && ready && <div className="followup-suggestions">{["能结合我的处境举个例子吗？", "我有些不认同这个看法。"].map(text => <button key={text} onClick={() => { setDraft(text); composer.current?.focus(); }}>{text}</button>)}</div>}
      <form className="composer" onSubmit={event => void submit(event)}><label htmlFor="chat-input" className="sr-only">继续与{person.name}对话</label><textarea ref={composer} id="chat-input" value={draft} maxLength={MAX_QUESTION} placeholder={ready ? "说说你的想法，也可以提出质疑……" : "等待首轮回应完成，再继续对话……"} onChange={e => { setDraft(e.target.value); setError(""); }} onKeyDown={handleKey} disabled={!ready || busy} rows={2}/><div className="composer-bottom"><span>{draft.length > 1500 ? `${draft.length} / ${MAX_QUESTION}` : "每个未解的问题，都值得被认真对待。"}</span>{busy ? <button type="button" className="send-button stop-button" onClick={onStop} aria-label="停止生成"><Icon name="stop" size={16}/></button> : <button type="submit" className="send-button" disabled={!draft.trim() || !ready} aria-label="发送消息"><Icon name="arrow" size={20}/></button>}</div></form>
      {error && <p className="field-error" role="alert">{error}</p>}<p className="composer-disclaimer">{session.mode === "demo" ? "预写示例不理解任意追问 · 连接模型后可自由交谈" : "AI 思想演绎，可能有误 · 请保留自己的判断"}</p>
    </div>
  </>;
}

function Thinking() { return <span className="thinking-dots" role="status" aria-label="正在思考"><i/><i/><i/></span>; }
function TextContent({ content }: { content: string }) { return <div className="message-content">{content.split(/\n\s*\n/).filter(Boolean).map((text, i) => <p key={i}>{text}</p>)}</div>; }
function ChatMessage({ message, person, isLast, onRetry }: { message: Message; person: Philosopher; isLast: boolean; onRetry: () => void }) {
  return <div className={message.role === "user" ? "user-message" : "assistant-message"}>{message.role === "assistant" && <div className="message-author"><span style={{ background: person.color }}/>{person.name}</div>}<TextContent content={message.content}/>{message.status === "streaming" && (message.content ? <span className="stream-cursor"/> : <Thinking/>)}{["error", "stopped"].includes(message.status) && <div className="reply-error" role="status"><p>{message.status === "stopped" ? "已停止，以上内容未完成。" : message.error}</p>{isLast && <button className="text-button" onClick={onRetry}><Icon name="retry" size={14}/>重新生成</button>}</div>}</div>;
}

function HistoryPanel({ items, currentId, onClose, onOpen, onDelete }: { items: Session[]; currentId?: string; onClose: () => void; onOpen: (value: Session) => void; onDelete: (id: string) => Promise<void> }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const format = (time: number) => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" }).format(time);
  return <Modal title="过往对话" subtitle="问题还在这里，你可以随时回来继续。" onClose={onClose}>{items.length === 0 ? <div className="empty-history"><Icon name="clock" size={36}/><h3>第一场对话，还在等你。</h3><p>写下一个问题，这里就会留下你的思考。</p><button className="secondary-button" onClick={onClose}>开始思考<Icon name="arrow" size={16}/></button></div> : <div className="history-list">{items.map(item => <div className="history-item" key={item.id}><button className="history-open" onClick={() => onOpen(item)}><span className="history-date">{format(item.updatedAt)}{item.mode === "demo" && <span>演示</span>}{item.id === currentId && <span>当前</span>}</span><strong>{item.question}</strong><span className="history-people">{item.selectedIds.map(id => byId[id].name).join("、")}<Icon name="arrow" size={16}/></span></button>{confirmId === item.id ? <div className="delete-confirm"><p>删除后无法从本机恢复。</p><button disabled={deleting} onClick={async () => { setDeleting(true); await onDelete(item.id); setDeleting(false); setConfirmId(null); }}>确认删除</button><button onClick={() => setConfirmId(null)}>保留</button></div> : <button className="icon-button history-delete" aria-label={`删除对话：${item.question.slice(0,20)}`} onClick={() => setConfirmId(item.id)}><Icon name="trash" size={16}/></button>}</div>)}</div>}<p className="fine-print">记录仅保存在当前浏览器。清除网站数据后，记录也会被清除。</p></Modal>;
}
