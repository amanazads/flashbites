import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { addToCart, updateQuantity } from '../../redux/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const BRAND = '#FF523B';

const MenuCard = ({ item, restaurant, disabled = false }) => {
  const dispatch = useDispatch();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  
  const hasVariants = item.variants && item.variants.length > 0;
  const activeVariant = hasVariants ? item.variants[selectedVariantIndex] : null;
  const currentItemId = hasVariants ? `${item._id}-${activeVariant.name}` : item._id;
  const displayPrice = hasVariants ? activeVariant.price : item.price;
  
  const cartItems = useSelector(state => state.cart.items);
  const cartItem = cartItems.find(i => i._id === currentItemId);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = () => {
    if (disabled) {
      toast.error('Restaurant is currently closed');
      return;
    }
    
    const itemToAdd = hasVariants ? {
      ...item,
      _id: currentItemId,
      originalId: item._id,
      name: `${item.name} (${activeVariant.name})`,
      price: activeVariant.price,
      selectedVariant: activeVariant
    } : item;
    
    dispatch(addToCart({ item: itemToAdd, restaurant }));
    toast.success('Added to cart!');
  };

  const handleIncrement = () => {
    dispatch(updateQuantity({ itemId: currentItemId, quantity: quantity + 1 }));
  };

  const handleDecrement = () => {
    dispatch(updateQuantity({ itemId: currentItemId, quantity: quantity - 1 }));
  };

  const ActionButton = () => {
    if (!restaurant.acceptingOrders) {
      return <span className="bg-gray-100 text-gray-500 font-bold text-xs px-3 py-1.5 rounded shadow-sm border border-gray-200">Closed</span>;
    }
    if (!item.isAvailable) {
      return <span className="bg-gray-100 text-gray-500 font-bold text-xs px-3 py-1.5 rounded shadow-sm border border-gray-200 whitespace-nowrap">Not Available</span>;
    }
    if (quantity > 0) {
      return (
        <div className="flex items-center justify-between w-[96px] bg-white rounded-lg px-2 py-1.5 shadow-md border" style={{ borderColor: BRAND }}>
          <button 
            onClick={handleDecrement}
            className="w-6 h-6 flex flex-shrink-0 items-center justify-center font-bold text-[18px] pb-0.5"
            style={{ color: BRAND }}
          >
            -
          </button>
          <span className="font-bold text-[14px]" style={{ color: BRAND }}>{quantity}</span>
          <button 
            onClick={handleIncrement}
            className="w-6 h-6 flex flex-shrink-0 items-center justify-center font-bold text-[18px] pb-0.5"
            style={{ color: BRAND }}
          >
            +
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={handleAddToCart}
        className="text-[14px] font-bold px-6 py-1.5 rounded-lg shadow-md transition-all duration-200 border whitespace-nowrap bg-white"
        style={{ color: BRAND, borderColor: '#F0F0F0' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFF0ED'; e.currentTarget.style.borderColor = BRAND; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#F0F0F0'; }}
      >
        ADD
      </button>
    );
  };

  return (
    <div className="bg-white p-4 pb-6 flex flex-row items-start justify-between gap-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
      
      {/* Left side: Item Info */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="mb-2">
          {item.isVeg ? (
            <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center rounded-sm">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
            </div>
          ) : (
            <div className="w-4 h-4 border-2 border-red-600 flex items-center justify-center rounded-sm">
              <div className="w-2 h-2 rounded-full bg-red-600"></div>
            </div>
          )}
        </div>

        <h3 className="text-[16px] sm:text-[18px] font-bold text-gray-900 mb-1 leading-snug">{item.name}</h3>
        <p className="text-[15px] font-semibold text-gray-800 mb-2">
          {formatCurrency(Number(displayPrice) || 0)}
        </p>

        {item.description && (
          <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-2 md:line-clamp-3 mb-3">
            {item.description}
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.tags.map((tag, index) => (
              <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-medium rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Variants Selector */}
        {hasVariants && (
          <div className="mb-2">
            <select
              value={selectedVariantIndex}
              onChange={(e) => setSelectedVariantIndex(Number(e.target.value))}
              className="w-full sm:max-w-xs px-3 py-2 text-sm border-gray-200 border rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-gray-700 font-medium bg-white"
            >
              {item.variants.map((variant, idx) => (
                <option key={idx} value={idx}>
                  {variant.name} - {formatCurrency(variant.price)}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* If no image, show Add To Cart button right below the variants/description */}
        {!item.image && (
          <div className="mt-4 inline-block">
            <ActionButton />
          </div>
        )}
      </div>

      {/* Right side: Image and Add Button (absolute positioning overlap style like Zomato/Swiggy) */}
      {item.image && (
        <div className="relative flex-shrink-0 mb-4 ml-2">
          <div className="w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex items-center justify-center w-full z-10">
            <ActionButton />
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCard;