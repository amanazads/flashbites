import { IoStar, IoHeartOutline, IoHeart, IoTimeOutline } from 'react-icons/io5';
import { MdDeliveryDining } from 'react-icons/md';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const RestaurantCard = ({ restaurant }) => {
  const { wishlist, toggleWishlist } = useAppContext();
  const navigate = useNavigate();
  const isWishlisted = wishlist.includes(restaurant._id);
  const [imageError, setImageError] = useState(false);

  const categoryIcons = {
    Pizza: '🍕',
    Burger: '🍔',
    Sushi: '🍣',
    Tacos: '🌮',
    Noodles: '🍜',
  };

  const handleCardClick = () => {
    navigate(`/restaurant/${restaurant._id}`);
  };

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    toggleWishlist(restaurant._id);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group border border-gray-200"
    >
      {/* Image Container */}
      <div className="relative h-40 overflow-hidden bg-gray-100">
        {!imageError ? (
          <>
            <img
              src={restaurant.image}
              alt={restaurant.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-5xl">{categoryIcons[restaurant.category] || '🍽️'}</span>
          </div>
        )}
        
        {/* Rating Badge */}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
          <IoStar className="text-yellow-500 text-sm" />
          <span className="font-semibold text-xs text-gray-800">{restaurant.rating}</span>
        </div>
        
        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-sm hover:bg-white transition-colors"
        >
          {isWishlisted ? (
            <IoHeart className="text-red-500 text-base" />
          ) : (
            <IoHeartOutline className="text-gray-600 text-base" />
          )}
        </button>

        {/* Free Delivery Badge */}
        {restaurant.isFreeDelivery && (
          <div className="absolute bottom-2 left-2 bg-green-600 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
            <MdDeliveryDining className="text-sm" />
            Free Delivery
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-base text-gray-900 mb-1 truncate">
          {restaurant.name}
        </h3>
        <p className="text-xs text-gray-600 mb-2 truncate">{restaurant.cuisine}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
            <IoTimeOutline className="text-gray-500 text-sm" />
            <span className="font-medium text-gray-700">{restaurant.deliveryTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{restaurant.priceRange}</span>
            <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 font-medium">
              {restaurant.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
