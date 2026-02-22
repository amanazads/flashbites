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

    // Determine the socket URL
    let SOCKET_URL;
    if (import.meta.env.DEV) {
      // In development, connect directly to the backend
      SOCKET_URL = 'http://localhost:8080';
    } else {
      // In production, derive from the API URL by removing /api path
      let backendUrl = import.meta.env.VITE_API_URL || '';
      SOCKET_URL = backendUrl.replace(/\/api\/?$/, '') || window.location.origin;
    }
    
    console.log('🔌 Connecting to Socket.IO:', SOCKET_URL);
    
    const socketIns = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketIns.on('connect', () => {
      console.log('✅ Socket connected:', socketIns.id);
    });

    socketIns.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socketIns.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socketIns.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

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
