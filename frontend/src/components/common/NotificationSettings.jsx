import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationSettings = () => {
  const {
    connected,
    soundEnabled,
    toggleSound,
    requestNotificationPermission,
    notificationPermission,
  } = useNotifications();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="mr-3">🔔</span>
        Notification Settings
      </h2>

      {/* Connection Status */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-700">Real-time Connection</h3>
            <p className="text-sm text-gray-500">Live updates for new orders</p>
          </div>
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span className={`font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Sound Notifications */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-700">Sound Notifications</h3>
            <p className="text-sm text-gray-500">
              Play sound when you receive new orders or updates
            </p>
          </div>
          <button
            onClick={toggleSound}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              soundEnabled ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Browser Notifications */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-700">Browser Notifications</h3>
            <p className="text-sm text-gray-500">
              Receive notifications even when tab is not active
            </p>
          </div>
          <div className="flex items-center gap-3">
            {notificationPermission === 'granted' && (
              <span className="text-sm font-medium text-green-600">✓ Enabled</span>
            )}
            {notificationPermission === 'denied' && (
              <span className="text-sm font-medium text-red-600">✗ Blocked</span>
            )}
            {notificationPermission === 'default' && (
              <button
                onClick={requestNotificationPermission}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium"
              >
                Enable
              </button>
            )}
          </div>
        </div>
        {notificationPermission === 'denied' && (
          <p className="mt-2 text-xs text-gray-500">
            Please enable notifications in your browser settings
          </p>
        )}
      </div>

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
          <span className="mr-2">ℹ️</span>
          How it works
        </h4>
        <ul className="text-sm text-blue-700 space-y-1 ml-6 list-disc">
          <li>Sound alerts play instantly when you receive notifications</li>
          <li>Browser notifications work even when FlashBites tab is in background</li>
          <li>All notifications are real-time with no delays</li>
          <li>You can toggle sound on/off anytime without affecting connection</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationSettings;
