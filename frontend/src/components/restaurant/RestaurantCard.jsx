import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

const getDiscount = (r) => {
  if (r.discount) return r.discount;
  return Math.max(20, Math.min((r.rating || 4) * 10, 60));
};

const RestaurantCard = ({ restaurant: r }) => {
  const discount = getDiscount(r);
  const rating = parseFloat(r.rating) || 4.0;
  const ratingBg = rating >= 4.5 ? '#16a34a' : rating >= 4.0 ? '#15803d' : rating >= 3.5 ? '#ca8a04' : '#dc2626';

  return (
    <Link
      to={`/restaurant/${r._id}`}
      className="block bg-white group animate-fade-in"
      style={{ borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden', transition: 'box-shadow 0.25s ease, transform 0.25s ease' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Image */}
      <div className="relative" style={{ height: '160px' }}>
        <img
          src={r.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80'}
          alt={r.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Discount chip */}
        <div
          className="absolute top-2.5 left-2.5 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm"
          style={{ background: 'rgba(255,106,77,0.92)', backdropFilter: 'blur(4px)' }}
        >
          {r.isVeg ? '🌿 PURE VEG' : `FLAT ₹${discount} OFF`}
        </div>

        {/* Bookmark */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute top-2.5 right-2.5 bg-white/90 hover:bg-white rounded-xl p-1.5 shadow-sm transition-all hover:scale-110"
        >
          <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>

        {/* Closed overlay */}
        {!r.acceptingOrders && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="bg-white text-gray-900 text-[10px] font-bold px-3 py-1 rounded-lg shadow">
              Closed Now
            </span>
          </div>
        )}

        {/* Free delivery tag */}
        {(r.deliveryFee === 0 || r.deliveryFee === '0') && (
          <div
            className="absolute bottom-2.5 left-2.5 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm"
            style={{ background: 'rgba(22,163,74,0.9)', backdropFilter: 'blur(4px)' }}
          >
            Free Delivery
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight flex-1 line-clamp-1">{r.name}</h3>
          <div
            className="flex-shrink-0 flex items-center gap-0.5 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm"
            style={{ background: ratingBg }}
          >
            <StarIcon className="h-2.5 w-2.5" />
            {r.rating || '4.0'}
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mb-2.5 line-clamp-1 font-medium">
          {Array.isArray(r.cuisine) ? r.cuisine.join(' · ') : r.cuisine || 'Multi-cuisine'}
        </p>

        <div className="flex items-center gap-2.5 text-[11px] font-medium text-gray-500">
          <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md">
            <ClockIcon className="h-3 w-3 text-brand" style={{ color: '#B30B33' }} />
            {String(r.deliveryTime || '30').replace(/\s*min\s*$/i, '')} min
          </span>
          <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md">
            <MapPinIcon className="h-3 w-3 text-brand" style={{ color: '#B30B33' }} />
            {r.distance ? `${r.distance.toFixed(1)} km` : '2.4 km'}
          </span>
          <span className="bg-gray-50 px-1.5 py-0.5 rounded-md truncate">
            {r.deliveryFee === 0 ? 'Free delivery' : `₹${r.deliveryFee ?? 0} delivery`}
          </span>
        </div>

        {/* Offer strip */}
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-100 flex items-center gap-1.5 opacity-90">
          <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ background: '#fcf0f3' }}>
            <span className="text-[9px] font-bold block" style={{ color: '#B30B33' }}>%</span>
          </div>
          <span className="text-[10px] font-bold" style={{ color: '#B30B33' }}>
            Flat ₹{discount} OFF above ₹{discount + 89}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;