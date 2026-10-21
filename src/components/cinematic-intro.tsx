"use client";

import { useEffect, useRef } from "react";
import { quotations } from "@/lib/philosophers";
import { Mark, Icon } from "./icons";
import { StonePortrait } from "./stone-portrait";

const scenes = [
  { kind: "greek" as const, quote: quotations[1], era: "雅典 · 公元前四世纪", className: "scene-socrates" },
  { kind: "east" as const, quote: quotations[0], era: "中国 · 战国", className: "scene-zhuangzi" },
  { kind: "woman" as const, quote: quotations[6], era: "巴黎 · 二十世纪", className: "scene-beauvoir" },
];

export function CinematicIntro({ onFinish, reduced, soundPlaying, soundStarting, soundError, onToggleSound }: { onFinish: () => void; reduced: boolean; soundPlaying: boolean; soundStarting: boolean; soundError: string; onToggleSound: () => void }) {
  const finish = useRef(onFinish);
  finish.current = onFinish;
  const skip = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    skip.current?.focus();
    const timer = setTimeout(() => finish.current(), reduced ? 1600 : 7600);
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") finish.current();
      if (event.key !== "Tab") return;
      const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      else if (!root.current?.contains(document.activeElement)) { event.preventDefault(); skip.current?.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { clearTimeout(timer); window.removeEventListener("keydown", key); document.body.style.overflow = overflow; previous?.focus(); };
  }, [reduced]);

  return <div ref={root} className={`cinematic-intro ${reduced ? "intro-reduced" : ""}`} role="dialog" aria-modal="true" aria-label="未竟，思想穿越时间的序幕">
    <div className="intro-grain"/>
    <div className="intro-topline"><span>思想，从未停止回响。</span><div className="intro-controls"><button className={soundPlaying ? "intro-sound active" : "intro-sound"} onClick={onToggleSound} disabled={soundStarting} aria-pressed={soundPlaying}><Icon name={soundPlaying ? "volume" : "mute"} size={16}/>{soundPlaying ? "声音已开启" : "开启声音"}</button><button ref={skip} onClick={onFinish}>跳过序幕<Icon name="arrow" size={15}/></button></div></div>
    {soundError && <p className="intro-sound-error" role="status">{soundError}</p>}
    <div className="intro-scenes" aria-hidden="true">{scenes.map(scene => <div className={`intro-scene ${scene.className}`} key={scene.className}><div className="intro-epoch">{scene.quote.author}</div><div className="intro-sculpture"><StonePortrait kind={scene.kind}/></div><div className="intro-words"><span className="intro-era">{scene.era}</span><blockquote>{scene.quote.text}</blockquote><div className="intro-citation"><span>{scene.quote.author}</span><small>{scene.quote.source}{scene.quote.note.includes("意译") ? " · 中文意译" : ""}</small></div></div><div className="intro-frame"/></div>)}</div>
    <div className="intro-resolution"><Mark size={53}/><h2>未竟</h2><span className="intro-resolution-rule"/><p>千年思想，此刻相逢。</p></div>
    <div className="intro-bottomline"><span>从你的一个问题开始</span><div className="intro-progress"><i/></div><span>与先贤对话</span></div>
  </div>;
}
