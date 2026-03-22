import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { isRestaurantOpen } from '../../utils/helpers';

const BRAND = '#E23744';
const DELIVERY_RADIUS_KM = 20;

const getDiscount = (r) => {
  if (r.discount) return r.discount;
  return Math.max(20, Math.min((r.rating || 4) * 10, 60));
};

const RestaurantCard = ({ restaurant: r }) => {
  const discount = getDiscount(r);
  const rating = parseFloat(r.rating) || 4.0;
  const ratingBg = rating >= 4.5 ? '#1BA672' : rating >= 4.0 ? '#1BA672' : rating >= 3.5 ? '#E8A020' : '#E23744';

  const { isOpen, opensAt } = isRestaurantOpen(r.timing, r.acceptingOrders !== false);
  const outOfRange = r.distance !== undefined && r.distance > DELIVERY_RADIUS_KM;
  const unavailable = outOfRange || !isOpen;

  const CardWrapper = unavailable
    ? ({ children, ...props }) => <div {...props}>{children}</div>
    : ({ children, ...props }) => <Link to={`/restaurant/${r._id}`} {...props}>{children}</Link>;

  return (
    <CardWrapper
      className="block bg-white group"
      style={{
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        overflow: 'hidden',
        transition: 'box-shadow 0.22s ease, transform 0.22s ease',
        cursor: unavailable ? 'default' : 'pointer',
      }}
      onMouseEnter={e => {
        if (!unavailable) {
          e.currentTarget.style.boxShadow = '0 10px 32px rgba(0,0,0,0.12)';
          e.currentTarget.style.transform = 'translateY(-3px)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* ── Image — aspect-ratio preserves shape at any width ── */}
      <div className="relative" style={{ aspectRatio: '16/9' }}>
        <img
          src={r.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80'}
          alt={r.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${!unavailable ? 'group-hover:scale-105' : ''}`}
          loading="lazy"
          style={{ filter: unavailable ? 'grayscale(30%) brightness(0.9)' : 'none' }}
        />

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 max-[300px]:top-2 max-[300px]:left-2">
          {isOpen && !outOfRange && rating >= 4.5 && (
            <span
              className="text-white text-[10px] max-[300px]:text-[9px] font-bold px-2 py-1 max-[300px]:px-1.5 max-[300px]:py-0.5 rounded-lg"
              style={{ background: 'rgba(226,55,68,0.92)', backdropFilter: 'blur(4px)' }}
            >
              TOP RATED
            </span>
          )}
          {isOpen && !outOfRange && rating < 4.5 && (
            <span
              className="text-white text-[10px] max-[300px]:text-[9px] font-bold px-2 py-1 max-[300px]:px-1.5 max-[300px]:py-0.5 rounded-lg"
              style={{ background: 'rgba(226,55,68,0.88)', backdropFilter: 'blur(4px)' }}
            >
              {r.isPureVeg ? 'PURE VEG' : `₹${discount} OFF`}
            </span>
          )}
        </div>

        {/* Rating badge — bottom right */}
        <div
          className="absolute bottom-3 left-3 flex items-center gap-0.5 text-white text-[11px] max-[300px]:text-[10px] font-bold px-2 py-1 max-[300px]:px-1.5 max-[300px]:py-0.5 rounded-lg shadow-md"
          style={{ background: ratingBg }}
        >
          <StarIcon className="h-3 w-3" />
          {r.rating || '4.0'}/5
        </div>

        {/* Closed overlay */}
        {!isOpen && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5">
            <span className="bg-white text-gray-900 text-[11px] max-[300px]:text-[10px] font-bold px-3 py-1.5 max-[300px]:px-2.5 max-[300px]:py-1 rounded-lg shadow">
              Closed Now
            </span>
            {opensAt && (
              <span className="text-white/75 text-[10px] max-[300px]:text-[9px]">Opens at {opensAt}</span>
            )}
          </div>
        )}

        {/* Out of range overlay */}
        {isOpen && outOfRange && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5">
            <span className="bg-white text-gray-900 text-[11px] max-[300px]:text-[10px] font-bold px-3 py-1.5 max-[300px]:px-2.5 max-[300px]:py-1 rounded-lg shadow text-center">
              Coming Soon to Your Area
            </span>
            <span className="text-white/70 text-[10px] max-[300px]:text-[9px]">{r.distance?.toFixed(1)} km away</span>
          </div>
        )}
      </div>

      {/* ── Info ── */}
        <div className="p-2.5 xs:p-3.5 max-[300px]:p-2" style={{ opacity: unavailable ? 0.7 : 1 }}>
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="text-[13px] xs:text-[15px] max-[300px]:text-[12px] font-bold text-gray-900 leading-tight flex-1 line-clamp-1">{r.name}</h3>
          </div>

        <p className="text-[12px] max-[300px]:text-[11px] text-gray-400 mb-2 line-clamp-1 font-medium">
          {Array.isArray(r.cuisines) ? r.cuisines.join(', ') : r.cuisine || 'Multi-cuisine'}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-0 text-[12px] max-[300px]:text-[11px] font-medium text-gray-500 border-t border-gray-100 pt-2.5 mt-2.5">
          <span className="flex items-center gap-1 flex-1">
            <ClockIcon className="h-3.5 w-3.5" style={{ color: BRAND }} />
            {String(r.deliveryTime || '30').replace(/\s*min\s*$/i, '')} min
          </span>
          <span
            className="w-px h-3 bg-gray-200 mx-2 flex-shrink-0"
          />
          <span className="flex items-center gap-1 flex-1">
            <MapPinIcon className="h-3.5 w-3.5" style={{ color: BRAND }} />
            {r.distance ? `${r.distance.toFixed(1)} km` : r.address?.city || 'Nearby'}
          </span>
        </div>

        {/* Offer strip */}
        {isOpen && !outOfRange && (
          <div
            className="mt-2.5 pt-2.5 border-t border-dashed border-gray-100 flex items-center gap-1.5"
          >
            <div
              className="h-4 w-4 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: '#FEF2F3' }}
            >
              <span className="text-[9px] font-black" style={{ color: BRAND }}>%</span>
            </div>
            <span className="text-[11px] max-[300px]:text-[10px] font-semibold" style={{ color: BRAND }}>
              Flat ₹{discount} OFF
            </span>
          </div>
        )}
      </div>
    </CardWrapper>
  );
};

export default RestaurantCard;