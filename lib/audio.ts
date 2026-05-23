'use client';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneModulator: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private isMuted: boolean = true;

  constructor() {
    // Lazy-initialize audio context on first interaction due to browser autoplay policies
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.4;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported in this browser', e);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    this.init();
    if (!this.masterGain || !this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Smooth gain transition to avoid pops
    this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.4, this.ctx.currentTime, 0.05);
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  public startDroneHum() {
    this.init();
    if (!this.ctx || !this.masterGain || this.droneOsc) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      // 1. Low fundamental hum (55Hz / A1 note)
      this.droneOsc = this.ctx.createOscillator();
      this.droneOsc.type = 'sawtooth';
      this.droneOsc.frequency.value = 55;

      // 2. Low-pass filter to make it a deep, clinical drone hum
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 120;

      // 3. Frequency modulation (2Hz fluctuation) to simulate engine beats
      this.droneModulator = this.ctx.createOscillator();
      this.droneModulator.frequency.value = 1.8;
      const modGain = this.ctx.createGain();
      modGain.gain.value = 1.5;

      this.droneModulator.connect(modGain);
      modGain.connect(this.droneOsc.frequency);

      // 4. Drone volume control
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.6;

      // Connect nodes
      this.droneOsc.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(this.masterGain);

      // Start oscillators
      this.droneOsc.start();
      this.droneModulator.start();
    } catch (e) {
      console.warn('Failed to start drone hum audio nodes', e);
    }
  }

  public stopDroneHum() {
    if (!this.droneOsc) return;
    try {
      this.droneOsc.stop();
      this.droneModulator?.stop();
      this.droneOsc.disconnect();
      this.droneModulator?.disconnect();
      this.droneGain?.disconnect();
    } catch (e) {
      // Ignore cleanup errors
    } finally {
      this.droneOsc = null;
      this.droneModulator = null;
      this.droneGain = null;
    }
  }

  public playAlert() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const now = this.ctx.currentTime;
      // High clinical alert tone (880Hz / A5)
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      // Double pulse
      osc.frequency.setValueAtTime(880, now + 0.15);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.5, now);
      // Sharp decay
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start();
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Failed to play alert sound node', e);
    }
  }

  public playImpactFlash() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      // Deep explosive base impact sound (white noise + low sweep)
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.8);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(1.0, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start();
      osc.stop(now + 0.9);
    } catch (e) {
      console.warn('Failed to play impact sound node', e);
    }
  }
}

export const audio = new AudioEngine();
