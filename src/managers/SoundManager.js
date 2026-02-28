/* ═══════════════════════════════════════════════════
   SoundManager — Audio (stub, uses Web Audio API)
   ═══════════════════════════════════════════════════ */

import { Howl } from 'howler';

export class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioCtx = null;
        this.sounds = {};
        this.volume = 0.5;

        // Custom MP3 Audio
        this.obstacleCrashSound = new Howl({
            src: ['/assets/sounds/chath_chath.mp3'],
            volume: 0.8
        });

        this.botCrashSound = new Howl({
            src: ['/assets/sounds/ntha_jomu.mp3'],
            volume: 0.8
        });

        // Bike engine sound (looping)
        this.engineSound = new Howl({
            src: ['/assets/sounds/bike_sound.mp3'],
            loop: true,
            volume: 0.5
        });
        this.enginePlaying = false;
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
        if (!this.enabled) return;
        if (!this.enginePlaying) {
            this.engineSound.play();
            this.enginePlaying = true;
        }
        // Adjust pitch based on speed (0.8x at idle → 1.4x at max)
        const rate = 0.8 + (speed / maxSpeed) * 0.6;
        this.engineSound.rate(rate);
        // Adjust volume based on speed
        const vol = 0.3 + (speed / maxSpeed) * 0.4;
        this.engineSound.volume(vol);
    }

    stopEngine() {
        if (this.enginePlaying) {
            this.engineSound.stop();
            this.enginePlaying = false;
        }
    }

    playPunch() {
        this._createTone(120, 0.15, 'sawtooth', 0.5);
        this._createTone(80, 0.1, 'square', 0.3);
    }

    playCrash() {
        this._createTone(60, 0.3, 'sawtooth', 0.6);
        this._createTone(40, 0.4, 'square', 0.4);
        this._createTone(200, 0.1, 'triangle', 0.2);
    }

    playObstacleCrash() {
        if (!this.enabled) return;
        this.obstacleCrashSound.play();
    }

    playBotCrash() {
        if (!this.enabled) return;
        this.botCrashSound.play();
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
