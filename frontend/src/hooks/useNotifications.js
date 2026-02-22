import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import socketService from '../services/socketService';
import notificationSound from '../utils/notificationSound';
import { toast } from 'react-hot-toast';
import { LocalNotifications } from '@capacitor/local-notifications';

const sendNativeNotification = async (title, body, tag) => {
  try {
    const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform());
    if (isNative) {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: new Date().getTime(),
            schedule: { at: new Date(Date.now() + 100) },
            extra: { tag }
          }
        ]
      });
      console.log('✅ Native mobile notification scheduled');
    } else {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico', tag });
        console.log('✅ Browser notification displayed');
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  } catch (error) {
    console.error('❌ Failed to send native notification:', error);
  }
};

export const useNotifications = () => {
  const { user, token } = useSelector((state) => state.auth);
  const [connected, setConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // Get sound preference from localStorage
    const saved = localStorage.getItem('notificationSoundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Initialize socket connection
  useEffect(() => {
    if (token && user) {
      console.log('🔌 Initializing socket connection for user:', user.email, 'Role:', user.role);
      socketService.connect(token);
      setConnected(true);

      // Initialize audio context on first user interaction
      const initAudio = () => {
        console.log('🎵 Initializing audio context on user interaction...');
        notificationSound.init();
        // Keep listener for mobile - might need multiple interactions
        setTimeout(() => {
          document.removeEventListener('click', initAudio);
          document.removeEventListener('touchstart', initAudio);
        }, 2000);
      };
      
      document.addEventListener('click', initAudio, { once: false });
      document.addEventListener('touchstart', initAudio, { once: false });

      // Also try to initialize immediately (will work if user already interacted)
      notificationSound.init();

      // Request notification permission if not already decided
      if ('Notification' in window && Notification.permission === 'default') {
        // Wait a bit before requesting to not overwhelm user on page load
        setTimeout(() => {
          console.log('📱 Requesting notification permission...');
          Notification.requestPermission().then(permission => {
            console.log('📱 Notification permission:', permission);
          });
        }, 3000);
      }

      // Cleanup on unmount
      return () => {
        // Only disconnect if we are actually fully unmounting or token changed
        // StrictMode double-invokes this in dev
        setTimeout(() => {
          if (!document.hidden) {
             socketService.disconnect();
             setConnected(false);
          }
        }, 100);
        document.removeEventListener('click', initAudio);
        document.removeEventListener('touchstart', initAudio);
      };
    }
  }, [token, user]);

  // Handle new order notifications (for restaurant owners and admins)
  const handleNewOrder = useCallback((data) => {
    console.log('🆕 New order received:', data);
    console.log('🔊 Sound enabled:', soundEnabled);
    console.log('🔊 Data.sound:', data.sound);
    
    // Play sound if enabled
    if (soundEnabled && data.sound) {
      console.log('🎵 Attempting to play notification sound...');
      notificationSound.playNotification('new-order')
        .then(() => console.log('✅ Sound played successfully'))
        .catch(err => console.error('❌ Sound play failed:', err));
    } else {
      console.log('🔇 Sound not played. Enabled:', soundEnabled, 'Data.sound:', data.sound);
    }

    // Show toast notification
    toast(
      <div className="flex items-center gap-3">
        <div className="text-2xl">🎉</div>
        <div>
          <p className="font-bold text-white mb-0.5">New Order Received!</p>
          <p className="text-sm text-gray-300">Order #{data.order._id?.slice(-6) || 'N/A'}</p>
          <p className="text-sm text-brand-gradient font-semibold mt-1">Total: ₹{data.order.total}</p>
        </div>
      </div>,
      {
        duration: 8000,
        position: 'top-center',
        style: {
          background: '#1A1A1A',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '16px 20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          border: '1px solid #333',
        },
      }
    );

    // Send cross-platform notification
    sendNativeNotification(
      'New Order Received! 🎉',
      `Order #${data.order._id?.slice(-6) || 'N/A'} - Total: ₹${data.order.total || 0}`,
      'new-order'
    );
  }, [soundEnabled]);

  // Handle order status update notifications (for users)
  const handleOrderUpdate = useCallback((data) => {
    console.log('📦 Order update received:', data);
    console.log('🔊 Sound enabled:', soundEnabled);
    
    // Play sound if enabled
    if (soundEnabled && data.sound) {
      console.log('🎵 Attempting to play order update sound...');
      notificationSound.playNotification('order-update')
        .then(() => console.log('✅ Sound played successfully'))
        .catch(err => console.error('❌ Sound play failed:', err));
    }

    // Map status to user-friendly messages
    const statusMessages = {
      confirmed: 'Your order has been confirmed! 🎉',
      preparing: 'Restaurant is preparing your order 👨‍🍳',
      ready: 'Your order is ready! 🎊',
      out_for_delivery: 'Your order is out for delivery 🚚',
      delivered: 'Your order has been delivered! ✅',
      cancelled: 'Your order has been cancelled ❌',
    };

    const message = statusMessages[data.order.status] || 'Order status updated';

    // Show toast notification
    toast(
      <div className="flex items-center gap-3">
        <div className="text-2xl">⚡</div>
        <div>
          <p className="font-bold text-white mb-0.5">{message}</p>
          <p className="text-sm text-gray-400">Order #{data.order._id?.slice(-6) || 'N/A'}</p>
        </div>
      </div>,
      {
        duration: 6000,
        position: 'top-center',
        style: {
          background: '#1A1A1A',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '16px 20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          border: '1px solid #333',
        },
      }
    );

    // Send cross-platform notification
    sendNativeNotification(
      message,
      `Order #${data.order._id?.slice(-6) || 'N/A'}`,
      'order-update'
    );
  }, [soundEnabled]);

  // Handle delivery update notifications
  const handleDeliveryUpdate = useCallback((data) => {
    console.log('🚚 Delivery update received:', data);
    
    if (soundEnabled && data.sound) {
      notificationSound.playNotification('delivery-update');
    }

    toast(
      <div className="flex items-center gap-3">
        <div className="text-2xl">🚚</div>
        <div>
          <p className="font-bold text-white mb-0.5">Delivery Update</p>
          <p className="text-sm text-gray-300">{data.delivery.message}</p>
        </div>
      </div>,
      {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#1A1A1A',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '16px 20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          border: '1px solid #333',
        },
      }
    );
    // Ensure native notification is fired
    sendNativeNotification('Delivery Update 🚚', data.delivery?.message || 'Package update', 'delivery-update');

  }, [soundEnabled]);

  // Setup listeners based on user role
  useEffect(() => {
    if (!connected || !user) return;

    // --- Delivery Partner Handlers ---
    const handleDeliveryNewOrder = (data) => {
      console.log('🆕 [Global] New order available:', data);
      if (soundEnabled && data.sound !== false) notificationSound.playNotification('new-order');
      toast(
        <div className="flex items-center gap-3">
          <div className="text-2xl">🆕</div>
          <div>
            <p className="font-bold text-white mb-0.5">New Order Available!</p>
            <p className="text-sm text-gray-300">Order #{data.order?._id?.slice(-6) || 'N/A'}</p>
            <p className="text-sm text-brand-gradient font-semibold mt-1">Fee: ₹{data.order?.deliveryFee || 0}</p>
          </div>
        </div>,
        {
          duration: 6000,
          position: 'top-center',
          style: {
            background: '#1A1A1A',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '16px 20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            border: '1px solid #333',
          },
        }
      );
      sendNativeNotification('New Order Available! 🆕', `Fee: ₹${data.order?.deliveryFee || 0}`, 'new-order-available');
    };

    const handleDeliveryAssigned = (data) => {
      console.log('✅ [Global] Order assigned:', data);
      if (soundEnabled && data.sound !== false) notificationSound.playNotification('order-update');
      toast(
        <div className="flex items-center gap-3">
          <div className="text-2xl">✅</div>
          <div>
            <p className="font-bold text-white mb-0.5">Order Assigned!</p>
            <p className="text-sm text-gray-300">Order #{data.order?._id?.slice(-6) || 'N/A'}</p>
          </div>
        </div>,
        {
          duration: 5000,
          position: 'top-center',
          style: {
            background: '#1A1A1A',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '16px 20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            border: '1px solid #10b981',
          },
        }
      );
      sendNativeNotification('Order Assigned! ✅', `Order #${data.order?._id?.slice(-6) || 'N/A'}`, 'order-assigned');
    };

    const handleDeliveryCancelled = (data) => {
      console.log('❌ [Global] Order cancelled:', data);
      if (soundEnabled && data.sound !== false) notificationSound.playError();
      toast(
        <div className="flex items-center gap-3">
          <div className="text-2xl">❌</div>
          <div>
            <p className="font-bold text-white mb-0.5">Order Cancelled</p>
            <p className="text-sm text-gray-300">Order #{data.order?._id?.slice(-6) || 'N/A'} has been cancelled</p>
          </div>
        </div>,
        {
          duration: 5000,
          position: 'top-center',
          style: {
            background: '#1A1A1A',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '16px 20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            border: '1px solid #ef4444',
          },
        }
      );
      sendNativeNotification('Order Cancelled ❌', `Order #${data.order?._id?.slice(-6) || 'N/A'}`, 'order-cancelled');
    };
    // ------------------------------------

    if (user.role === 'restaurant_owner') {
      // Restaurant owners listen for new orders
      socketService.onNewOrder(handleNewOrder);
      
      // Join restaurant room if user owns a restaurant
      if (user.restaurantId) {
        socketService.joinRestaurant(user.restaurantId);
      }
    } else if (user.role === 'admin') {
      // Admins listen for all new orders
      socketService.onNewOrder(handleNewOrder);
    } else if (user.role === 'delivery_partner') {
      // Delivery partners listen for available orders and assignments
      socketService.on('new-order-available', handleDeliveryNewOrder);
      socketService.on('order-assigned', handleDeliveryAssigned);
      socketService.on('order-cancelled', handleDeliveryCancelled);
    } else {
      // Regular users listen for order updates
      socketService.onOrderUpdate(handleOrderUpdate);
    }

    // All roles listen for delivery updates
    socketService.onDeliveryUpdate(handleDeliveryUpdate);

    return () => {
      socketService.off('new-order');
      socketService.off('order-update');
      socketService.off('delivery-update');
      socketService.off('new-order-available');
      socketService.off('order-assigned');
      socketService.off('order-cancelled');
    };
  }, [connected, user, handleNewOrder, handleOrderUpdate, handleDeliveryUpdate, soundEnabled]);

  // Toggle sound notifications
  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('notificationSoundEnabled', JSON.stringify(newValue));
    
    // Play test sound
    if (newValue) {
      notificationSound.playSuccess();
      toast.success('Sound notifications enabled 🔔');
    } else {
      toast.success('Sound notifications disabled 🔕');
    }
  }, [soundEnabled]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Browser notifications enabled! 🔔');
      }
    }
  }, []);

  return {
    connected,
    soundEnabled,
    toggleSound,
    requestNotificationPermission,
    notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
  };
};
