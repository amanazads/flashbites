import React from 'react';
import { useDispatch } from 'react-redux';
import { PlusIcon } from '@heroicons/react/24/solid';
import { addToCart } from '../../redux/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const MenuCard = ({ item, restaurant }) => {
  const dispatch = useDispatch();

  const handleAddToCart = () => {
    dispatch(addToCart({ item, restaurant }));
    toast.success('Added to cart!');
  };

  return (
    <div className="card p-4 flex flex-col sm:flex-row">
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

        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
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

        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-primary-600">
            {formatCurrency(item.price)}
          </span>

          {!restaurant.acceptingOrders ? (
            <span className="badge bg-red-100 text-red-800 border border-red-300">Closed</span>
          ) : !item.isAvailable ? (
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
        <div className="mt-3 sm:mt-0 sm:ml-4 self-end sm:self-auto">
          <img
            src={item.image}
            alt={item.name}
            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg"
          />
        </div>
      )}
    </div>
  );
};

export default MenuCard;