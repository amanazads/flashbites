import React from "react";

const LocationStep2 = ({ location, onRetry }) => {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center text-center px-6 z-50">
      
      <h2 className="text-xl font-semibold mb-2">
        We are not in your area yet
      </h2>

      <p className="text-gray-500 mb-6">
        Coming soon to <span className="font-medium">{location}</span>
      </p>

      <img
        src="https://cdn-icons-png.flaticon.com/512/1046/1046784.png"
        alt="no service"
        className="w-40 mb-6"
      />

      <button
        onClick={onRetry}
        className="bg-orange-500 text-white px-6 py-3 rounded-xl"
      >
        Change Location
      </button>
    </div>
  );
};

export default LocationStep2;