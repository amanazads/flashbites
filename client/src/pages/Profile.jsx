import { IoHeartOutline, IoSettingsOutline, IoHelpCircleOutline, IoLogOutOutline, IoPersonCircleOutline, IoNotificationsOutline, IoWalletOutline } from 'react-icons/io5';
import { Card, MenuItem } from '../components/common';

const Profile = () => {
  const menuItems = [
    { icon: IoPersonCircleOutline, label: 'Account Settings', description: 'Manage your profile' },
    { icon: IoHeartOutline, label: 'Favorites', count: 0, description: 'Your favorite restaurants' },
    { icon: IoWalletOutline, label: 'Payment Methods', description: 'Cards and wallet' },
    { icon: IoNotificationsOutline, label: 'Notifications', description: 'Manage notifications' },
    { icon: IoSettingsOutline, label: 'Settings', description: 'App preferences' },
    { icon: IoHelpCircleOutline, label: 'Help & Support', description: 'Get help' },
    { icon: IoLogOutOutline, label: 'Logout', description: 'Sign out', isDanger: true },
  ];

  return (
    <div className="min-h-screen pt-6 px-4 pb-24 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

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

export default Profile;
