import { IoReceiptOutline, IoTimeOutline, IoRefreshOutline, IoStatsChartOutline, IoFilterOutline, IoDownloadOutline } from 'react-icons/io5';
import { Card, MenuItem } from '../components/common';

const Orders = () => {
  const menuItems = [
    { icon: IoReceiptOutline, label: 'Current Orders', count: 2, description: 'Track active orders' },
    { icon: IoTimeOutline, label: 'Order History', count: 12, description: 'View past orders' },
    { icon: IoRefreshOutline, label: 'Reorder', description: 'Order again from favorites' },
    { icon: IoStatsChartOutline, label: 'Spending Stats', description: 'View your statistics' },
    { icon: IoFilterOutline, label: 'Filter Orders', description: 'Sort and filter' },
    { icon: IoDownloadOutline, label: 'Download Receipts', description: 'Get order receipts' },
  ];

  return (
    <div className="min-h-screen pt-6 px-4 pb-24 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and track your orders</p>
        </div>
ants 
        <Card className="overflow-hidden animate-fadeIn">
          {menuItems.map((item, index) => (
            <MenuItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              count={item.count}
              showBorder={index !== menuItems.length - 1}
              onClick={() => console.log(`Navigate to ${item.label}`)}
            />
          ))}
        </Card>
      </div>
    </div>
  );
};

export default Orders;
