const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const userSockets = new Map(); // Map userId to socket IDs
const restaurantSockets = new Map(); // Map restaurantId to socket IDs
const adminSockets = new Set(); // Set of admin socket IDs
const deliveryPartnerSockets = new Map(); // Map deliveryPartnerId to socket IDs

const getOrderRooms = (orderId) => {
  if (!orderId) return [];
  return [`order_${orderId}`, `order-${orderId}`, String(orderId)];
};

const emitToOrderRooms = (orderId, eventName, payload) => {
  if (!io || !orderId) return;
  getOrderRooms(orderId).forEach((room) => {
    io.to(room).emit(eventName, payload);
  });
};

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'https://localhost',
        'https://flashbites.in',
        'https://www.flashbites.in',
        'capacitor://localhost',
        'ionic://localhost',
        'http://localhost',
        process.env.FRONTEND_URL
      ],
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} | User: ${socket.userId} | Role: ${socket.userRole}`);

    // Register socket based on user role
    if (socket.userRole === 'admin') {
      adminSockets.add(socket.id);
      console.log(`👑 Admin connected: ${socket.userId}`);
    } else if (socket.userRole === 'restaurant_owner') {
      // Restaurant owner will join their restaurant room
      socket.on('join-restaurant', (restaurantId) => {
        if (!restaurantSockets.has(restaurantId)) {
          restaurantSockets.set(restaurantId, new Set());
        }
        restaurantSockets.get(restaurantId).add(socket.id);
        socket.join(`restaurant-${restaurantId}`);
        console.log(`🏪 Restaurant owner joined: ${restaurantId}`);
      });
    } else if (socket.userRole === 'delivery_partner') {
      // Delivery partner
      deliveryPartnerSockets.set(socket.userId, socket.id);
      socket.join(`delivery-partner-${socket.userId}`);
      socket.join('all-delivery-partners'); // Join global delivery partners room
      console.log(`🚴 Delivery partner connected: ${socket.userId}`);
    } else {
      // Regular user
      userSockets.set(socket.userId, socket.id);
      socket.join(`user-${socket.userId}`);
      console.log(`👤 User joined: ${socket.userId}`);
    }

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      
      // Clean up
      if (socket.userRole === 'admin') {
        adminSockets.delete(socket.id);
      } else if (socket.userRole === 'restaurant_owner') {
        restaurantSockets.forEach((sockets, restaurantId) => {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            restaurantSockets.delete(restaurantId);
          }
        });
      } else if (socket.userRole === 'delivery_partner') {
        deliveryPartnerSockets.delete(socket.userId);
      } else {
        userSockets.delete(socket.userId);
      }
    });

    // Ping-pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Order tracking rooms for live location updates.
    socket.on('join_order_room', (orderId) => {
      if (!orderId) return;
      getOrderRooms(orderId).forEach((room) => socket.join(room));
      console.log(`📍 Joined order tracking rooms: ${orderId}`);
    });

    // Alias to support clients using camelCase naming.
    socket.on('joinOrderRoom', (orderId) => {
      if (!orderId) return;
      getOrderRooms(orderId).forEach((room) => socket.join(room));
      console.log(`📍 Joined order tracking rooms (alias): ${orderId}`);
    });

    socket.on('leave_order_room', (orderId) => {
      if (!orderId) return;
      getOrderRooms(orderId).forEach((room) => socket.leave(room));
      console.log(`📍 Left order tracking rooms: ${orderId}`);
    });

    socket.on('leaveOrderRoom', (orderId) => {
      if (!orderId) return;
      getOrderRooms(orderId).forEach((room) => socket.leave(room));
      console.log(`📍 Left order tracking rooms (alias): ${orderId}`);
    });

    socket.on('updateLocation', ({ orderId, lat, lng }) => {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!orderId || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) return;

      const payload = {
        orderId,
        location: { latitude: latNum, longitude: lngNum },
        lat: latNum,
        lng: lngNum,
        timestamp: new Date().toISOString()
      };

      emitToOrderRooms(orderId, 'delivery_location_update', payload);
      emitToOrderRooms(orderId, 'locationUpdate', { lat: latNum, lng: lngNum, orderId, timestamp: payload.timestamp });
    });

    socket.on('updateStatus', ({ orderId, status }) => {
      if (!orderId || !status) return;
      emitToOrderRooms(orderId, 'status_update', { orderId, status, timestamp: new Date().toISOString() });
      emitToOrderRooms(orderId, 'statusUpdate', status);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
};

// Emit new order notification to restaurant
const notifyRestaurantNewOrder = (restaurantId, orderData) => {
  if (io) {
    io.to(`restaurant-${restaurantId}`).emit('new-order', {
      type: 'NEW_ORDER',
      order: orderData,
      sound: true,
      timestamp: new Date().toISOString()
    });
    console.log(`📢 Notified restaurant ${restaurantId} of new order ${orderData._id}`);
  }
};

// Emit order status update to user
const notifyUserOrderUpdate = (userId, orderData) => {
  if (io) {
    io.to(`user-${userId}`).emit('order-update', {
      type: 'ORDER_UPDATE',
      order: orderData,
      sound: true,
      timestamp: new Date().toISOString()
    });
    console.log(`📢 Notified user ${userId} of order update ${orderData._id}`);
  }
};

// Emit new order notification to all admins
const notifyAdminNewOrder = (orderData) => {
  if (io) {
    adminSockets.forEach((socketId) => {
      io.to(socketId).emit('new-order', {
        type: 'NEW_ORDER',
        order: orderData,
        sound: true,
        timestamp: new Date().toISOString()
      });
    });
    console.log(`📢 Notified ${adminSockets.size} admins of new order ${orderData._id}`);
  }
};

// Emit delivery status update
const notifyDeliveryUpdate = (orderId, deliveryData) => {
  if (io) {
    io.to(`order-${orderId}`).emit('delivery-update', {
      type: 'DELIVERY_UPDATE',
      delivery: deliveryData,
      sound: true,
      timestamp: new Date().toISOString()
    });
  }
};

const emitOrderLocationUpdate = (orderId, lat, lng, timestamp = new Date()) => {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) || !orderId) return;

  const isoTs = timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
  const payload = {
    orderId,
    location: { latitude: latNum, longitude: lngNum },
    lat: latNum,
    lng: lngNum,
    timestamp: isoTs
  };

  emitToOrderRooms(orderId, 'delivery_location_update', payload);
  emitToOrderRooms(orderId, 'locationUpdate', { lat: latNum, lng: lngNum, orderId, timestamp: isoTs });
};

const emitOrderStatusUpdate = (orderId, status, order = null) => {
  if (!orderId || !status) return;

  const payload = {
    orderId,
    status,
    order,
    timestamp: new Date().toISOString()
  };

  emitToOrderRooms(orderId, 'status_update', payload);
  emitToOrderRooms(orderId, 'statusUpdate', status);
};

const emitOrderFinancialUpdate = (order) => {
  if (!io || !order) return;

  const payload = {
    orderId: order._id,
    restaurantId: order.restaurantId?._id || order.restaurantId,
    deliveryPartnerId: order.deliveryPartnerId?._id || order.deliveryPartnerId || null,
    restaurantEarning: Number(order.restaurantEarning || 0),
    deliveryEarning: Number(order.deliveryEarning || order.deliveryPartnerEarning || 0),
    platformProfit: Number(order.platformProfit || order.adminEarning || 0),
    totalAmount: Number(order.totalAmount || order.total || 0),
    status: order.status,
    timestamp: new Date().toISOString()
  };

  io.emit('orderUpdate', payload);
};

const getIO = () => io;

// Get online statistics
const getOnlineStats = () => {
  return {
    users: userSockets.size,
    restaurants: restaurantSockets.size,
    admins: adminSockets.size,
    deliveryPartners: deliveryPartnerSockets.size,
    total: io ? io.sockets.sockets.size : 0
  };
};

// Notify all delivery partners about new order
const notifyDeliveryPartnersNewOrder = (orderData) => {
  if (io) {
    io.to('all-delivery-partners').emit('new-order-available', {
      type: 'NEW_ORDER_AVAILABLE',
      order: orderData,
      sound: true,
      timestamp: new Date().toISOString()
    });
    console.log(`📢 Notified all delivery partners of new order ${orderData._id}`);
  }
};

// Notify specific delivery partner
const notifyDeliveryPartner = (deliveryPartnerId, eventType, data) => {
  if (io) {
    io.to(`delivery-partner-${deliveryPartnerId}`).emit(eventType, {
      type: eventType.toUpperCase(),
      data,
      sound: true,
      timestamp: new Date().toISOString()
    });
    console.log(`📢 Notified delivery partner ${deliveryPartnerId} - ${eventType}`);
  }
};

// Notify delivery partner about order assignment
const notifyDeliveryPartnerOrderAssigned = (deliveryPartnerId, orderData) => {
  if (io) {
    io.to(`delivery-partner-${deliveryPartnerId}`).emit('order-assigned', {
      type: 'ORDER_ASSIGNED',
      order: orderData,
      sound: true,
      timestamp: new Date().toISOString()
    });
    console.log(`📢 Notified delivery partner ${deliveryPartnerId} of order assignment ${orderData._id}`);
  }
};

// Notify delivery partner about order cancellation
const notifyDeliveryPartnerOrderCancelled = (deliveryPartnerId, orderData) => {
  if (io) {
    io.to(`delivery-partner-${deliveryPartnerId}`).emit('order-cancelled', {
      type: 'ORDER_CANCELLED',
      order: orderData,
      sound: true,
      timestamp: new Date().toISOString()
    });
    console.log(`📢 Notified delivery partner ${deliveryPartnerId} of order cancellation ${orderData._id}`);
  }
};

module.exports = {
  initializeSocket,
  notifyRestaurantNewOrder,
  notifyUserOrderUpdate,
  notifyAdminNewOrder,
  notifyDeliveryUpdate,
  emitOrderLocationUpdate,
  emitOrderStatusUpdate,
  emitOrderFinancialUpdate,
  notifyDeliveryPartnersNewOrder,
  notifyDeliveryPartner,
  notifyDeliveryPartnerOrderAssigned,
  notifyDeliveryPartnerOrderCancelled,
  getOnlineStats,
  getIO
};
