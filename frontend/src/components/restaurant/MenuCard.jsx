import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { PlusIcon } from '@heroicons/react/24/solid';
import { addToCart } from '../../redux/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const MenuCard = ({ item, restaurant }) => {
  const dispatch = useDispatch();
  const [selectedVariant, setSelectedVariant] = useState(
    item.hasVariants && item.variants?.length > 0 ? item.variants[0] : null
  );

  const handleAddToCart = () => {
    const cartItem = item.hasVariants 
      ? {
          ...item,
          selectedVariant: selectedVariant.name,
          price: selectedVariant.price,
          displayName: `${item.name} (${selectedVariant.name})`
        }
      : item;

    dispatch(addToCart({ item: cartItem, restaurant }));
    toast.success(`${item.name}${selectedVariant ? ` (${selectedVariant.name})` : ''} added to cart!`);
  };

  const currentPrice = item.hasVariants && selectedVariant 
    ? selectedVariant.price 
    : item.price;

  const isAvailable = item.hasVariants && selectedVariant
    ? selectedVariant.isAvailable && item.isAvailable
    : item.isAvailable;

  return (
    <div className="card p-4 flex">
      {/* Item Info */}
      <div className="flex-1">
        {/* Veg/Non-veg Indicator */}
        <div className="mb-2">
          {item.isVeg ? (
            <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
            </div>
          ) : (
            <div className="w-4 h-4 border-2 border-red-600 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-red-600"></div>
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.tags.map((tag, index) => (
              <span key={index} className="badge badge-info text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Variants Selection */}
        {item.hasVariants && item.variants && item.variants.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {item.variants.map((variant, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedVariant(variant)}
                  disabled={!variant.isAvailable}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border-2 transition-all ${
                    selectedVariant?.name === variant.name
                      ? 'bg-orange-500 text-white border-orange-500'
                      : variant.isAvailable
                      ? 'bg-white text-gray-700 border-gray-300 hover:border-orange-500'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span>{variant.name}</span>
                    <span className="font-semibold">{formatCurrency(variant.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary-600">
            {formatCurrency(currentPrice)}
          </span>

          {!restaurant.acceptingOrders ? (
            <span className="badge bg-red-100 text-red-800 border border-red-300">Closed</span>
          ) : !isAvailable ? (
            <span className="badge badge-danger">Not Available</span>
          ) : (
            <button
              onClick={handleAddToCart}
              className="btn-primary flex items-center space-x-1 px-4 py-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Item Image */}
      {item.image && (
        <div className="ml-4">
          <img
            src={item.image}
            alt={item.name}
            className="w-24 h-24 object-cover rounded-lg"
          />
        </div>
      )}
    </div>
  );
};

export default MenuCard;