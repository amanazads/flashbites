import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  BellAlertIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ShoppingBagIcon,
  GiftIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import axiosInstance from '../../api/axios';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LocalNotifications } from '@capacitor/local-notifications';
import { BRAND } from '../../constants/theme';
import toast from 'react-hot-toast';

const isNativePlatform = () => !!(
  typeof window !== 'undefined'
  && window.Capacitor
  && typeof window.Capacitor.isNativePlatform === 'function'
  && window.Capacitor.isNativePlatform()
);

const ORDER_TYPES = new Set([
  'new_order',
  'order_placed',
  'order_confirmed',
  'order_preparing',
  'order_ready',
  'order_picked_up',
  'order_delivered',
  'order_cancelled',
  'delivery_update',
  'new-order-available',
  'order-assigned',
]);

const OFFER_TYPES = new Set([
  'coupon_available',
  'promo',
  'offer',
  'discount',
]);

const getNotificationGroup = (notif) => {
  const type = String(notif?.type || '').toLowerCase();
  if (ORDER_TYPES.has(type)) return 'orders';
  if (OFFER_TYPES.has(type)) return 'offers';
  return 'system';
};

const getNotificationVisual = (notif) => {
  const group = getNotificationGroup(notif);

  if (group === 'orders') {
    return {
      Icon: ShoppingBagIcon,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      unreadBg: '#F7FAFF',
      unreadDot: '#2563EB',
    };
  }

  if (group === 'offers') {
    return {
      Icon: GiftIcon,
      iconBg: '#FFF7ED',
      iconColor: '#EA580C',
      unreadBg: '#FFF9F3',
      unreadDot: '#EA580C',
    };
  }

  return {
    Icon: Cog6ToothIcon,
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    unreadBg: '#FAF8FF',
    unreadDot: '#7C3AED',
  };
};

const TAB_DEFS = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders' },
  { id: 'offers', label: 'Offers' },
  { id: 'system', label: 'System' },
];

const NotificationBell = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationSoundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (isNativePlatform()) return 'default';
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userId = user?._id;

  const fetchNotifications = async () => {
    if (!isAuthenticated || !userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const { data } = await axiosInstance.get('/notifications?limit=5');
      const payload = data?.data || {};
      const items = Array.isArray(payload.notifications) ? payload.notifications : [];
      setNotifications(items);
      setUnreadCount(typeof payload.unreadCount === 'number' ? payload.unreadCount : items.filter(n => !n.read).length);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      console.error('Failed to fetch real-time notifications', err);
    }
  };
  const syncNativePermission = async () => {
    try {
      if (!isNativePlatform()) return;
      const perm = await LocalNotifications.checkPermissions();
      setNotificationPermission(perm.display === 'granted' ? 'granted' : 'default');
    } catch {
      setNotificationPermission('default');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (isNativePlatform()) {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') {
          toast.error('Enable notifications from app settings');
          setNotificationPermission('default');
          return;
        }
        setNotificationPermission('granted');
        toast.success('System notifications enabled');
        return;
      }

      if (typeof Notification === 'undefined') return;
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Browser notifications enabled');
      }
    } catch (error) {
      console.warn('Notification permission request failed:', error?.message || error);
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('notificationSoundEnabled', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('fb-notification-sound', { detail: { enabled: next } }));
    toast.success(next ? 'Alert sound enabled' : 'Alert sound muted');
  };

  // Fetch unread count once when auth state changes.
  useEffect(() => {
    fetchNotifications();
  }, [isAuthenticated, userId]);

  // Fetch latest notifications when menu opens.
  useEffect(() => {
    if (!showMenu) return;
    fetchNotifications();
  }, [showMenu]);

  useEffect(() => {
    syncNativePermission();
  }, []);

  const markAllRead = async () => {
    if (!isAuthenticated || !userId) return;

    try {
      await axiosInstance.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) return;
      console.error(err);
    }
  };

  const filteredNotifications = activeTab === 'all'
    ? notifications
    : notifications.filter((notif) => getNotificationGroup(notif) === activeTab);

  const tabCount = (tabId) => {
    if (tabId === 'all') return notifications.length;
    return notifications.filter((notif) => getNotificationGroup(notif) === tabId).length;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="relative p-2 text-gray-600 hover:text-primary-500 transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 text-white text-[9px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-bold border-2 border-white"
            style={{ background: BRAND }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
          <div className="fixed lg:absolute left-2 right-2 lg:left-auto lg:right-0 top-[calc(env(safe-area-inset-top)+56px)] lg:top-full lg:mt-2 w-auto lg:w-[360px] max-w-none lg:max-w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-white to-[#FFF7F5]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-[#FFF0ED] flex items-center justify-center">
                  <BellAlertIcon className="h-4.5 w-4.5" style={{ color: BRAND }} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Notifications</h3>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[min(60vh,390px)] overflow-y-auto">
              {/* Settings Section */}
              <div className="p-3 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">Alert Sound</span>
                    <span className="text-[11px] text-gray-400">for in-app notifications</span>
                  </div>
                  <div className="inline-flex items-center rounded-xl p-1 bg-gray-100 border border-gray-200">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!soundEnabled) toggleSound(); }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${soundEnabled ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      type="button"
                    >
                      <SpeakerWaveIcon className="h-3.5 w-3.5" />
                      On
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (soundEnabled) toggleSound(); }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${!soundEnabled ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      type="button"
                    >
                      <SpeakerXMarkIcon className="h-3.5 w-3.5" />
                      Off
                    </button>
                  </div>
                </div>
              </div>

              {notificationPermission !== 'granted' && (
                <div className="px-3 py-2 bg-[#FFF0ED] border-b border-[#FFD0C5]">
                  <p className="text-[10px] font-semibold text-primary-700 mb-1.5 leading-tight">
                    Enable system notifications to receive alerts on lock screen and notification panel.
                  </p>
                  {(notificationPermission === 'default' || notificationPermission === 'denied') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); requestNotificationPermission(); }}
                      className="w-full py-1.5 text-white rounded text-[10px] font-bold tracking-wide"
                      style={{ background: BRAND }}
                    >
                      ENABLE SYSTEM ALERTS
                    </button>
                  )}
                </div>
              )}

              <div className="px-3 py-2 border-b border-gray-100 bg-white">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {TAB_DEFS.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${active ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
                        style={active ? { background: BRAND } : {}}
                      >
                        {tab.label} {tabCount(tab.id)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notification List */}
              <div className="divide-y divide-gray-100 bg-white">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-300" />
                    <p className="text-xs font-medium">No notifications in this tab</p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const isUnread = !(notif.read ?? notif.isRead);
                    const visual = getNotificationVisual(notif);
                    const Icon = visual.Icon;

                    return (
                      <div
                        key={notif._id}
                        className="p-4 transition-colors hover:bg-gray-50 flex gap-3"
                        style={isUnread ? { background: visual.unreadBg } : {}}
                      >
                        <div
                          className="mt-0.5 h-8 w-8 rounded-xl border border-gray-100 flex items-center justify-center shadow-sm"
                          style={{ background: visual.iconBg }}
                        >
                          <Icon className="h-4.5 w-4.5" style={{ color: visual.iconColor }} />
                        </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isUnread ? 'text-gray-900 font-semibold' : 'text-gray-700 font-medium'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[10px] font-medium text-gray-400 mt-1.5 block uppercase tracking-wide">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {isUnread && (
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: visual.unreadDot }} />
                      )}
                    </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-2 border-t border-gray-100 bg-gray-50/50">
              <Link to="/notifications" onClick={() => setShowMenu(false)} className="block w-full text-center text-xs font-semibold text-gray-600 hover:text-gray-900 p-1.5">
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
