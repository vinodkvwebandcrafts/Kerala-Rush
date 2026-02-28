/* ═══════════════════════════════════════════════════
   SoundManager — Audio (stub, uses Web Audio API)
   ═══════════════════════════════════════════════════ */

export class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioCtx = null;
        this.sounds = {};
        this.volume = 0.5;
    }

    init() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // Generate simple synth sound effects (no external files needed)
    _createTone(freq, duration, type = 'square', volume = 0.3) {
        if (!this.enabled || !this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume * this.volume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playEngine(speed, maxSpeed) {
        // Engine sound is too rapid for continuous synth — we'll skip continuous audio
        // and just provide event-based sounds
    }

    playPunch() {
        this._createTone(120, 0.15, 'sawtooth', 0.5);
        this._createTone(80, 0.1, 'square', 0.3);
    }

    playCrash() {
        this._createTone(60, 0.3, 'sawtooth', 0.6);
        this._createTone(40, 0.4, 'square', 0.4);
        // Add noise-like effect
        this._createTone(200, 0.1, 'triangle', 0.2);
    }

    playCountdown() {
        this._createTone(440, 0.2, 'sine', 0.4);
    }

    playGo() {
        this._createTone(880, 0.4, 'sine', 0.5);
    }

    playAchievement() {
        this._createTone(523, 0.15, 'sine', 0.3);
        setTimeout(() => this._createTone(659, 0.15, 'sine', 0.3), 100);
        setTimeout(() => this._createTone(784, 0.3, 'sine', 0.4), 200);
    }

    playWin() {
        this._createTone(523, 0.2, 'sine', 0.4);
        setTimeout(() => this._createTone(659, 0.2, 'sine', 0.4), 150);
        setTimeout(() => this._createTone(784, 0.2, 'sine', 0.4), 300);
        setTimeout(() => this._createTone(1047, 0.5, 'sine', 0.5), 450);
    }

    playOvertake() {
        this._createTone(600, 0.1, 'sine', 0.2);
        setTimeout(() => this._createTone(800, 0.15, 'sine', 0.3), 80);
    }

    resume() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }
}
