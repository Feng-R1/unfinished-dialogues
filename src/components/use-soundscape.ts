"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { defaultSoundPreferences, HallSoundscape, readSoundPreferences, type SoundCue, type SoundPreferences, type SoundScene } from "@/lib/soundscape";

const storageKey = "unfinished-sound-preferences";
const pageIsHidden = () => document.visibilityState === "hidden";

export function useSoundscape(scene: SoundScene, monitor: boolean) {
  const engine = useRef<HallSoundscape | null>(null);
  const enabledRef = useRef(false);
  const sceneRef = useRef(scene);
  const sceneSince = useRef(0);
  const preferencesRef = useRef<SoundPreferences>({ ...defaultSoundPreferences });
  const [preferences, setPreferences] = useState<SoundPreferences>({ ...defaultSoundPreferences });
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<"idle" | AudioContextState>("idle");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);

  useEffect(() => {
    try {
      const saved = readSoundPreferences(localStorage.getItem(storageKey));
      preferencesRef.current = saved;
      setPreferences(saved);
    } catch { /* Keep defaults when storage is unavailable. */ }
    return () => { enabledRef.current = false; engine.current?.dispose(); engine.current = null; };
  }, []);

  useEffect(() => {
    sceneRef.current = scene;
    sceneSince.current = performance.now();
    engine.current?.setScene(scene);
  }, [scene]);

  const resume = useCallback(async () => {
    const current = engine.current;
    if (!current || !enabledRef.current || pageIsHidden()) return;
    try {
      await current.resume(sceneRef.current, (performance.now() - sceneSince.current) / 1000);
      if (engine.current !== current || !enabledRef.current) return;
      setState(current.context.state);
      if (pageIsHidden()) { current.pause(); return; }
      if (current.context.state !== "running") throw new Error("Audio context did not resume");
    } catch {
      if (engine.current !== current || !enabledRef.current) return;
      current.pause();
      enabledRef.current = false; setEnabled(false);
      setError("声音暂时无法播放，请再点一次开启，或换用支持声音的浏览器。");
    }
  }, []);

  useEffect(() => {
    const visibility = () => {
      if (document.visibilityState === "hidden") engine.current?.pause();
      else if (enabledRef.current) void resume();
    };
    const leave = () => engine.current?.pause();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", leave); window.removeEventListener("pageshow", visibility); };
  }, [resume]);

  useEffect(() => {
    if (!monitor) return;
    const sample = () => setLevel(engine.current?.measure() ?? 0);
    sample();
    const timer = setInterval(sample, 200);
    return () => clearInterval(timer);
  }, [monitor]);

  async function toggle() {
    setError("");
    if (enabledRef.current && state === "running") {
      enabledRef.current = false; setEnabled(false); engine.current?.pause();
      return;
    }
    setStarting(true);
    try {
      if (!engine.current) {
        const AudioConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioConstructor) throw new Error("Web Audio unavailable");
        const current = new HallSoundscape(new AudioConstructor({ latencyHint: "playback" }));
        engine.current = current;
        current.setPreferences(preferencesRef.current);
        current.context.onstatechange = () => { if (engine.current === current) setState(current.context.state); };
      }
      enabledRef.current = true;
      setEnabled(true);
      await resume();
    } catch {
      enabledRef.current = false; setEnabled(false);
      engine.current?.dispose(); engine.current = null; setState("idle");
      setError("这个浏览器暂时无法开启声音，你可以继续安静地对话。");
    } finally { setStarting(false); }
  }

  function update(value: Partial<SoundPreferences>) {
    const next = readSoundPreferences(JSON.stringify({ ...preferencesRef.current, ...value }));
    preferencesRef.current = next;
    setPreferences(next);
    engine.current?.setPreferences(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Preference saving is optional. */ }
  }

  function cue(value: SoundCue) { if (enabledRef.current && document.visibilityState !== "hidden") engine.current?.cue(value); }

  return { enabled, state, starting, error, level, scene, preferences, toggle, update, cue, playing: enabled && state === "running" };
}
