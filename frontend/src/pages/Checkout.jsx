import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { createOrder } from '../redux/slices/orderSlice';
import { clearCart } from '../redux/slices/cartSlice';
import { getAddresses } from '../api/userApi';
import { formatCurrency } from '../utils/formatters';
import { calculateCartTotal } from '../utils/helpers';
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
  const discount = appliedCoupon?.discount || 0;
  const tax = (subtotal - discount) * 0.05;
  const total = subtotal + tax - discount;

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
          menuItemId: item.originalId || item._id,
          quantity: item.quantity,
          variantName: item.selectedVariant ? item.selectedVariant.name : undefined
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
    <div className="min-h-screen pb-10" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-4xl mx-auto container-px pt-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900" style={{ letterSpacing: '-0.02em' }}>Checkout</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Delivery Address</h2>
                <button
                  onClick={() => setShowAddAddressModal(true)}
                  className="text-sm font-semibold flex items-center gap-1"
                  style={{ color: '#E23744' }}
                >
                  + Add New
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4 text-sm">No saved addresses</p>
                  <button onClick={() => setShowAddAddressModal(true)} className="btn-primary text-sm px-5 py-2.5">
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {addresses.map((address) => (
                    <label
                      key={address._id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${
                        selectedAddress === address._id
                          ? 'border-2 bg-red-50'
                          : 'border border-gray-200 hover:border-gray-300'
                      }`}
                      style={selectedAddress === address._id ? { borderColor: '#E23744' } : {}}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address._id}
                        checked={selectedAddress === address._id}
                        onChange={() => setSelectedAddress(address._id)}
                        className="mt-1 flex-shrink-0"
                        style={{ accentColor: '#E23744' }}
                      />
                      <div>
                        <span className="font-semibold capitalize text-sm text-gray-900">{address.type}</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {address.street}, {address.city}, {address.state} - {address.zipCode}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Apply Coupon */}
            <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">Have a coupon?</h2>
              {appliedCoupon ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-700 font-bold">{appliedCoupon.code}</span>
                        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">APPLIED</span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">{appliedCoupon.description}</p>
                      <p className="text-xs font-bold text-green-700 mt-1">You saved {formatCurrency(appliedCoupon.discount)}</p>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-red-500 text-sm font-semibold">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 border border-transparent focus:outline-none focus:border-red-400 text-sm font-medium transition"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">Payment Method</h2>
              <div className="space-y-2.5">
                {[
                  { value: 'card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, Amex & more', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
                  { value: 'upi', label: 'UPI', sub: 'PhonePe, Google Pay, Paytm & more', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" strokeWidth="3"/></svg> },
                  { value: 'cod', label: 'Cash on Delivery', sub: 'Pay with cash when your order arrives', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg> },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === opt.value ? 'border-2 bg-red-50' : 'border border-gray-200'
                    }`}
                    style={paymentMethod === opt.value ? { borderColor: '#E23744' } : {}}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="flex-shrink-0"
                      style={{ accentColor: '#E23744' }}
                    />
                    <span className="flex-shrink-0" style={{ color: paymentMethod === opt.value ? '#E23744' : '#6B7280' }}>
                      {opt.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-gray-900">{opt.label}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5 sticky top-20 md:top-24">
              <h2 className="text-base font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-2.5 mb-4">
                {items.map((item) => (
                  <div key={item._id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                    <span className="font-medium">{formatCurrency((Number(item.price) || 0) * (item.quantity || 1))}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-3 space-y-2 text-sm mb-4" style={{ background: 'var(--bg-input)' }}>
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Tax (5%)</span>
                  <span className="font-medium text-gray-700">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span style={{ color: '#E23744' }}>{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress}
                className="w-full btn-primary py-3.5 text-[15px] font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
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