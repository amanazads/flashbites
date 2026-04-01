import React from "react";

const LocationStep1 = ({ onAllow, onDeny }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1c1c1e] text-white p-6 rounded-2xl w-[90%] max-w-sm text-center">
        <div className="text-3xl mb-4">📍</div>

        <h2 className="text-lg font-semibold mb-2">
          Allow FlashBites to access your location?
        </h2>

        <p className="text-sm text-gray-400 mb-6">
          We use your location to show nearby restaurants and faster delivery.
        </p>

        <div className="space-y-3">
          <button
            onClick={onAllow}
            className="w-full bg-orange-500 py-2 rounded-lg font-medium"
          >
            While using the app
          </button>

          <button
            onClick={onAllow}
            className="w-full bg-gray-700 py-2 rounded-lg"
          >
            Only this time
          </button>

          <button
            onClick={onDeny}
            className="w-full text-blue-400"
          >
            Don’t allow
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationStep1;