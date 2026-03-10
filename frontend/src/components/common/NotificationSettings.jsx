import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationSettings = () => {
  const {
    requestNotificationPermission,
    notificationPermission,
  } = useNotifications();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="mr-3">🔔</span>
        Notification Settings
      </h2>

      {/* Sound Notifications */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-700">Sound Notifications</h3>
            <p className="text-sm text-gray-500">
              Plays an alert sound instantly when new real-time orders or updates arrive.
            </p>
          </div>
          <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
            Always On
          </span>
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
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition text-sm font-medium"
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
          <li>Sound alerts are active by default to ensure you instantly hear new orders.</li>
          <li>Browser notifications ensure you don't miss updates when the FlashBites tab is in the background.</li>
          <li>All notifications flow in real-time instantly without delays.</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationSettings;
