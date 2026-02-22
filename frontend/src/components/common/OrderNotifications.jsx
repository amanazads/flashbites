import React, { useEffect, useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { getRestaurantOrders } from '../api/orderApi';
import toast from 'react-hot-toast';

const OrderNotifications = ({ restaurantId }) => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [lastChecked, setLastChecked] = useState(Date.now());

  useEffect(() => {
    if (!restaurantId) return;

    checkForNewOrders();
    
    // Check for new orders every 30 seconds
    const interval = setInterval(() => {
      checkForNewOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [restaurantId]);

  const checkForNewOrders = async () => {
    try {
      const response = await getRestaurantOrders(restaurantId, { status: 'pending' });
      const pendingOrders = response.data.orders || [];
      
      // Count new orders since last check
      const newOrders = pendingOrders.filter(order => 
        new Date(order.createdAt).getTime() > lastChecked
      );

      if (newOrders.length > 0) {
        setNewOrdersCount(prev => prev + newOrders.length);
        toast.success(`${newOrders.length} new order${newOrders.length > 1 ? 's' : ''} received!`, {
          icon: '🔔',
          duration: 5000,
        });
        
        // Play notification sound (optional)
        // const audio = new Audio('/notification.mp3');
        // audio.play().catch(err => console.log('Audio play failed:', err));
      }
      
      setLastChecked(Date.now());
    } catch (error) {
      console.error('Failed to check for new orders:', error);
    }
  };

  const clearNotifications = () => {
    setNewOrdersCount(0);
  };

  if (!restaurantId) return null;

  return (
    <button
      onClick={clearNotifications}
      className="relative p-2 hover:bg-gray-100 rounded-full transition"
      title="Order Notifications"
    >
      {newOrdersCount > 0 ? (
        <BellAlertIcon className="h-6 w-6 text-primary-500 animate-pulse" />
      ) : (
        <BellIcon className="h-6 w-6 text-gray-600" />
      )}
      
      {newOrdersCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {newOrdersCount > 9 ? '9+' : newOrdersCount}
        </span>
      )}
    </button>
  );
};

export default OrderNotifications;
