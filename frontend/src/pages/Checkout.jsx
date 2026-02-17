import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { createOrder } from '../redux/slices/orderSlice';
import { clearCart } from '../redux/slices/cartSlice';
import { getAddresses } from '../api/userApi';
import { formatCurrency } from '../utils/formatters';
import { calculateCartTotal } from '../utils/helpers';
import { MINIMUM_ORDER_VALUE, calculateDeliveryCharge } from '../utils/constants';
import { calculateDistance } from '../utils/helpers';
import { createRazorpayOrder, verifyPayment } from '../api/paymentApi';
import { updateOrderStatus } from '../api/orderApi';
import { validateCoupon } from '../api/couponApi';
import AddAddressModal from '../components/common/AddAddressModal';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, restaurant } = useSelector((state) => state.cart);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState(0);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/restaurants');
      return;
    }

    fetchAddresses();
  }, [items, navigate]);

  const fetchAddresses = async () => {
    try {
      const response = await getAddresses();
      setAddresses(response.data.addresses);
      
      const defaultAddr = response.data.addresses.find(addr => addr.isDefault);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr._id);
      }
    } catch (error) {
      toast.error('Failed to load addresses');
    }
  };

  const handleAddressAdded = (newAddress) => {
    setAddresses([...addresses, newAddress]);
    setSelectedAddress(newAddress._id);
    setShowAddAddressModal(false);
    toast.success('Address added successfully!');
  };

  // Calculate distance when address or restaurant changes
  useEffect(() => {
    if (selectedAddress && restaurant?.location?.coordinates) {
      const address = addresses.find(addr => addr._id === selectedAddress);
      if (address && address.location?.coordinates) {
        const [restLng, restLat] = restaurant.location.coordinates;
        const [addrLng, addrLat] = address.location.coordinates;
        const distance = calculateDistance(restLat, restLng, addrLat, addrLng);
        setDeliveryDistance(parseFloat(distance));
      }
    }
  }, [selectedAddress, restaurant, addresses]);

  const subtotal = calculateCartTotal(items);
  const deliveryFee = deliveryDistance > 0 ? calculateDeliveryCharge(deliveryDistance) : 30; // Default ₹30
  const discount = appliedCoupon?.discount || 0;
  const tax = (subtotal - discount) * 0.05;
  const total = subtotal + deliveryFee + tax - discount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    try {
      const response = await validateCoupon(couponCode, subtotal);
      if (response.success) {
        setAppliedCoupon(response.data.coupon);
        toast.success(response.message || 'Coupon applied successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('Coupon removed');
  };

  const handlePlaceOrder = async () => {
    if (subtotal < MINIMUM_ORDER_VALUE) {
      toast.error(`Minimum order value is ${formatCurrency(MINIMUM_ORDER_VALUE)}`);
      return;
    }

    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (loading) {
      return; // Prevent multiple submissions
    }

    setLoading(true);

    try {
      const orderData = {
        restaurantId: restaurant._id,
        addressId: selectedAddress,
        items: items.map(item => ({
          menuItemId: item._id,
          quantity: item.quantity
        })),
        paymentMethod: paymentMethod || 'cod',
        couponCode: appliedCoupon?.code || null
      };

      const result = await dispatch(createOrder(orderData));
      
      if (createOrder.fulfilled.match(result)) {
        const orderId = result.payload.order._id;
        const orderTotal = result.payload.order.total;
        
        // Clear cart first to prevent re-submission
        dispatch(clearCart());
        
        // Handle payment based on method
        if (paymentMethod === 'upi' || paymentMethod === 'card') {
          // Razorpay payment for both UPI and Card
          try {
            toast.loading('Initializing payment...');
            
            // Create Razorpay order
            const razorpayResponse = await createRazorpayOrder(orderId, orderTotal);
            
            if (!razorpayResponse.success) {
              throw new Error('Failed to initialize payment');
            }

            const options = {
              key: RAZORPAY_KEY_ID,
              amount: razorpayResponse.data.amount,
              currency: razorpayResponse.data.currency,
              name: 'FlashBites',
              description: `Order #${orderId.slice(-8)}`,
              order_id: razorpayResponse.data.orderId,
              prefill: {
                name: result.payload.order.user?.name || '',
                email: result.payload.order.user?.email || '',
                contact: result.payload.order.user?.phone || ''
              },
              theme: {
                color: '#FF6B6B'
              },
              method: {
                upi: paymentMethod === 'upi',
                card: paymentMethod === 'card',
                netbanking: false,
                wallet: false
              },
              handler: async function (response) {
                try {
                  // Payment successful - verify on backend
                  toast.dismiss();
                  toast.loading('Verifying payment...');
                  
                  const verifyResult = await verifyPayment({
                    paymentId: razorpayResponse.data.paymentId,
                    gateway: 'razorpay',
                    gatewayResponse: {
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_signature: response.razorpay_signature
                    }
                  });
                  
                  toast.dismiss();
                  toast.success('💳 Payment successful! Waiting for restaurant confirmation');
                  navigate(`/orders/${orderId}`);
                } catch (error) {
                  console.error('❌ Payment verification failed:', error);
                  console.error('Error details:', error.response?.data || error.message);
                  
                  toast.dismiss();
                  toast.success('Payment completed! Waiting for restaurant confirmation');
                  navigate(`/orders/${orderId}`);
                }
              },
              modal: {
                ondismiss: function() {
                  toast.dismiss();
                  toast.error('Payment cancelled. Order created but not paid.');
                  navigate(`/orders/${orderId}`);
                }
              },
              notes: {
                order_id: orderId,
                customer_id: result.payload.order.user?._id || ''
              }
            };

            toast.dismiss();
            const razorpay = new window.Razorpay(options);
            razorpay.open();
            
          } catch (error) {
            console.error('❌ Razorpay initialization error:', error);
            toast.dismiss();
            
            if (error.message?.includes('Failed to initialize')) {
              toast.error('Payment gateway error. Please try COD or contact support');
            } else {
              toast.error('Failed to initialize payment. Order created - you can pay later');
            }
            
            navigate(`/orders/${orderId}`);
          }
        } else if (paymentMethod === 'cod') {
          // Cash on delivery - no payment needed
          toast.success('Order placed successfully! Pay on delivery');
          navigate(`/orders/${orderId}`);
        } else {
          // Default fallback
          toast.success('Order placed successfully!');
          navigate(`/orders/${orderId}`);
        }
      } else if (createOrder.rejected.match(result)) {
        console.error('Order rejected:', result.payload);
        toast.error(result.payload || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold">Delivery Address</h2>
                <button
                  onClick={() => setShowAddAddressModal(true)}
                  className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
                >
                  + Add New Address
                </button>
              </div>
              
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No saved addresses</p>
                  <button
                    onClick={() => setShowAddAddressModal(true)}
                    className="btn-primary"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address._id}
                      className={`block p-4 border rounded-lg cursor-pointer transition ${
                        selectedAddress === address._id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-300 hover:border-primary-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address._id}
                        checked={selectedAddress === address._id}
                        onChange={() => setSelectedAddress(address._id)}
                        className="mr-3"
                      />
                      <span className="font-semibold capitalize">{address.type}</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {address.street}, {address.city}, {address.state} - {address.zipCode}
                      </p>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Apply Coupon */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Apply Coupon</h2>
              
              {appliedCoupon ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-bold text-lg">{appliedCoupon.code}</span>
                        <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded">Applied</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">{appliedCoupon.description}</p>
                      <p className="text-sm font-semibold text-green-800 mt-2">
                        You saved {formatCurrency(appliedCoupon.discount)}!
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-red-600 hover:text-red-700 font-semibold text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="btn-primary px-6 py-2.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {couponLoading ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Payment Method</h2>
              
              <div className="space-y-3">
                {/* Card Payment */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition ${
                  paymentMethod === 'card'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-300'
                }`}>
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">💳</span>
                        <span className="font-semibold">Credit/Debit Card</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-8">
                        Visa, Mastercard, Amex, and more
                      </p>
                    </div>
                  </div>
                </label>

                {/* UPI Payment */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition ${
                  paymentMethod === 'upi'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-300'
                }`}>
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="payment"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">📱</span>
                        <span className="font-semibold">UPI</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-8">
                        PhonePe, Google Pay, Paytm & more
                      </p>
                    </div>
                  </div>
                </label>

                {/* Cash on Delivery */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition ${
                  paymentMethod === 'cod'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-300'
                }`}>
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">💵</span>
                        <span className="font-semibold">Cash on Delivery</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-8">
                        Pay with cash when your order arrives
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Payment Method Info */}
              {paymentMethod === 'card' && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    ℹ️ You'll be redirected to secure payment gateway to complete your payment
                  </p>
                </div>
              )}
              {paymentMethod === 'upi' && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800">
                    ℹ️ You'll receive a UPI payment request to complete your order
                  </p>
                </div>
              )}
              {paymentMethod === 'cod' && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    ℹ️ Please keep exact change handy for smooth delivery
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 sticky top-20 md:top-24">
              <h2 className="text-lg sm:text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item._id} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span>Delivery Fee</span>
                    {deliveryDistance > 0 && (
                      <span className="text-xs text-gray-500 ml-1">({deliveryDistance.toFixed(1)} km)</span>
                    )}
                  </div>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (5%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Minimum Order Warning */}
              {subtotal < MINIMUM_ORDER_VALUE && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠️ Minimum order value is {formatCurrency(MINIMUM_ORDER_VALUE)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Add {formatCurrency(MINIMUM_ORDER_VALUE - subtotal)} more to place order
                  </p>
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress || subtotal < MINIMUM_ORDER_VALUE}
                className="w-full btn-primary py-3 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : subtotal < MINIMUM_ORDER_VALUE ? `Minimum Order ${formatCurrency(MINIMUM_ORDER_VALUE)}` : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      <AddAddressModal
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        onAddressAdded={handleAddressAdded}
      />
    </div>
  );
};

export default Checkout;