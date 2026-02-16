import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toggleCart } from '../../redux/slices/uiSlice';
import { removeFromCart, updateQuantity, clearCart } from '../../redux/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import { calculateCartTotal } from '../../utils/helpers';

const CartDrawer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState(new Set());
  const { cartOpen } = useSelector((state) => state.ui);
  const { items, restaurant } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const subtotal = calculateCartTotal(items);
  const deliveryFee = restaurant?.deliveryFee || 0;
  const tax = subtotal * 0.05;
  const total = subtotal + deliveryFee + tax;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
      dispatch(toggleCart());
      return;
    }
    navigate('/checkout');
    dispatch(toggleCart());
  };

  const toggleItemExpand = (itemId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (!cartOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={() => dispatch(toggleCart())}
      />

      {/* Drawer – full-screen on mobile, right-side panel on sm+ */}
      <div className="fixed inset-0 z-50 sm:left-auto sm:w-[420px] bg-white shadow-2xl flex flex-col animate-slide-up sm:animate-slide-right">
        {/* Header – always visible on all sizes */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-white sticky top-0 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">Your Cart</h2>
            {restaurant && (
              <p className="text-xs text-gray-500 truncate">from {restaurant.name}</p>
            )}
          </div>
          <button
            onClick={() => dispatch(toggleCart())}
            className="p-2 -mr-1 hover:bg-gray-100 rounded-full flex-shrink-0 touch-feedback"
            aria-label="Close cart"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Cart Items – Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500 text-sm">Your cart is empty</p>
              <button
                onClick={() => dispatch(toggleCart())}
                className="mt-4 text-primary-600 font-medium text-sm touch-feedback"
              >
                Browse Restaurants →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div 
                  key={item._id} 
                  className="flex gap-3 p-3 border rounded-xl bg-white hover:bg-gray-50/60 transition-colors"
                >
                  {/* Item Image */}
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-[72px] h-[72px] object-cover rounded-lg flex-shrink-0"
                    />
                  )}

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatCurrency(item.price)} each
                    </p>
                    <p className="text-xs text-primary-600 font-semibold mt-0.5">
                      {formatCurrency(item.price * item.quantity)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => dispatch(updateQuantity({ 
                          itemId: item._id, 
                          quantity: item.quantity - 1 
                        }))}
                        className="w-8 h-8 border-2 border-primary-600 text-primary-600 rounded-lg flex items-center justify-center touch-feedback"
                        aria-label="Decrease quantity"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => dispatch(updateQuantity({ 
                          itemId: item._id, 
                          quantity: item.quantity + 1 
                        }))}
                        className="w-8 h-8 border-2 border-primary-600 text-primary-600 rounded-lg flex items-center justify-center touch-feedback"
                        aria-label="Increase quantity"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => dispatch(removeFromCart(item._id))}
                        className="ml-auto p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg touch-feedback"
                        aria-label="Remove item"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Clear Cart Button */}
              <button
                onClick={() => {
                  if (window.confirm('Clear entire cart?')) {
                    dispatch(clearCart());
                  }
                }}
                className="w-full mt-4 py-2 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>

        {/* Footer – Bill Summary */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3 bg-white" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
            {/* Price Breakdown */}
            <div className="space-y-1.5 text-sm bg-gray-50 rounded-xl p-3">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                <span className="font-medium text-gray-700">{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax (5%)</span>
                <span className="font-medium text-gray-700">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              className="w-full btn-primary py-3.5 text-base font-semibold rounded-xl touch-feedback"
            >
              Proceed to Checkout
            </button>

            {/* Continue Shopping */}
            <button
              onClick={() => dispatch(toggleCart())}
              className="w-full py-2 text-primary-600 text-sm font-medium touch-feedback"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;