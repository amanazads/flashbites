import React from 'react';
import logo from '../../assets/logo.png';

export const Loader = () => {
  return (
    <div className="flex justify-center items-center py-10">
      <div className="flex flex-col items-center gap-3">
        <div
          className="rounded-2xl bg-white shadow-sm"
          style={{ border: '1px solid #F0F2F5', width: '64px', height: '64px' }}
        >
          <img
            src={logo}
            alt="FlashBites loading"
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
        <p className="text-xs text-gray-400">Loading…</p>
      </div>
    </div>
  );
};

export const FullPageLoader = () => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center">
        <div
          className="rounded-3xl bg-white shadow-md mx-auto"
          style={{ border: '1px solid #F0F2F5', width: '72px', height: '72px' }}
        >
          <img
            src={logo}
            alt="FlashBites loading"
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
};