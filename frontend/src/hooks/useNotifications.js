import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import socketService from '../services/socketService';
import notificationSound from '../utils/notificationSound';
import { toast } from 'react-hot-toast';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getFCMToken, onForegroundMessage } from '../firebase';
import axiosInstance from '../api/axios';

const isNativePlatform = () => !!(window.Capacitor && window.Capacitor.isNativePlatform());

let notifIdCounter = Math.floor(Math.random() * 100000);
const nextNotifId = () => ++notifIdCounter;

// ─── Send a native system notification (iOS/Android tray OR browser notification) ───
const sendSystemNotification = async (title, body, data = {}) => {
  try {
    if (isNativePlatform()) {
      // Capacitor native — appears in the OS notification tray
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: nextNotifId(),
            title,
            body,
            // Sound on iOS/Android
            sound: 'default',
            // Android specific
            smallIcon: 'ic_launcher',
            largeIcon: 'ic_launcher',
            channelId: 'flashbites-orders',
            // High priority — shows immediately on lock screen
            importance: 5, // IMPORTANCE_HIGH
            // No schedule delay — fire immediately
            schedule: { at: new Date(Date.now() + 50) },
            extra: data,
          },
        ],
      });
      console.log('✅ Native tray notification sent:', title);
    } else {
      // Web browser native notification
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        const n = new Notification(title, {
          body,
          icon: '/2.png',
          badge: '/2.png',
          tag: data.tag || 'flashbites',
          requireInteraction: true,
        });
        if (data.url) {
          n.onclick = () => { window.focus(); window.location.href = data.url; n.close(); };
        }
        console.log('✅ Browser notification sent:', title);
      }
    }
  } catch (err) {
    console.error('❌ System notification failed:', err);
  }
};

// ─── Register FCM token with backend after login ───
const registerFCMToken = async (authAxios) => {
  try {
    if (isNativePlatform()) return; // Capacitor uses local notifications, not FCM web push
    const token = await getFCMToken();
    if (!token) return;
    // Save token to backend so server can send targeted pushes
    await authAxios.post('/users/fcm-token', { token });
    console.log('✅ FCM token registered with backend');
  } catch (err) {
    console.warn('FCM token registration with backend failed (may be OK if endpoint not set up yet):', err?.message);
  }
};

export const useNotifications = () => {
  const { user, token } = useSelector((state) => state.auth);
  const [connected, setConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationSoundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const authAxiosRef = useRef(null);
  const recentNotificationKeysRef = useRef(new Map());

  useEffect(() => {
    const syncSoundFromStorage = () => {
      const saved = localStorage.getItem('notificationSoundEnabled');
      if (saved !== null) {
        try {
          setSoundEnabled(JSON.parse(saved));
        } catch {
          // ignore invalid persisted value
        }
      }
    };

    const syncSoundFromEvent = (event) => {
      if (typeof event?.detail?.enabled === 'boolean') {
        setSoundEnabled(event.detail.enabled);
      } else {
        syncSoundFromStorage();
      }
    };

    window.addEventListener('storage', syncSoundFromStorage);
    window.addEventListener('fb-notification-sound', syncSoundFromEvent);

    return () => {
      window.removeEventListener('storage', syncSoundFromStorage);
      window.removeEventListener('fb-notification-sound', syncSoundFromEvent);
    };
  }, []);

  const shouldNotifyForKey = useCallback((key, ttlMs = 15000) => {
    if (!key) return true;
    const now = Date.now();

    recentNotificationKeysRef.current.forEach((timestamp, existingKey) => {
      if (now - timestamp > ttlMs) {
        recentNotificationKeysRef.current.delete(existingKey);
      }
    });

    const previousTimestamp = recentNotificationKeysRef.current.get(key);
    if (previousTimestamp && now - previousTimestamp < ttlMs) {
      return false;
    }

    recentNotificationKeysRef.current.set(key, now);
    return true;
  }, []);

  // Initialize socket + audio + FCM
  useEffect(() => {
    if (token && user) {
      console.log('🔌 Initializing socket for:', user.email, '| Role:', user.role);
      socketService.connect(token);
      setConnected(true);

      // Initialize audio on first user interaction
      const initAudio = () => {
        notificationSound.init();
        setTimeout(() => {
          document.removeEventListener('click', initAudio);
          document.removeEventListener('touchstart', initAudio);
        }, 2000);
      };
      document.addEventListener('click', initAudio, { once: false });
      document.addEventListener('touchstart', initAudio, { once: false });
      notificationSound.init();

      // Set up FCM for web push (foreground + background)
      if (!isNativePlatform()) {
        // Get & register FCM token
        authAxiosRef.current = axiosInstance;
        registerFCMToken(axiosInstance);

        // Listen for foreground FCM messages (when app is open)
        onForegroundMessage((payload) => {
          console.log('📨 FCM foreground message:', payload);
          const { title, body } = payload.notification || {};
          const orderId = payload?.data?.orderId || payload?.data?.order_id || '';
          const status = payload?.data?.status || '';
          const fcmKey = `fcm:${orderId}:${status}:${title || ''}:${body || ''}`;

          if (title && shouldNotifyForKey(fcmKey)) {
            if (soundEnabled) notificationSound.playNotification('new-order');
            toast(
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#FFF0ED] flex items-center justify-center text-xl">🔔</div>
                <div>
                  <p className="font-bold text-gray-900 mb-0.5">{title}</p>
                  {body && <p className="text-sm text-gray-600">{body}</p>}
                </div>
              </div>,
              {
                duration: 7000,
                position: 'top-center',
                style: {
                  background: '#FFFFFF',
                  color: '#111827',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  boxShadow: '0 14px 36px rgba(0,0,0,0.18)',
                  border: '1px solid #F3F4F6',
                },
              }
            );
          }
        });
      }

      // Request native notification permission on mobile
      if (isNativePlatform()) {
        LocalNotifications.requestPermissions().then((perm) => {
          console.log('📱 Local notification permission:', perm.display);
          // Create notification channel for Android
          LocalNotifications.createChannel({
            id: 'flashbites-orders',
            name: 'Order Updates',
            description: 'Real-time order status notifications',
            importance: 5,
            sound: 'default',
            vibration: true,
            lights: true,
            lightColor: '#E23744',
          }).catch(() => {}); // createChannel only exists on Android
        }).catch(() => {});
      } else if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => Notification.requestPermission(), 3000);
      }

      return () => {
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
  }, [token, user, shouldNotifyForKey, soundEnabled]);

  // ─── Toast helper ─────────────────
  const showToast = useCallback((emoji, title, subtitle, borderColor = '#444') => {
    toast(
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#FFF0ED] flex items-center justify-center text-xl">{emoji}</div>
        <div>
          <p className="font-bold text-gray-900 mb-0.5">{title}</p>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      </div>,
      {
        duration: 7000,
        position: 'top-center',
        style: {
          background: '#FFFFFF',
          color: '#111827',
          borderRadius: '16px',
          padding: '14px 18px',
          boxShadow: '0 14px 36px rgba(0,0,0,0.18)',
          border: `1px solid ${borderColor}`,
        },
      }
    );
  }, []);

  // ─── Handlers ─────────────────────
  const handleNewOrder = useCallback((data) => {
    console.log('🆕 New order received:', data);
    const key = `socket:new-order:${data?.order?._id || ''}`;
    if (!shouldNotifyForKey(key)) return;

    if (soundEnabled && data.sound !== false) notificationSound.playNotification('new-order');

    showToast(
      '🎉',
      'New Order Received!',
      `Order #${data.order._id?.slice(-6)} · ₹${data.order.total}`,
      '#22c55e'
    );
    sendSystemNotification(
      '🎉 New Order Received!',
      `Order #${data.order._id?.slice(-6)} – Total: ₹${data.order.total || 0}`,
      { tag: 'new-order', url: '/dashboard' }
    );
  }, [soundEnabled, showToast, shouldNotifyForKey]);

  const handleOrderUpdate = useCallback((data) => {
    console.log('📦 Order update received:', data);
    const key = `socket:order-update:${data?.order?._id || ''}:${data?.order?.status || ''}`;
    if (!shouldNotifyForKey(key)) return;

    if (soundEnabled && data.sound !== false) notificationSound.playNotification('order-update');

    const statusMessages = {
      confirmed:        { msg: 'Order confirmed! 🎉',              emoji: '✅' },
      preparing:        { msg: 'Restaurant is preparing your order 👨‍🍳', emoji: '🍳' },
      ready:            { msg: 'Your food is ready! 🎊',           emoji: '✨', priority: 'high' },
      out_for_delivery: { msg: 'Out for delivery! Live tracking started 🚚', emoji: '🚚', priority: 'high' },
      delivered:        { msg: 'Order delivered! Enjoy 😋',        emoji: '✅', priority: 'high' },
      cancelled:        { msg: 'Order cancelled ❌',                emoji: '❌' },
    };

    const s = statusMessages[data.order?.status] || { msg: 'Order updated', emoji: '⚡' };

    showToast(s.emoji, s.msg, `Order #${data.order?._id?.slice(-6)}`, '#3b82f6');
    const orderId = data.order?._id;
    const status = data.order?.status;
    const isKeyTransition = ['ready', 'out_for_delivery', 'delivered'].includes(status);

    sendSystemNotification(
      `FlashBites – ${s.msg}`,
      `Order #${orderId?.slice(-6) || ''}`,
      {
        tag: isKeyTransition ? `order-transition-${status}` : 'order-update',
        url: orderId ? `/orders/${orderId}` : '/orders',
        priority: s.priority || 'medium'
      }
    );
  }, [soundEnabled, showToast, shouldNotifyForKey]);

  const handleDeliveryUpdate = useCallback((data) => {
    console.log('🚚 Delivery update:', data);
    const key = `socket:delivery-update:${data?.delivery?.orderId || ''}:${data?.delivery?.status || ''}:${data?.delivery?.message || ''}`;
    if (!shouldNotifyForKey(key)) return;

    if (soundEnabled && data.sound !== false) notificationSound.playNotification('order-update');

    showToast('🚚', 'Delivery Update', data.delivery?.message);
    sendSystemNotification(
      'FlashBites – Delivery Update 🚚',
      data.delivery?.message || 'Your delivery is on the way',
      { tag: 'delivery-update', url: '/orders' }
    );
  }, [soundEnabled, showToast, shouldNotifyForKey]);

  // ─── Socket listeners ──────────────
  useEffect(() => {
    if (!connected || !user) return;

    // Delivery partner handlers
    const handleDeliveryNewOrder = (data) => {
      const key = `socket:new-order-available:${data?.order?._id || ''}`;
      if (!shouldNotifyForKey(key)) return;

      if (soundEnabled && data.sound !== false) notificationSound.playNotification('new-order');
      showToast('🆕', 'New Order Available!', `Order #${data.order?._id?.slice(-6)} · ₹${data.order?.deliveryFee || 0} fee`, '#f59e0b');
      sendSystemNotification(
        '🆕 New Order Available!',
        `Delivery fee: ₹${data.order?.deliveryFee || 0}`,
        { tag: 'new-order-available', url: '/delivery-dashboard' }
      );
    };

    const handleDeliveryAssigned = (data) => {
      const key = `socket:order-assigned:${data?.order?._id || ''}`;
      if (!shouldNotifyForKey(key)) return;

      if (soundEnabled && data.sound !== false) notificationSound.playNotification('order-update');
      showToast('✅', 'Order Assigned!', `Order #${data.order?._id?.slice(-6)}`, '#22c55e');
      sendSystemNotification(
        '✅ Order Assigned!',
        `Order #${data.order?._id?.slice(-6)} is yours to deliver`,
        { tag: 'order-assigned', url: '/delivery-dashboard' }
      );
    };

    const handleDeliveryCancelled = (data) => {
      const key = `socket:order-cancelled:${data?.order?._id || ''}`;
      if (!shouldNotifyForKey(key)) return;

      if (soundEnabled) notificationSound.playError();
      showToast('❌', 'Order Cancelled', `Order #${data.order?._id?.slice(-6)}`, '#ef4444');
      sendSystemNotification(
        '❌ Order Cancelled',
        `Order #${data.order?._id?.slice(-6)} was cancelled`,
        { tag: 'order-cancelled', url: '/delivery-dashboard' }
      );
    };

    if (user.role === 'restaurant_owner') {
      socketService.onNewOrder(handleNewOrder);
      if (user.restaurantId) socketService.joinRestaurant(user.restaurantId);
    } else if (user.role === 'admin') {
      socketService.onNewOrder(handleNewOrder);
    } else if (user.role === 'delivery_partner') {
      socketService.on('new-order-available', handleDeliveryNewOrder);
      socketService.on('order-assigned', handleDeliveryAssigned);
      socketService.on('order-cancelled', handleDeliveryCancelled);
    } else {
      // Regular customer
      socketService.onOrderUpdate(handleOrderUpdate);
    }

    socketService.onDeliveryUpdate(handleDeliveryUpdate);

    return () => {
      socketService.off('new-order');
      socketService.off('order-update');
      socketService.off('delivery-update');
      socketService.off('new-order-available');
      socketService.off('order-assigned');
      socketService.off('order-cancelled');
    };
  }, [connected, user, handleNewOrder, handleOrderUpdate, handleDeliveryUpdate, soundEnabled, showToast, shouldNotifyForKey]);

  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('notificationSoundEnabled', JSON.stringify(newValue));
    window.dispatchEvent(new CustomEvent('fb-notification-sound', { detail: { enabled: newValue } }));
    if (newValue) {
      notificationSound.playSuccess();
      toast.success('Sound notifications enabled 🔔');
    } else {
      toast.success('Sound notifications muted 🔕');
    }
  }, [soundEnabled]);

  const requestNotificationPermission = useCallback(async () => {
    if (isNativePlatform()) {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display === 'granted') toast.success('Notifications enabled! 🔔');
    } else if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') toast.success('Browser notifications enabled! 🔔');
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
