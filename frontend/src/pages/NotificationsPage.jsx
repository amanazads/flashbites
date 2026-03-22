import React from 'react';
import NotificationSettings from '../components/common/NotificationSettings';

const NotificationsPage = () => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-3xl mx-auto container-px py-6 sm:py-8">
        <NotificationSettings />
      </div>
    </div>
  );
};

export default NotificationsPage;
