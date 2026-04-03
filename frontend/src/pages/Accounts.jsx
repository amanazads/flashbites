import React from 'react';
import { Link } from 'react-router-dom';
import { BuildingStorefrontIcon, TruckIcon } from '@heroicons/react/24/outline';

const accountCards = [
  {
    key: 'restaurant',
    title: 'Restaurant Account',
    description: 'Create and manage your restaurant partner account.',
    loginTo: '/accounts/restaurant/login',
    registerTo: '/accounts/restaurant/register',
    Icon: BuildingStorefrontIcon,
  },
  {
    key: 'delivery',
    title: 'Delivery Partner Account',
    description: 'Create and manage your delivery partner account.',
    loginTo: '/accounts/delivery/login',
    registerTo: '/accounts/delivery/register',
    Icon: TruckIcon,
  },
];

const Accounts = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Business Accounts</h1>
          <p className="text-gray-600 mt-2">
            Choose your business account type to register or login.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accountCards.map(({ key, title, description, loginTo, registerTo, Icon }) => (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-primary-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600 mt-2">{description}</p>

              <div className="mt-6 flex gap-3">
                <Link
                  to={registerTo}
                  className="flex-1 text-center bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  Register
                </Link>
                <Link
                  to={loginTo}
                  className="flex-1 text-center border border-primary-600 text-primary-600 py-2.5 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
                >
                  Login
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Accounts;
