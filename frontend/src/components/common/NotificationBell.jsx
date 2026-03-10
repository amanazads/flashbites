import React, { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../../hooks/useNotifications';
import axiosInstance from '../../api/axios';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const BRAND = '#FF523B';

const NotificationBell = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const {
    connected,
    soundEnabled,
    toggleSound,
    requestNotificationPermission,
    notificationPermission,
  } = useNotifications();

  // Fetch real notifications whenever the menu is opened or component mounts
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await axiosInstance.get('/notifications?limit=5');
        const items = data.data || data;
        setNotifications(Array.isArray(items) ? items : []);
        setUnreadCount(Array.isArray(items) ? items.filter(n => !n.isRead).length : 0);
      } catch (err) {
        console.error('Failed to fetch real-time notifications', err);
      }
    };
    if (showMenu) fetchNotifications();
    else fetchNotifications(); // load unread count silently
  }, [showMenu, connected]);

  const markAllRead = async () => {
    try {
      await axiosInstance.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
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
          <div className="absolute right-0 sm:-right-2 mt-2 w-[calc(100vw-2rem)] max-w-[340px] sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {/* Settings Section */}
              <div className="p-3 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{soundEnabled ? '🔔' : '🔕'}</span>
                  <span className="text-xs font-semibold text-gray-700">Alert Sound</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSound(); }}
                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                  style={{ background: soundEnabled ? BRAND : '#E5E7EB' }}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-4.5' : 'translate-x-1'}`} />
                </button>
              </div>

              {notificationPermission !== 'granted' && (
                <div className="px-3 py-2 bg-[#FFF0ED] border-b border-[#FFD0C5]">
                  <p className="text-[10px] font-semibold text-primary-700 mb-1.5 leading-tight">
                    Allow browser push notifications so you don't miss new orders when the tab is closed!
                  </p>
                  {notificationPermission === 'default' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); requestNotificationPermission(); }}
                      className="w-full py-1.5 text-white rounded text-[10px] font-bold tracking-wide"
                      style={{ background: BRAND }}
                    >
                      ENABLE PUSH ALERTS
                    </button>
                  )}
                  {notificationPermission === 'denied' && (
                    <p className="text-[10px] text-red-600 font-semibold">Blocked in browser settings.</p>
                  )}
                </div>
              )}

              {/* Notification List */}
              <div className="divide-y divide-gray-50 bg-white">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-300" />
                    <p className="text-xs font-medium">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif._id} className={`p-4 transition-colors hover:bg-gray-50 flex gap-3 ${!notif.isRead ? 'bg-primary-50/10' : ''}`}>
                      <div className={`mt-0.5 rounded-full h-2 w-2 flex-shrink-0 ${!notif.isRead ? 'bg-primary-500' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.isRead ? 'text-gray-900 font-semibold' : 'text-gray-700 font-medium'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[10px] font-medium text-gray-400 mt-1.5 block uppercase tracking-wide">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))
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
