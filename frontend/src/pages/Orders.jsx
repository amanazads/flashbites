import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserOrders } from '../redux/slices/orderSlice';
import { Loader } from '../components/common/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../utils/constants';

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((state) => state.order);

  useEffect(() => {
    dispatch(fetchUserOrders());
  }, [dispatch]);

  // Debug: Log orders to check for duplicates
  useEffect(() => {
    if (orders && orders.length > 0) {
      console.log('Orders received:', orders.length);
      console.log('Order IDs:', orders.map(o => o._id));
      
      // Check for duplicate IDs
      const ids = orders.map(o => o._id);
      const uniqueIds = [...new Set(ids)];
      if (ids.length !== uniqueIds.length) {
        console.warn('⚠️ DUPLICATE ORDERS DETECTED!');
        console.warn('Total orders:', ids.length);
        console.warn('Unique orders:', uniqueIds.length);
      }
    }
  }, [orders]);

  // Filter out duplicate orders by ID
  const uniqueOrders = React.useMemo(() => {
    if (!orders) return [];
    const seen = new Set();
    return orders.filter(order => {
      if (seen.has(order._id)) {
        return false;
      }
      seen.add(order._id);
      return true;
    });
  }, [orders]);

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">My Orders</h1>

        {uniqueOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-6">Start ordering from your favorite restaurants</p>
            <Link to="/restaurants" className="btn-primary">
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {uniqueOrders.map((order) => (
              <Link
                key={order._id}
                to={`/orders/${order._id}`}
                className="block bg-white rounded-lg shadow hover:shadow-lg transition p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold">{order.restaurantId?.name}</h3>
                    <p className="text-sm text-gray-600">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>

                <div className="flex justify-between items-end sm:items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-600">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-gray-600">
                      Order #{order._id.slice(-6)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">
                      {formatCurrency(order.total)}
                    </p>
                    <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                      View Details →
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;