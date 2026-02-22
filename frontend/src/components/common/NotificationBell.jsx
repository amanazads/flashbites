import React, { useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationBell = () => {
  const [showMenu, setShowMenu] = useState(false);
  const {
    connected,
    soundEnabled,
    toggleSound,
    requestNotificationPermission,
    notificationPermission,
  } = useNotifications();

  return (
    <div className="relative">
      {/* Bell Icon with Connection Indicator */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="relative p-2 text-gray-600 hover:text-primary-500 transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" />
        {/* Connection Status Dot */}
        <span
          className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-gray-400'
          }`}
        ></span>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          ></div>

          {/* Menu Content */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
            </div>

            <div className="p-4 space-y-3">
              {/* Connection Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mr-2 ${
                      connected ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{soundEnabled ? '🔔' : '🔕'}</span>
                  <span className="text-sm font-medium text-gray-700">Sound</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSound();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    soundEnabled ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Browser Notification */}
              {notificationPermission !== 'granted' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800 mb-2">
                    Enable browser notifications for alerts even when tab is inactive
                  </p>
                  {notificationPermission === 'default' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        requestNotificationPermission();
                      }}
                      className="w-full px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition"
                    >
                      Enable Notifications
                    </button>
                  )}
                  {notificationPermission === 'denied' && (
                    <p className="text-xs text-red-600">
                      Blocked. Enable in browser settings.
                    </p>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center mb-2">
                  You'll receive real-time alerts for new orders and updates
                </p>
                
                {/* Test Notification Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Test sound
                    const notificationSound = require('../../utils/notificationSound').default;
                    notificationSound.playNotification('new-order');
                    
                    // Test browser notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                      new Notification('Test Notification 🧪', {
                        body: 'If you see this, notifications are working!',
                        icon: '/favicon.ico',
                        tag: 'test',
                      });
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition"
                >
                  🧪 Test Notification & Sound
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
