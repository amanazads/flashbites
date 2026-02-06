import React from 'react';

// Card skeleton for restaurant/order cards
export const CardSkeleton = ({ count = 3, className = '' }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`bg-white rounded-2xl shadow-lg p-6 animate-pulse ${className}`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
            <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
          </div>
        </div>
      ))}
    </>
  );
};

// Table skeleton for orders/menu items
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      style={{ animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s` }}
                    ></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Stats card skeleton for dashboard analytics
export const StatsCardSkeleton = ({ count = 4 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl shadow-lg p-6 animate-pulse"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      ))}
    </>
  );
};

// Chart skeleton for analytics
export const ChartSkeleton = ({ height = '300px' }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex-1 bg-gray-200 rounded-t-lg animate-pulse"
            style={{
              height: `${Math.random() * 60 + 40}%`,
              animationDelay: `${index * 0.1}s`
            }}
          ></div>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-3 w-8 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
};

// List skeleton for menu items
export const ListSkeleton = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 animate-pulse"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0"></div>
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Full page loader with logo
export const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50">
      <div className="text-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl animate-bounce">
            <span className="text-4xl">🍔</span>
          </div>
          <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl mx-auto blur-xl opacity-50 animate-pulse"></div>
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <p className="text-gray-600 font-semibold text-lg animate-pulse">{message}</p>
      </div>
    </div>
  );
};

// Inline loader for buttons
export const ButtonLoader = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-6 h-6 border-3'
  };

  return (
    <div className={`${sizes[size]} border-white border-t-transparent rounded-full animate-spin`}></div>
  );
};

// Modal skeleton
export const ModalSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
      </div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        <div className="h-32 bg-gray-200 rounded-xl mt-6"></div>
        <div className="flex gap-3 mt-6">
          <div className="h-10 bg-gray-200 rounded-xl flex-1"></div>
          <div className="h-10 bg-gray-200 rounded-xl flex-1"></div>
        </div>
      </div>
    </div>
  );
};

export default {
  Card: CardSkeleton,
  Table: TableSkeleton,
  Stats: StatsCardSkeleton,
  Chart: ChartSkeleton,
  List: ListSkeleton,
  Page: PageLoader,
  Button: ButtonLoader,
  Modal: ModalSkeleton
};
