// All sound is synthesized with WebAudio — no audio files, no network.
// A tiny step-sequencer plays a laid-back bassline + hats; SFX are one-shot synths.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let step = 0;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  }

  const BASSLINE = [55, 0, 55, 65.4, 55, 0, 49, 58.3, 55, 0, 55, 65.4, 82.4, 73.4, 65.4, 58.3];

  function musicStep() {
    if (!ctx || muted) return;
    const note = BASSLINE[step % BASSLINE.length];
    if (note) tone(note, 0.22, 'triangle', 0.16);
    if (step % 2 === 0) noise(0.03, 0.05, 6000);
    if (step % 8 === 4) tone(220, 0.3, 'sine', 0.05, 0, 330);
    step += 1;
  }

  return {
    get ready() { return !!ctx; },
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!musicTimer) musicTimer = setInterval(musicStep, 240);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    gunshot() { noise(0.12, 0.5, 1800); tone(160, 0.08, 'square', 0.2, 0, 60); },
    punch() { noise(0.07, 0.3, 900); },
    crash() { noise(0.25, 0.45, 700); tone(90, 0.2, 'sawtooth', 0.2, 0, 45); },
    pickup() { tone(660, 0.09, 'sine', 0.25); tone(880, 0.12, 'sine', 0.25, 0.09); },
    missionDone() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.25, i * 0.11)); },
    busted() { [330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.2, i * 0.18)); },
    setEngine(speed01) {
      if (!ctx || muted) return;
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      engineOsc.frequency.value = 55 + speed01 * 110;
      engineGain.gain.value = 0.02 + speed01 * 0.05;
    },
    setSiren(on) {
      if (!ctx) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'sine';
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0.045;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.9;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 320;
        lfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        sirenOsc.frequency.value = 880;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        lfo.start();
      } else if (!on && sirenOsc) {
        try { sirenOsc.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
      }
    },
  };
}
