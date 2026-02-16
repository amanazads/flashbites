import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    // Get backend URL and remove /api path for Socket.IO
    let BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Remove /api suffix if present (Socket.IO connects to root)
    BACKEND_URL = BACKEND_URL.replace(/\/api\/?$/, '');
    
    console.log('🔌 Connecting to Socket.IO:', BACKEND_URL);
    
    this.socket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

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
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('Socket disconnected manually');
    }
  }

  // Join restaurant room (for restaurant owners)
  joinRestaurant(restaurantId) {
    if (this.socket?.connected) {
      this.socket.emit('join-restaurant', restaurantId);
      console.log('Joined restaurant room:', restaurantId);
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
