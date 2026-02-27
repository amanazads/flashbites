import { NavLink } from 'react-router-dom';
import { IoHomeOutline, IoHome, IoSearchOutline, IoSearch, IoReceiptOutline, IoReceipt, IoPersonOutline, IoPerson } from 'react-icons/io5';

const navItems = [
  {
    path: '/',
    label: 'Home',
    iconOutline: IoHomeOutline,
    iconFilled: IoHome,
  },
  {
    path: '/search',
    label: 'Search',
    iconOutline: IoSearchOutline,
    iconFilled: IoSearch,
  },
  {
    path: '/orders',
    label: 'Orders',
    iconOutline: IoReceiptOutline,
    iconFilled: IoReceipt,
  },
  {
    path: '/profile',
    label: 'Profile',
    iconOutline: IoPersonOutline,
    iconFilled: IoPerson,
  },
];

const BottomNavigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-sm safe-area-bottom">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-around h-14 sm:h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 sm:px-6 py-2 transition-colors relative flex-1 ${
                  isActive ? 'text-orange-500' : 'text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute -top-px left-1/2 -translate-x-1/2 w-10 sm:w-12 h-0.5 bg-orange-500 rounded-full" />
                  )}
                  <div className="transition-colors">
                    {isActive ? (
                      <item.iconFilled className="text-xl sm:text-2xl" />
                    ) : (
                      <item.iconOutline className="text-xl sm:text-2xl" />
                    )}
                  </div>
                  <span className="text-xs font-medium">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
