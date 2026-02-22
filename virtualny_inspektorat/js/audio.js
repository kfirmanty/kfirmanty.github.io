// Tiny Web Audio wrapper for procedural sound effects
// No audio files needed — pure synthesis

export class AudioSystem {
  constructor() {
    this.ctx = null; // Lazy-init on first user interaction
    this.enabled = true;
    this.baseFreq = 440;
    this.volume = 0.08;
  }

  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a short blip for dialogue typewriter — Animal Crossing style
  // charCode varies the pitch slightly per character
  playTypingBlip(charCode) {
    if (!this.enabled) return;
    try {
      this._ensureContext();
    } catch { return; }

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Vary pitch based on character for speech-like cadence
    const charOffset = (charCode % 12) - 6; // -6 to +5 semitones
    const freq = this.baseFreq * Math.pow(2, charOffset / 24); // quarter-tone steps

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }
}
