import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { formatCurrency } from '../../utils/formatters';

const RestaurantCard = ({ restaurant }) => {
  return (
    <Link
      to={`/restaurant/${restaurant._id}`}
      className="card overflow-hidden group"
    >
      {/* Image */}
      <div className="relative h-44 sm:h-48 overflow-hidden">
        <img
          src={restaurant.image || 'https://via.placeholder.com/400x300'}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {/* Open/Closed Badge */}
        <div className="absolute top-2 right-2">
          {restaurant.acceptingOrders ? (
            <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full shadow-lg">
              OPEN
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full shadow-lg">
              CLOSED
            </span>
          )}
        </div>
        {!restaurant.acceptingOrders && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <span className="text-white font-semibold text-lg">Currently Closed</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 line-clamp-1">{restaurant.name}</h3>
        
        {/* Cuisines */}
        <p className="text-sm text-gray-600 mb-2 line-clamp-1">
          {restaurant.cuisines.join(', ')}
        </p>

        {/* Info Row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          {/* Rating */}
          <div className="flex items-center">
            <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
            <span className="font-semibold">{restaurant.rating}</span>
            <span className="text-gray-500 ml-1">({restaurant.reviewCount})</span>
          </div>

          {/* Delivery Time */}
          <div className="flex items-center text-gray-600">
            <ClockIcon className="h-4 w-4 mr-1" />
            <span>{restaurant.deliveryTime} mins</span>
          </div>

          {/* Delivery Fee */}
          <div className="text-gray-600 text-xs sm:text-sm">
            {restaurant.deliveryFee === 0 ? (
              <span className="text-green-600 font-semibold">Free Delivery</span>
            ) : (
              formatCurrency(restaurant.deliveryFee)
            )}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center text-xs text-gray-500 mt-2">
          <MapPinIcon className="h-3 w-3 mr-1" />
          <span>{restaurant.address.city}</span>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;