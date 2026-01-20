import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toggleCart } from '../../redux/slices/uiSlice';
import { removeFromCart, updateQuantity, clearCart } from '../../redux/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import { calculateCartTotal } from '../../utils/helpers';

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
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => dispatch(toggleCart())}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white z-50 shadow-xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Your Cart</h2>
            {restaurant && (
              <p className="text-sm text-gray-600">{restaurant.name}</p>
            )}
          </div>
          <button
            onClick={() => dispatch(toggleCart())}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-600">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const itemId = item.cartId || item._id;
                const displayName = item.displayName || item.name;
                return (
                  <div key={itemId} className="flex items-start space-x-3 p-3 border rounded-lg">
                    {/* Item Image */}
                    {item.image && (
                      <img
                        src={item.image}
                        alt={displayName}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}

                    {/* Item Details */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{displayName}</h4>
                      <p className="text-sm text-gray-600">{formatCurrency(item.price)}</p>

                      {/* Quantity Controls */}
                      <div className="flex items-center mt-2 space-x-2">
                        <button
                          onClick={() => dispatch(updateQuantity({ itemId: itemId, quantity: item.quantity - 1 }))}
                          className="w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => dispatch(updateQuantity({ itemId: itemId, quantity: item.quantity + 1 }))}
                          className="w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => dispatch(removeFromCart(itemId))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}

              {/* Clear Cart Button */}
              <button
                onClick={() => dispatch(clearCart())}
                className="w-full text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>

        {/* Footer - Bill Summary */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (5%)</span>
                <span className="font-semibold">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full btn-primary py-3 text-lg"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;