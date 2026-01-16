import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import socketService from '../services/socketService';
import notificationSound from '../utils/notificationSound';
import { toast } from 'react-hot-toast';

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
        socketService.disconnect();
        setConnected(false);
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
    toast.success(
      <div>
        <p className="font-bold">🎉 New Order Received!</p>
        <p className="text-sm">Order #{data.order._id?.slice(-6) || 'N/A'}</p>
        <p className="text-sm">Total: ₹{data.order.total}</p>
      </div>,
      {
        duration: 6000,
        position: 'top-right',
        style: {
          background: '#10b981',
          color: '#fff',
        },
      }
    );

    // Request browser notification permission if not granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('New Order Received! 🎉', {
          body: `Order #${data.order._id?.slice(-6) || 'N/A'} - Total: ₹${data.order.total || 0}`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'new-order',
          requireInteraction: true,
          silent: false, // Ensure browser plays its own sound
        });
        console.log('✅ Browser notification displayed');
      } catch (error) {
        console.error('❌ Failed to show browser notification:', error);
      }
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      console.log('📱 Notification permission not granted, requesting...');
      Notification.requestPermission();
    }
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
    toast.success(
      <div>
        <p className="font-bold">{message}</p>
        <p className="text-sm">Order #{data.order._id?.slice(-6) || 'N/A'}</p>
      </div>,
      {
        duration: 5000,
        position: 'top-right',
      }
    );

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(message, {
          body: `Order #${data.order._id?.slice(-6) || 'N/A'}`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'order-update',
          silent: false,
        });
        console.log('✅ Browser notification displayed');
      } catch (error) {
        console.error('❌ Failed to show browser notification:', error);
      }
    }
  }, [soundEnabled]);

  // Handle delivery update notifications
  const handleDeliveryUpdate = useCallback((data) => {
    console.log('🚚 Delivery update received:', data);
    
    if (soundEnabled && data.sound) {
      notificationSound.playNotification('delivery-update');
    }

    toast.info(
      <div>
        <p className="font-bold">Delivery Update 🚚</p>
        <p className="text-sm">{data.delivery.message}</p>
      </div>,
      {
        duration: 4000,
        position: 'top-right',
      }
    );
  }, [soundEnabled]);

  // Setup listeners based on user role
  useEffect(() => {
    if (!connected || !user) return;

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
    };
  }, [connected, user, handleNewOrder, handleOrderUpdate, handleDeliveryUpdate]);

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
