import { io } from 'socket.io-client';
import { getSocketBaseUrl } from '../utils/apiBase';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    const SOCKET_URL = getSocketBaseUrl();
    
    const socketIns = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketIns.on('connect', () => {});

    socketIns.on('disconnect', () => {});

    socketIns.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socketIns.on('reconnect', () => {});

    this.socket = socketIns;
    // Setup default listeners
    this.setupDefaultListeners();
  }

  setupDefaultListeners() {
    if (!this.socket) return;

    // Keep connection alive
    setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds

    this.socket.on('pong', () => {
      // Connection is alive
    });
  }

  disconnect() {
    if (this.socket) {
      if (this.socket.connected) {
        this.socket.disconnect();
      } else {
        this.socket.close(); // forcefully close pending connections
      }
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Join restaurant room (for restaurant owners)
  joinRestaurant(restaurantId) {
    if (this.socket?.connected) {
      this.socket.emit('join-restaurant', restaurantId);
    }
  }

  // Listen for new orders (restaurant & admin)
  onNewOrder(callback) {
    if (this.socket) {
      this.socket.on('new-order', callback);
      this.listeners.set('new-order', callback);
    }
  }

  // Listen for order updates (user)
  onOrderUpdate(callback) {
    if (this.socket) {
      this.socket.on('order-update', callback);
      this.listeners.set('order-update', callback);
    }
  }

  // Listen for delivery updates
  onDeliveryUpdate(callback) {
    if (this.socket) {
      this.socket.on('delivery-update', callback);
      this.listeners.set('delivery-update', callback);
    }
  }

  // Generic generic listener
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      this.listeners.set(event, callback);
    }
  }

  // Remove specific listener
  off(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export default new SocketService();
