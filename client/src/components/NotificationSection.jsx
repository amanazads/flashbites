import { useState } from 'react';
import { IoNotifications, IoClose, IoGiftOutline, IoCheckmarkCircle, IoAlertCircle, IoInformationCircle } from 'react-icons/io5';

const notifications = [
  {
    id: 1,
    type: 'offer',
    icon: IoGiftOutline,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    title: '50% OFF on First Order!',
    message: 'Use code FLASH50 for 50% discount on your first 3 orders',
    time: '5 min ago',
    isNew: true
  },
  {
    id: 2,
    type: 'success',
    icon: IoCheckmarkCircle,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    title: 'Order Delivered Successfully',
    message: 'Your order #12345 was delivered. Hope you enjoyed!',
    time: '2 hours ago',
    isNew: false
  },
  {
    id: 3,
    type: 'info',
    icon: IoInformationCircle,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    title: 'New Restaurants Added',
    message: '10 new restaurants are now available in your area',
    time: '1 day ago',
    isNew: true
  },
  {
    id: 4,
    type: 'alert',
    icon: IoAlertCircle,
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    title: 'Delivery Delay Notice',
    message: 'Some restaurants may have longer delivery times due to high demand',
    time: '2 days ago',
    isNew: false
  }
];

const NotificationSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationList, setNotificationList] = useState(notifications);
  
  const unreadCount = notificationList.filter(n => n.isNew).length;

  const handleRemove = (id) => {
    setNotificationList(notificationList.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotificationList(notificationList.map(n => ({ ...n, isNew: false })));
  };

  const clearAll = () => {
    setNotificationList([]);
    setIsOpen(false);
  };

  return (
    <div className="px-4 py-3">
      <div className="max-w-7xl mx-auto">
        {/* Notification Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-orange-500 p-2 rounded-lg">
                <IoNotifications className="text-white text-xl" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}` : 'No new notifications'}
              </p>
            </div>
          </div>
          <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* Notification Panel */}
        {isOpen && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-base">All Notifications</h3>
                <p className="text-orange-100 text-xs">{notificationList.length} total</p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {notificationList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">🔔</div>
                  <p className="text-gray-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                notificationList.map((notification) => {
                  const Icon = notification.icon;
                  return (
                    <div
                      key={notification.id}
                      className={`border-b border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors relative ${
                        notification.isNew ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`${notification.bgColor} ${notification.borderColor} border p-2 rounded-lg flex-shrink-0`}>
                          <Icon className={`${notification.iconColor} text-xl`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">
                              {notification.title}
                              {notification.isNew && (
                                <span className="ml-2 inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
                              )}
                            </h4>
                            <button
                              onClick={() => handleRemove(notification.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                            >
                              <IoClose className="text-lg" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSection;
