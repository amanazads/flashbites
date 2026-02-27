import React, { useState, useEffect, useMemo } from 'react';
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
import { FiArrowLeft } from 'react-icons/fi';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
const LS_KEYS = {
  cards: 'payment_methods_manual_cards',
  upi: 'payment_methods_manual_upi',
  option: 'payment_methods_selected_option',
};

const loadStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

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
  const [savedCards, setSavedCards] = useState([]);
  const [savedUpiIds, setSavedUpiIds] = useState([]);
  const [savedOption, setSavedOption] = useState('opt_cod');

  useEffect(() => {
    if (items.length === 0) {
      navigate('/restaurants');
      return;
    }

    fetchAddresses();
  }, [items, navigate]);

  useEffect(() => {
    const cards = loadStored(LS_KEYS.cards, []);
    const upis = loadStored(LS_KEYS.upi, []);
    const option = loadStored(LS_KEYS.option, 'opt_cod');

    setSavedCards(Array.isArray(cards) ? cards : []);
    setSavedUpiIds(Array.isArray(upis) ? upis : []);
    setSavedOption(typeof option === 'string' ? option : 'opt_cod');

    if ((upis || []).length > 0) {
      setPaymentMethod('upi');
      return;
    }
    if ((cards || []).length > 0) {
      setPaymentMethod('card');
      return;
    }
    if (option === 'opt_cod') {
      setPaymentMethod('cod');
      return;
    }
    setPaymentMethod('card');
  }, []);

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

  const paymentOptions = useMemo(() => {
    const options = [];

    savedCards.forEach((card) => {
      options.push({
        id: `card-${card.id || card.title}`,
        value: 'card',
        label: card.title || 'Saved Card',
        icon: '💳',
      });
    });

    savedUpiIds.forEach((upi) => {
      options.push({
        id: `upi-${upi.id || upi.handle}`,
        value: 'upi',
        label: upi.handle || 'UPI ID',
        icon: '📱',
      });
    });

    if (savedOption === 'opt_cod') {
      options.push({ id: 'opt-cod', value: 'cod', label: 'Cash on Delivery', icon: '💵' });
    }
    if (savedOption === 'opt_netbanking') {
      options.push({ id: 'opt-netbanking', value: 'card', label: 'Net Banking', icon: '🏦' });
    }
    if (savedOption === 'opt_paylater') {
      options.push({ id: 'opt-paylater', value: 'card', label: 'Pay Later', icon: '⏱️' });
    }

    if (options.length === 0) {
      return [
        { id: 'default-card', value: 'card', label: 'Apple Pay', icon: '' },
        { id: 'default-cod', value: 'cod', label: 'Cash on Delivery', icon: '💵' },
      ];
    }

    return options;
  }, [savedCards, savedUpiIds, savedOption]);

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
                  navigate(`/orders/${orderId}/status`);
                } catch (error) {
                  console.error('❌ Payment verification failed:', error);
                  console.error('Error details:', error.response?.data || error.message);
                  
                  toast.dismiss();
                  toast.success('Payment completed! Waiting for restaurant confirmation');
                  navigate(`/orders/${orderId}/status`);
                }
              },
              modal: {
                ondismiss: function() {
                  toast.dismiss();
                  toast.error('Payment cancelled. Order created but not paid.');
                  navigate(`/orders/${orderId}/status`);
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
            
            navigate(`/orders/${orderId}/status`);
          }
        } else if (paymentMethod === 'cod') {
          // Cash on delivery - no payment needed
          toast.success('Order placed successfully! Pay on delivery');
          navigate(`/orders/${orderId}/status`);
        } else {
          // Default fallback
          toast.success('Order placed successfully!');
          navigate(`/orders/${orderId}/status`);
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
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#f3f4f6] pb-8">
        <header className="sticky top-0 z-10 bg-[#f3f4f6] border-b border-slate-200 px-5 py-5">
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => navigate(-1)}
              className="absolute left-0 w-9 h-9 rounded-full bg-[#e8edf2] flex items-center justify-center text-slate-700 transition-colors active:bg-slate-200"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[21px] font-semibold text-slate-900">Checkout</h1>
          </div>
        </header>

        <main className="px-5 pt-5 space-y-5">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Delivery Address</h2>
              <button
                onClick={() => setShowAddAddressModal(true)}
                className="text-[13px] font-semibold text-orange-500"
              >
                Change
              </button>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              {addresses.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500 mb-3">No saved addresses</p>
                  <button
                    onClick={() => setShowAddAddressModal(true)}
                    className="h-10 px-5 rounded-full bg-orange-500 text-white text-sm font-semibold"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map((address) => (
                    <label
                      key={address._id}
                      className={`block rounded-2xl border px-3 py-3 cursor-pointer transition ${
                        selectedAddress === address._id ? 'border-orange-300 bg-orange-50/40' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="address"
                          value={address._id}
                          checked={selectedAddress === address._id}
                          onChange={() => setSelectedAddress(address._id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[16px] font-semibold text-slate-900 capitalize">{address.type}</p>
                          <p className="text-[13px] text-slate-500 leading-5">
                            {address.street}, {address.city}, {address.state} {address.zipCode}
                          </p>
                          {selectedAddress === address._id && (
                            <p className="mt-1 text-[12px] text-slate-400">Est. Delivery: 25 - 35 mins</p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2">Order Summary</h2>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item._id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[13px] text-slate-500">Quantity: {item.quantity}</p>
                    </div>
                    <p className="text-[16px] font-semibold text-slate-800 shrink-0">
                      {formatCurrency((Number(item.price) || 0) * (item.quantity || 1))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2">Payment Method</h2>
            <div className="space-y-2.5">
              {paymentOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center justify-between rounded-2xl border-2 px-4 h-14 cursor-pointer transition ${
                    paymentMethod === option.value
                      ? 'border-orange-400 bg-white'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[16px]">{option.icon}</span>
                    <span className="text-[16px] font-semibold text-slate-800">{option.label}</span>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    value={option.value}
                    checked={paymentMethod === option.value}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-4 w-4 accent-orange-500"
                  />
                </label>
              ))}
            </div>
          </section>

          {appliedCoupon ? (
            <section className="rounded-2xl bg-green-50 border border-green-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-green-700">{appliedCoupon.code} applied</p>
                  <p className="text-[12px] text-green-700">Saved {formatCurrency(appliedCoupon.discount || 0)}</p>
                </div>
                <button onClick={handleRemoveCoupon} className="text-[12px] font-semibold text-red-500">Remove</button>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-[14px] text-slate-700"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="h-10 px-4 rounded-xl bg-orange-500 text-white text-[13px] font-semibold disabled:opacity-60"
                >
                  {couponLoading ? 'Applying' : 'Apply'}
                </button>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="space-y-2 text-[14px]">
              <div className="flex items-center justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Delivery Fee</span>
                <span className={deliveryFee === 0 ? 'text-emerald-600 font-semibold' : ''}>
                  {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Taxes & Charges</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-green-600">
                  <span>Coupon Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Total Amount</span>
              <span className="text-[32px] font-bold text-slate-900">{formatCurrency(total)}</span>
            </div>
          </section>

          {subtotal < MINIMUM_ORDER_VALUE && (
            <section className="rounded-2xl bg-red-50 border border-red-200 p-3">
              <p className="text-[13px] font-medium text-red-700">
                Minimum order value is {formatCurrency(MINIMUM_ORDER_VALUE)}.
              </p>
              <p className="text-[12px] text-red-600 mt-1">
                Add {formatCurrency(MINIMUM_ORDER_VALUE - subtotal)} more to place order.
              </p>
            </section>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={loading || !selectedAddress || subtotal < MINIMUM_ORDER_VALUE}
            className="w-full h-14 rounded-full bg-orange-500 text-white text-[18px] font-semibold shadow-[0_10px_20px_rgba(249,115,22,0.28)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>

        </main>
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
