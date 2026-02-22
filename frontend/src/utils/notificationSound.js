// Notification sound utility using Web Audio API
class NotificationSound {
  constructor() {
    this.audioContext = null;
    this.initialized = false;
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

  // Play notification sound (HTML5 Audio)
  async playNotification(type = 'new-order') {
    if (!this.initialized) this.init();

    try {
      // Play a premium mp3 sound
      const audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      await audio.play();
      console.log(`🔔 Played notification sound (${type}) via MP3`);
    } catch (mp3Error) {
      console.warn('MP3 playback failed, falling back to oscillator...', mp3Error);
      
      // Fallback to synthesized beep
      try {
        if (!this.audioContext) return;
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Quick modern chirp
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      } catch (oscError) {
        console.error('Synthesizer fallback failed:', oscError);
      }
    }
  }

  // Play success sound
  async playSuccess() {
    if (!this.initialized) this.init();
    if (!this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Ascending tone
      oscillator.frequency.setValueAtTime(523, now); // C5
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
    if (!this.initialized) this.init();
    if (!this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Low descending tone
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.setValueAtTime(300, now + 0.2);

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (error) {
      console.error('Failed to play error sound:', error);
    }
  }

  // Check if sound is enabled
  isEnabled() {
    return this.initialized && this.audioContext !== null;
  }
}

// Export singleton instance
const notificationSoundInstance = new NotificationSound();
export default notificationSoundInstance;

// Export convenience function for direct use
export const playNotificationSound = (type) => {
  return notificationSoundInstance.playNotification(type);
};
