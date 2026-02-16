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

  // Play notification sound (synthesized beep)
  async playNotification(type = 'new-order') {
    // Auto-initialize if not initialized
    if (!this.initialized) {
      this.init();
    }

    if (!this.audioContext) {
      console.warn('Audio context not available - trying to initialize...');
      this.init();
      if (!this.audioContext) {
        console.error('Failed to initialize audio context');
        return;
      }
    }

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        console.log('Resuming suspended audio context...');
        await this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different sounds for different notification types
      if (type === 'new-order') {
        // Two-tone alert sound
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.setValueAtTime(1000, now + 0.15);
        oscillator.frequency.setValueAtTime(800, now + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
      } else if (type === 'order-update') {
        // Single pleasant tone
        oscillator.frequency.setValueAtTime(600, now);
        
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
      } else if (type === 'delivery-update') {
        // Quick chirp
        oscillator.frequency.setValueAtTime(700, now);
        oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.1);
        
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      }

      console.log(`🔔 Played ${type} notification sound`);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
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
