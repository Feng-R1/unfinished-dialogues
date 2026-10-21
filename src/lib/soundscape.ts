export type SoundScene = "home" | "intro" | "council" | "chat";
export type SoundCue = "ask" | "enter";
export type SoundPreferences = { ambience: boolean; effects: boolean; volume: number };

export const defaultSoundPreferences: SoundPreferences = { ambience: true, effects: true, volume: 35 };

export function readSoundPreferences(raw: string | null): SoundPreferences {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return { ...defaultSoundPreferences };
    const saved = value as Partial<SoundPreferences>;
    return {
      ambience: typeof saved.ambience === "boolean" ? saved.ambience : true,
      effects: typeof saved.effects === "boolean" ? saved.effects : true,
      volume: typeof saved.volume === "number" && Number.isFinite(saved.volume) ? Math.max(0, Math.min(100, saved.volume)) : 35,
    };
  } catch { return { ...defaultSoundPreferences }; }
}

type Voice = { oscillator: OscillatorNode; envelope: GainNode; kind: "intro" | "effect" };
const sceneLevels: Record<SoundScene, number> = { home: .38, intro: .59, council: .23, chat: .11 };

/** A single, gesture-created audio graph. No remote assets or microphone access. */
export class HallSoundscape {
  readonly context: AudioContext;
  private master: GainNode;
  private bed: GainNode;
  private effects: GainNode;
  private analyser: AnalyserNode;
  private samples: Float32Array<ArrayBuffer>;
  private continuous: AudioScheduledSourceNode[] = [];
  private voices = new Set<Voice>();
  private scene: SoundScene = "home";
  private preferences: SoundPreferences = { ...defaultSoundPreferences };
  private awake = false;
  private disposed = false;
  private suspension: ReturnType<typeof setTimeout> | undefined;
  private lastCue = -Infinity;

  constructor(context: AudioContext) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.bed = context.createGain();
    this.bed.gain.value = 0;
    this.effects = context.createGain();
    this.effects.gain.value = 0;

    const room = context.createConvolver();
    room.buffer = this.roomImpulse();
    const wet = context.createGain();
    wet.gain.value = .32;
    room.connect(wet).connect(this.master);
    this.bed.connect(this.master);
    this.effects.connect(this.master);
    this.bed.connect(room);
    this.effects.connect(room);

    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 12;
    limiter.ratio.value = 5;
    limiter.attack.value = .012;
    limiter.release.value = .3;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.samples = new Float32Array(this.analyser.fftSize);
    this.master.connect(limiter).connect(this.analyser).connect(context.destination);

    // Open fifths, slow independent breaths, and little high-frequency energy.
    const tones = [
      [73.416, .17, -.25, .037], [110.124, .1, .28, .029],
      [146.832, .075, -.13, .043], [220.248, .027, .19, .023],
      [293.664, .012, -.32, .019],
    ];
    for (const [frequency, level, pan, breath] of tones) {
      const oscillator = context.createOscillator();
      oscillator.frequency.value = frequency;
      const gain = context.createGain();
      gain.gain.value = level;
      const panner = context.createStereoPanner();
      panner.pan.value = pan;
      const lfo = context.createOscillator();
      lfo.frequency.value = breath;
      const depth = context.createGain();
      depth.gain.value = level * .3;
      lfo.connect(depth).connect(gain.gain);
      oscillator.connect(gain).connect(panner).connect(this.bed);
      oscillator.start(); lfo.start();
      this.continuous.push(oscillator, lfo);
    }
  }

  private roomImpulse() {
    const length = Math.floor(this.context.sampleRate * 3.4);
    const buffer = this.context.createBuffer(2, length, this.context.sampleRate);
    let seed = 4817;
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let filtered = 0;
      for (let i = 0; i < length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        filtered += ((seed / 4294967296) * 2 - 1 - filtered) * .22;
        data[i] = filtered * Math.exp(-7 * i / length) * Math.min(1, i / (this.context.sampleRate * .025));
      }
    }
    return buffer;
  }

  private fade(parameter: AudioParam, value: number, seconds: number) {
    const now = this.context.currentTime;
    parameter.cancelAndHoldAtTime(now);
    parameter.setTargetAtTime(value, now, seconds);
  }

  private mix() {
    if (this.disposed) return;
    this.fade(this.master.gain, this.awake ? this.preferences.volume / 100 : 0, .12);
    this.fade(this.bed.gain, this.preferences.ambience ? sceneLevels[this.scene] : 0, .8);
    this.fade(this.effects.gain, this.preferences.effects ? .72 : 0, .06);
  }

  setPreferences(preferences: SoundPreferences) {
    this.preferences = preferences;
    if (!preferences.effects || preferences.volume === 0) this.cancelVoices();
    this.mix();
  }

  setScene(scene: SoundScene, elapsed = 0) {
    if (scene === this.scene) return;
    this.cancelVoices("intro");
    this.scene = scene;
    this.mix();
    if (scene === "intro") this.intro(elapsed);
  }

  async resume(scene: SoundScene, elapsed: number) {
    clearTimeout(this.suspension);
    this.awake = true;
    this.scene = scene;
    await this.context.resume();
    if (!this.awake || this.disposed) return;
    this.mix();
    if (scene === "intro") this.intro(elapsed);
  }

  pause() {
    if (this.disposed) return;
    this.awake = false;
    this.cancelVoices();
    this.fade(this.master.gain, 0, .045);
    clearTimeout(this.suspension);
    this.suspension = setTimeout(() => {
      if (!this.awake && this.context.state === "running") void this.context.suspend().catch(() => { /* Disposal may have closed the context. */ });
    }, 450);
  }

  private bell(frequency: number, delay: number, level: number, kind: Voice["kind"]) {
    const start = this.context.currentTime + delay;
    const partials = [[1, 1, 2.8], [2.01, .25, 1.8], [2.76, .09, 1.15], [4.07, .025, .7]];
    for (const [ratio, strength, decay] of partials) {
      const oscillator = this.context.createOscillator();
      oscillator.frequency.value = frequency * ratio;
      const envelope = this.context.createGain();
      envelope.gain.setValueAtTime(0, this.context.currentTime);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(level * strength, start + .07);
      envelope.gain.exponentialRampToValueAtTime(.00001, start + decay);
      oscillator.connect(envelope).connect(this.effects);
      const voice: Voice = { oscillator, envelope, kind };
      this.voices.add(voice);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); this.voices.delete(voice); };
      oscillator.start(start);
      oscillator.stop(start + decay + .05);
    }
  }

  cue(cue: SoundCue) {
    if (!this.canPlay() || this.context.currentTime - this.lastCue < .3) return;
    this.lastCue = this.context.currentTime;
    if (cue === "ask") {
      this.bell(146.832, 0, .1, "effect");
      this.bell(220.248, .32, .055, "effect");
    } else this.bell(293.664, 0, .075, "effect");
  }

  private canPlay() {
    return !this.disposed && this.awake && this.preferences.effects && this.preferences.volume > 0 && this.context.state === "running";
  }

  private intro(elapsed: number) {
    if (!this.canPlay()) return;
    this.cancelVoices("intro");
    // Join the current frame when sound is enabled halfway through the montage.
    this.bell(146.832, 0, .095, "intro");
    for (const [time, frequency, level] of [[2.05, 220.248, .075], [4.1, 293.664, .065], [6.05, 146.832, .12], [6.15, 293.664, .04]]) {
      if (time > elapsed + .2) this.bell(frequency, time - elapsed, level, "intro");
    }
  }

  private cancelVoices(kind?: Voice["kind"]) {
    for (const voice of this.voices) {
      if (kind && voice.kind !== kind) continue;
      this.fade(voice.envelope.gain, 0, .015);
      voice.oscillator.stop(this.context.currentTime + .1);
    }
  }

  measure() {
    if (this.disposed || this.context.state !== "running") return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    let energy = 0;
    for (const sample of this.samples) energy += sample * sample;
    return Math.sqrt(energy / this.samples.length);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.awake = false;
    clearTimeout(this.suspension);
    for (const source of this.continuous) { source.stop(); source.disconnect(); }
    for (const voice of this.voices) { voice.oscillator.stop(); voice.oscillator.disconnect(); voice.envelope.disconnect(); }
    this.voices.clear();
    this.context.onstatechange = null;
    void this.context.close().catch(() => { /* Already closed. */ });
  }
}
