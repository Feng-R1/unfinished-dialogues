"use client";

import type { useSoundscape } from "./use-soundscape";
import { Icon } from "./icons";

export function SoundSettings({ sound }: { sound: ReturnType<typeof useSoundscape> }) {
  const { preferences, enabled, playing, state, level } = sound;
  const status = !enabled ? "声音已关闭" : !playing ? "回响已暂停" : preferences.volume === 0 ? "音量为零" : !preferences.ambience && !preferences.effects ? "请选择一种声音" : "回响中";

  return <section className="sound-settings" aria-label="声音设置" data-audio-state={state} data-sound-scene={sound.scene} data-sound-level={level.toFixed(6)}>
    <div className="sound-settings-heading">
      <div className="sound-settings-title"><Icon name="volume" size={21}/><div><h3>殿堂回响</h3><p>低沉共鸣，疏落钟磬，悠长泛音。</p></div></div>
      <button className={`switch ${enabled ? "on" : ""}`} role="switch" aria-checked={enabled} aria-label="声音总开关" disabled={sound.starting} onClick={() => void sound.toggle()}><span/></button>
    </div>
    <div className="sound-status"><span><i className={playing && preferences.volume > 0 ? "lit" : ""}/>{sound.starting ? "正在开启声音" : status}</span><meter min={0} max={.08} value={level} aria-label="当前声音强度"/></div>
    <div className="sound-option"><div><h3>空间氛围</h3><p>深聊时自动减弱，切到后台时暂停。</p></div><button className={`switch ${preferences.ambience ? "on" : ""}`} role="switch" aria-checked={preferences.ambience} aria-label="空间氛围" onClick={() => sound.update({ ambience: !preferences.ambience })}><span/></button></div>
    <div className="sound-option"><div><h3>交互回响</h3><p>开启思考、走近先贤时，轻响一声。</p></div><button className={`switch ${preferences.effects ? "on" : ""}`} role="switch" aria-checked={preferences.effects} aria-label="交互回响" onClick={() => sound.update({ effects: !preferences.effects })}><span/></button></div>
    <div className="sound-volume"><label htmlFor="sound-volume">整体音量<output htmlFor="sound-volume">{preferences.volume}%</output></label><input id="sound-volume" type="range" min={0} max={100} step={1} value={preferences.volume} onChange={event => sound.update({ volume: Number(event.target.value) })} aria-valuetext={`${preferences.volume}%`}/></div>
    <div className="sound-settings-bottom"><p>每次进入都保持安静。<br/>音量与分项选择会为你记住。</p><button className="text-button sound-preview" disabled={!playing || !preferences.effects || preferences.volume === 0} onClick={() => sound.cue("enter")}><Icon name="play" size={12}/>试听回响</button></div>
    {sound.error && <p className="sound-error" role="status">{sound.error}</p>}
  </section>;
}
