import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { toggleCart } from '../../redux/slices/uiSlice';
import { updateQuantity, clearCart, removeFromCart } from '../../redux/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import { calculateCartTotal } from '../../utils/helpers';
import Swal from 'sweetalert2';

const BRAND = '#E23744';

const CartDrawer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cartOpen } = useSelector((state) => state.ui);
  const { items, restaurant } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const subtotal = calculateCartTotal(items);
  const deliveryFee = restaurant?.deliveryFee || 0;
  const tax = subtotal * 0.05;
  const total = subtotal + deliveryFee + tax;
  const totalItems = items.reduce((count, item) => count + (item.quantity || 0), 0);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
      dispatch(toggleCart());
      return;
    }
    navigate('/checkout');
    dispatch(toggleCart());
  };

  if (!cartOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={() => dispatch(toggleCart())}
      />

      <div className="fixed inset-0 z-50 sm:left-auto sm:w-[420px] bg-white shadow-2xl flex flex-col animate-slide-up sm:animate-slide-right">
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-4 bg-white sticky top-0 z-10"
          style={{ borderBottom: '1px solid #F0F2F5' }}
        >
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-gray-900 truncate">Your Cart</h2>
            {restaurant && (
              <p className="text-xs text-gray-400 truncate mt-0.5">from {restaurant.name}</p>
            )}
          </div>
          <button
            onClick={() => dispatch(toggleCart())}
            className="p-2 -mr-1 bg-gray-100 hover:bg-gray-200 rounded-full flex-shrink-0 transition-colors"
            aria-label="Close cart"
          >
            <XMarkIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 rounded-full mb-5 flex items-center justify-center" style={{ background: '#FEF2F3' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#E23744" strokeWidth="1.5" className="w-9 h-9">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-900 text-[16px] mb-1">Your cart is empty</p>
              <p className="text-gray-400 text-sm mb-4">Add items from a restaurant to get started</p>
              <button
                onClick={() => dispatch(toggleCart())}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                style={{ background: '#FEF2F3', color: BRAND }}
              >
                Browse Restaurants
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="flex gap-3 p-3 rounded-2xl hover:bg-gray-50/80 transition-colors"
                  style={{ border: '1px solid #F0F2F5' }}
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-[64px] h-[64px] object-cover rounded-xl flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-[13px] leading-tight line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(Number(item.price) || 0)} each</p>
                    <p className="text-[13px] font-bold mt-0.5" style={{ color: BRAND }}>
                      {formatCurrency((Number(item.price) || 0) * (item.quantity || 1))}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => dispatch(updateQuantity({ itemId: item._id, quantity: item.quantity - 1 }))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ border: `1.5px solid ${BRAND}`, color: BRAND }}
                        aria-label="Decrease quantity"
                      >
                        <MinusIcon className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center font-bold text-sm tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => dispatch(updateQuantity({ itemId: item._id, quantity: item.quantity + 1 }))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: BRAND, color: 'white' }}
                        aria-label="Increase quantity"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => dispatch(removeFromCart(item._id))}
                        className="ml-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove item"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="border-t p-4 space-y-3 bg-white"
            style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid #F0F2F5' }}
          >
            <div className="space-y-1.5 text-sm rounded-2xl p-3" style={{ background: 'var(--bg-input)' }}>
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
              <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span style={{ color: BRAND }}>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={async () => {
                const result = await Swal.fire({
                  title: 'Clear your cart?',
                  text: 'All items will be removed.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#E23744',
                  cancelButtonColor: '#9CA3AF',
                  confirmButtonText: 'Yes, clear it',
                });
                if (result.isConfirmed) dispatch(clearCart());
              }}
              className="w-full text-xs font-semibold text-red-500"
            >
              Clear Cart
            </button>

            <button
              onClick={handleCheckout}
              className="w-full py-3.5 text-[15px] font-bold text-white rounded-xl transition-all"
              style={{
                background: 'linear-gradient(135deg, #E23744 0%, #C92535 100%)',
                boxShadow: '0 4px 14px rgba(226,55,68,0.35)',
              }}
            >
              Proceed to Checkout · {formatCurrency(total)}
            </button>

            <button
              onClick={() => dispatch(toggleCart())}
              className="w-full py-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
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