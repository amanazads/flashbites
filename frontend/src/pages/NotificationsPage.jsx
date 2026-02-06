import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationAsRead, deleteNotification } from '../api/deliveryPartnerApi';
import { formatDistanceToNow } from 'date-fns';
import { BellIcon, CheckIcon, TrashIcon, FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import socketService from '../services/socketService';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, unread, orders, alerts
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, unread
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    // Socket listener for new notifications
    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      playNotificationSound();
    };

    socketService.onNotification(handleNewNotification);

    return () => {
      // Cleanup socket listener
      socketService.offNotification(handleNewNotification);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
      if (unreadIds.length === 0) {
        toast.success('All notifications already read');
        return;
      }
      
      await Promise.all(unreadIds.map(id => markNotificationAsRead(id)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleDeleteRead = async () => {
    try {
      const readIds = notifications.filter(n => n.read).map(n => n._id);
      if (readIds.length === 0) {
        toast.success('No read notifications to delete');
        return;
      }
      
      await Promise.all(readIds.map(id => deleteNotification(id)));
      setNotifications(prev => prev.filter(n => !n.read));
      toast.success(`Deleted ${readIds.length} read notifications`);
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id, { stopPropagation: () => {} });
    }

    // Navigate based on notification type
    if (notification.type === 'order' || notification.type === 'new_order') {
      navigate('/delivery-dashboard');
    } else if (notification.type === 'delivery') {
      navigate('/delivery-dashboard');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
      case 'new_order':
        return '📦';
      case 'delivery':
        return '🚚';
      case 'payment':
        return '💰';
      case 'alert':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'order':
      case 'new_order':
        return 'from-blue-400 to-blue-500';
      case 'delivery':
        return 'from-green-400 to-green-500';
      case 'payment':
        return 'from-yellow-400 to-yellow-500';
      case 'alert':
        return 'from-red-400 to-red-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(n => {
      // Tab filter
      if (activeTab === 'unread' && n.read) return false;
      if (activeTab === 'orders' && !['order', 'new_order', 'delivery'].includes(n.type)) return false;
      if (activeTab === 'alerts' && n.type !== 'alert') return false;

      // Search filter
      if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !n.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'unread') return (a.read ? 1 : -1) - (b.read ? 1 : -1);
      return 0;
    });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <BellIcon className="w-7 h-7 text-white" />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Notifications</h1>
                <p className="text-gray-600 mt-1">Stay updated with your delivery activities</p>
              </div>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
              >
                <FunnelIcon className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-700">Sort</span>
              </button>
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all shadow-sm font-semibold"
              >
                <CheckIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Mark All Read</span>
              </button>
              <button
                onClick={handleDeleteRead}
                className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all shadow-sm font-semibold"
              >
                <TrashIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Clear Read</span>
              </button>
            </div>
          </div>

          {/* Sort Options */}
          {showFilters && (
            <div className="mb-6 p-4 bg-white rounded-xl border-2 border-gray-200 shadow-lg animate-fade-in-down">
              <p className="text-sm font-bold text-gray-700 mb-3">Sort By</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'unread', label: 'Unread First' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setShowFilters(false);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      sortBy === option.value
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { value: 'all', label: 'All', count: notifications.length },
              { value: 'unread', label: 'Unread', count: unreadCount },
              { value: 'orders', label: 'Orders', count: notifications.filter(n => ['order', 'new_order', 'delivery'].includes(n.type)).length },
              { value: 'alerts', label: 'Alerts', count: notifications.filter(n => n.type === 'alert').length }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.value
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.value ? 'bg-white/30' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-4">
            {filteredNotifications.map((notification, index) => (
              <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 animate-fade-in-up ${
                  notification.read ? 'border-gray-100 hover:border-gray-300' : 'border-orange-200 hover:border-orange-400 bg-gradient-to-r from-orange-50/50 to-transparent'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`relative flex-shrink-0 w-14 h-14 bg-gradient-to-br ${getNotificationColor(notification.type)} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <span className="text-3xl">{getNotificationIcon(notification.type)}</span>
                    {!notification.read && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className={`text-lg font-bold ${notification.read ? 'text-gray-700' : 'text-gray-900'} group-hover:text-orange-600 transition-colors`}>
                        {notification.title}
                      </h3>
                      <span className="flex-shrink-0 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-semibold">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`${notification.read ? 'text-gray-600' : 'text-gray-700'} leading-relaxed mb-3`}>
                      {notification.message}
                    </p>
                    {notification.orderId && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                        <span>Order #{notification.orderId.slice(-6)}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification._id, e)}
                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all"
                        title="Mark as read"
                      >
                        <CheckIcon className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(notification._id, e)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
            <div className="mb-6">
              <BellAlertIcon className="w-24 h-24 text-gray-300 mx-auto" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              {searchQuery 
                ? `No notifications match "${searchQuery}"`
                : activeTab === 'unread'
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <p className="text-3xl font-extrabold text-gray-900">{notifications.length}</p>
            <p className="text-sm text-gray-600 mt-1">Total</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <p className="text-3xl font-extrabold text-orange-600">{unreadCount}</p>
            <p className="text-sm text-gray-600 mt-1">Unread</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <p className="text-3xl font-extrabold text-blue-600">{notifications.filter(n => ['order', 'new_order', 'delivery'].includes(n.type)).length}</p>
            <p className="text-sm text-gray-600 mt-1">Orders</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <p className="text-3xl font-extrabold text-red-600">{notifications.filter(n => n.type === 'alert').length}</p>
            <p className="text-sm text-gray-600 mt-1">Alerts</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
