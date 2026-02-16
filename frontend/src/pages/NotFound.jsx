import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl sm:text-9xl font-bold text-orange-500">404</h1>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">Page not found</h2>
        <p className="mt-2 text-gray-600 text-sm sm:text-base">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors touch-feedback"
        >
          <HomeIcon className="h-5 w-5 mr-2" />
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
