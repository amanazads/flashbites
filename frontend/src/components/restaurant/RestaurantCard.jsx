import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { formatCurrency } from '../../utils/formatters';

const RestaurantCard = ({ restaurant }) => {
  return (
    <Link
      to={`/restaurant/${restaurant._id}`}
      className="card overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fade-in border border-gray-200 hover:border-orange-300"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-100">
        <img
          src={restaurant.image || 'https://via.placeholder.com/400x300'}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Open/Closed Badge */}
        <div className="absolute top-3 right-3 z-10">
          {restaurant.acceptingOrders ? (
            <span className="px-4 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              OPEN NOW
            </span>
          ) : (
            <span className="px-4 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              CLOSED
            </span>
          )}
        </div>
        
        {/* Closed Overlay */}
        {!restaurant.acceptingOrders && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <span className="text-white font-bold text-xl">Currently Closed</span>
              <p className="text-gray-300 text-sm mt-1">Check back soon!</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
          {restaurant.name}
        </h3>
        
        {/* Cuisines */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-1">
          {restaurant.cuisines.join(', ')}
        </p>

        {/* Info Row */}
        <div className="flex items-center justify-between text-sm mb-3">
          {/* Rating */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-50 to-yellow-50 px-2.5 py-1.5 rounded-lg">
            <StarIcon className="h-4 w-4 text-yellow-500" />
            <span className="font-bold text-gray-900">{restaurant.rating}</span>
            <span className="text-gray-500 text-xs">({restaurant.reviewCount})</span>
          </div>

          {/* Delivery Time */}
          <div className="flex items-center gap-1.5 text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg">
            <ClockIcon className="h-4 w-4 text-orange-500" />
            <span className="font-semibold">{restaurant.deliveryTime} min</span>
          </div>
        </div>

        {/* Delivery Fee & Location Row */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          {/* Delivery Fee */}
          <div className="font-semibold">
            {restaurant.deliveryFee === 0 ? (
              <span className="text-green-600 flex items-center gap-1 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                Free Delivery
              </span>
            ) : (
              <span className="text-gray-700 text-sm">{formatCurrency(restaurant.deliveryFee)} delivery</span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center text-xs text-gray-500">
            <MapPinIcon className="h-3.5 w-3.5 mr-1 text-orange-500" />
            <span>{restaurant.address.city}</span>
          </div>
        </div>
      </div>
      
      {/* Hover Action */}
      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <div className="bg-orange-500 text-white p-2 rounded-full shadow-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;