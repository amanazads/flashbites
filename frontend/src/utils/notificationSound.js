// Notification sound utility using Web Audio API
// Bundled sound generation — no CDN dependency, works on all platforms

// A small notification chime encoded as inline data URI (WAV format)
// Generated from pure sine waves — C6→E6→G6 ascending chime
const generateChimeDataUri = () => {
  const sampleRate = 44100;
  const duration = 0.5;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // WAV header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);        // PCM
  view.setUint16(22, 1, true);        // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples * 2, true);

  // Generate ascending chime: C6(1047Hz) → E6(1319Hz) → G6(1568Hz)
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let freq;
    if (t < 0.15) freq = 1047;       // C6
    else if (t < 0.30) freq = 1319;  // E6
    else freq = 1568;                 // G6

    // Attack then decay envelope
    const attack = Math.min(t / 0.01, 1);
    const decay = Math.exp(-t * 6);
    const envelope = attack * decay * 0.6;

    const sample = Math.sin(2 * Math.PI * freq * t) * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  // Convert to base64 data URI
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

class NotificationSound {
  constructor() {
    this.audioContext = null;
    this.initialized = false;
    this._chimeUri = null;
  }

  // Initialize audio context (must be called after user interaction)
  init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      console.log('🔊 Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  _getChimeUri() {
    if (!this._chimeUri) {
      this._chimeUri = generateChimeDataUri();
    }
    return this._chimeUri;
  }

  // Play notification sound — uses locally generated WAV, no CDN
  async playNotification(type = 'new-order') {
    if (!this.initialized) this.init();

    try {
      const audio = new Audio(this._getChimeUri());
      audio.volume = 0.85;
      await audio.play();
      console.log(`🔔 Played notification sound (${type})`);
      return true;
    } catch (err) {
      console.warn('Audio play failed, trying oscillator fallback:', err);
      return this._playOscillator(type);
    }
  }

  // Oscillator fallback (works even without audio file)
  async _playOscillator(type = 'new-order') {
    try {
      if (!this.audioContext) this.init();
      if (!this.audioContext) return false;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      // Play ascending chime via synthesizer
      const freqs = type === 'order-update'
        ? [523, 659, 784]   // C5 E5 G5 — softer update tone
        : [1047, 1319, 1568]; // C6 E6 G6 — bright new-order tone

      freqs.forEach((freq, index) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.type = 'sine';
        const start = now + index * 0.12;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
        osc.start(start);
        osc.stop(start + 0.25);
      });

      return true;
    } catch (error) {
      console.error('Oscillator fallback failed:', error);
      return false;
    }
  }

  // Play success sound
  async playSuccess() {
    try {
      if (!this.initialized) this.init();
      if (!this.audioContext) return;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(523, now);   // C5
      oscillator.frequency.setValueAtTime(659, now + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, now + 0.2); // G5

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      oscillator.start(now);
      oscillator.stop(now + 0.4);
    } catch (error) {
      console.error('Failed to play success sound:', error);
    }
  }

  // Play error sound
  async playError() {
    try {
      if (!this.initialized) this.init();
      if (!this.audioContext) return;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.setValueAtTime(280, now + 0.25);

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      oscillator.start(now);
      oscillator.stop(now + 0.35);
    } catch (error) {
      console.error('Failed to play error sound:', error);
    }
  }

  isEnabled() {
    return this.initialized && this.audioContext !== null;
  }
}

const notificationSoundInstance = new NotificationSound();
export default notificationSoundInstance;

export const playNotificationSound = (type) => {
  return notificationSoundInstance.playNotification(type);
};
