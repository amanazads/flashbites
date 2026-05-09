import { useNotifications } from '../../hooks/useNotifications';
import { useAppUpdate } from '../../hooks/useAppUpdate';

const NotificationsBootstrap = () => {
  useNotifications();
  useAppUpdate();
  return null;
};

export default NotificationsBootstrap;
