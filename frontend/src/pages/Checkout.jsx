import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { createOrder } from '../redux/slices/orderSlice';
import { clearCart, updateQuantity, removeFromCart } from '../redux/slices/cartSlice';
import { setSelectedDeliveryAddress } from '../redux/slices/uiSlice';
import { getAddresses } from '../api/userApi';
import { formatCurrency } from '../utils/formatters';
import { calculateCartTotal } from '../utils/helpers';
import { calculateDistance } from '../utils/helpers';
import { validateCoupon, getAvailableCoupons } from '../api/couponApi';
import { getPlatformSettings } from '../api/settingsApi';
import AddAddressModal from '../components/common/AddAddressModal';
import toast from 'react-hot-toast';
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const mapSavedAddressToSelection = (addr) => {
  if (!addr) return null;

  const lng = Number(addr?.lng ?? addr?.coordinates?.[0]);
  const lat = Number(addr?.lat ?? addr?.coordinates?.[1]);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  if (!hasCoords) return null;

  const typeLabel = addr.type === 'home' ? 'Home' : addr.type === 'work' ? 'Work' : 'Other';
  return {
    id: addr._id,
    type: addr.type || 'other',
    typeLabel,
    city: addr.city || '',
    fullAddress: addr.fullAddress || [addr.street, addr.landmark, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '),
    latitude: lat,
    longitude: lng,
  };
};

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, restaurant } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const selectedDeliveryAddress = useSelector((state) => state.ui.selectedDeliveryAddress);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [platformSettings, setPlatformSettings] = useState(null);

  useEffect(() => {
    fetchAddresses();
    fetchPlatformSettings();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await getAddresses();
      const fetchedAddresses = response?.data?.addresses || response?.addresses || [];
      setAddresses(fetchedAddresses);

      const preselectedFromGlobal = selectedDeliveryAddress?.id
        ? fetchedAddresses.find((addr) => addr._id === selectedDeliveryAddress.id)
        : null;

      if (preselectedFromGlobal) {
        setSelectedAddress(preselectedFromGlobal._id);
        return;
      }

      const defaultAddr = fetchedAddresses.find(addr => addr.isDefault);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr._id);
        const mapped = mapSavedAddressToSelection(defaultAddr);
        if (mapped) {
          dispatch(setSelectedDeliveryAddress(mapped));
        }
      }
    } catch (error) {
      toast.error('Failed to load addresses');
    }
  };

  const handleAddressAdded = (newAddress) => {
    setAddresses((prev) => [...prev, newAddress]);
    setSelectedAddress(newAddress._id);
    const mapped = mapSavedAddressToSelection(newAddress);
    if (mapped) {
      dispatch(setSelectedDeliveryAddress(mapped));
    }
    setShowAddAddressModal(false);
    toast.success('Address added successfully!');
  };

  useEffect(() => {
    if (!selectedAddress) return;

    const selectedAddressObj = addresses.find((addr) => addr._id === selectedAddress);
    const mapped = mapSavedAddressToSelection(selectedAddressObj);
    if (mapped) {
      dispatch(setSelectedDeliveryAddress(mapped));
    }
  }, [selectedAddress, addresses, dispatch]);

  const fetchAvailableCoupons = async (orderValue, restaurantId) => {
    if (!orderValue || !restaurantId) {
      setAvailableCoupons([]);
      return;
    }

    try {
      setAvailableLoading(true);
      const response = await getAvailableCoupons(orderValue, restaurantId);
      setAvailableCoupons(response?.data?.coupons || []);
    } catch {
      setAvailableCoupons([]);
    } finally {
      setAvailableLoading(false);
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const response = await getPlatformSettings();
      setPlatformSettings(response?.data?.settings || null);
    } catch {
      setPlatformSettings(null);
    }
  };

  const calculateDeliveryFee = (distance, rules) => {
    const tiers = Array.isArray(rules) && rules.length > 0
      ? rules
      : [
          { minDistance: 0, maxDistance: 5, charge: 0 },
          { minDistance: 5, maxDistance: 15, charge: 25 },
          { minDistance: 15, maxDistance: 9999, charge: 30 }
        ];

    const tier = tiers.find((t) => distance >= t.minDistance && distance < t.maxDistance);
    return tier ? tier.charge : 0;
  };

  const normalizeCommissionPercent = (rawPercent) => {
    const percent = Number(rawPercent);
    if (!Number.isFinite(percent)) return 25;
    if (percent < 0) return 0;
    if (percent > 90) return 90;
    return percent;
  };

  // Calculate distance when address or restaurant changes
  useEffect(() => {
    if (selectedAddress && restaurant?.location?.coordinates) {
      const address = addresses.find(addr => addr._id === selectedAddress);
      if (address && Array.isArray(address.coordinates) && address.coordinates.length >= 2) {
        const [restLng, restLat] = restaurant.location.coordinates;
        const [addrLng, addrLat] = address.coordinates;
        const distance = calculateDistance(restLat, restLng, addrLat, addrLng);
        setDeliveryDistance(parseFloat(distance));
      }
    }
  }, [selectedAddress, restaurant, addresses]);

  const listedSubtotal = calculateCartTotal(items);
  const commissionPercent = normalizeCommissionPercent(platformSettings?.commissionPercent);
  const subtotal = items.reduce((sum, item) => {
    const listedPrice = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    const sellingPrice = listedPrice * (1 + commissionPercent / 100);
    return sum + (sellingPrice * quantity);
  }, 0);
  const discount = appliedCoupon?.discount || 0;
  const platformFee = Number(platformSettings?.platformFee || 25);
  const taxRate = Number(platformSettings?.taxRate || 0.05);
  const configuredDeliveryFee = Number(platformSettings?.deliveryFee);
  const deliveryFee = Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee >= 0
    ? configuredDeliveryFee
    : (deliveryDistance > 0
        ? calculateDeliveryFee(deliveryDistance, platformSettings?.deliveryChargeRules)
        : 0);
  const tax = Math.max(subtotal - discount, 0) * taxRate;
  const total = subtotal + deliveryFee + platformFee + tax - discount;

  useEffect(() => {
    if (!restaurant?._id) return;
    fetchAvailableCoupons(subtotal, restaurant._id);
  }, [subtotal, restaurant?._id]);

  const handleApplyCoupon = async (forcedCode) => {
    const codeToApply = (forcedCode || couponCode).trim();
    if (!codeToApply) {
      toast.error('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    try {
      const response = await validateCoupon(codeToApply, subtotal, restaurant?._id);
      if (response.success) {
        setAppliedCoupon(response.data.coupon);
        setCouponCode(codeToApply.toUpperCase());
        toast.success(response.message || 'Coupon applied successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplySuggestedCoupon = async (code) => {
    await handleApplyCoupon(code);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('Coupon removed');
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    const selectedAddressObj = addresses.find((addr) => addr._id === selectedAddress);
    if (!selectedAddressObj) {
      toast.error('Selected address is unavailable. Please select an address again.');
      return;
    }

    const hasCoordinates = Array.isArray(selectedAddressObj.coordinates)
      && selectedAddressObj.coordinates.length >= 2
      && Number.isFinite(Number(selectedAddressObj.coordinates[0]))
      && Number.isFinite(Number(selectedAddressObj.coordinates[1]));

    if (!hasCoordinates) {
      toast.error('Please edit this address and select a valid location before placing the order.');
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
        const createdOrder = result.payload?.data?.order;
        if (!createdOrder?._id) {
          throw new Error('Order was created but response payload is missing order details');
        }

        const orderId = createdOrder._id;
        const orderTotal = createdOrder.total;
        
        // Clear cart first to prevent re-submission
        dispatch(clearCart());
        
        // Handle payment based on method
        if (paymentMethod === 'upi' || paymentMethod === 'card') {
          navigate(`/payment/${orderId}`, { state: { paymentMethod } });
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
        toast.error(result.payload || 'Unable to place your order right now. Please check your address and try again.');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.message || 'Unable to place your order right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden" style={{ background: 'var(--bg-app)' }}>
        <div className="max-w-4xl w-full mx-auto container-px pt-6 pb-20 text-center">
          <div className="bg-white rounded-2xl shadow-soft p-8">
            <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
            <p className="text-sm text-gray-500 mt-2">Add items to your cart to continue checkout.</p>
            <button
              onClick={() => navigate('/restaurants')}
              className="mt-6 btn-primary px-6 py-3 text-sm font-semibold rounded-xl"
            >
              Browse Restaurants
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-4xl w-full mx-auto container-px pt-6 pb-28 lg:pb-10 max-[400px]:max-w-none max-[400px]:w-full max-[400px]:px-4 max-[375px]:px-3 max-[320px]:px-2 max-[400px]:pt-4 max-[400px]:pb-20 max-[320px]:pt-3.5 max-[300px]:pt-3 max-[320px]:pb-18 max-[300px]:pb-16">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900 max-[400px]:text-xl max-[400px]:mb-4 max-[300px]:text-lg max-[300px]:mb-3" style={{ letterSpacing: '-0.02em' }}>Checkout</h1>

        <div className="grid md:grid-cols-3 gap-6 w-full max-[400px]:gap-4 max-[320px]:gap-3 max-[300px]:gap-3">
          {/* Left Column */}
          <div className="md:col-span-2 min-w-0 space-y-6 max-[300px]:space-y-4">
            {/* Restaurant Details */}
            {restaurant && (
              <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5 max-[400px]:p-3.5 max-[300px]:p-3 w-full max-w-full overflow-hidden">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 max-[300px]:text-sm">Restaurant Details</h2>
                    <p className="text-sm text-gray-700 mt-1 font-semibold max-[300px]:text-xs">{restaurant.name}</p>
                    {restaurant.cuisines?.length ? (
                      <p className="text-xs text-gray-500 mt-1 max-[300px]:text-[11px]">{restaurant.cuisines.join(', ')}</p>
                    ) : null}
                    {restaurant.address?.city && (
                      <p className="text-xs text-gray-500 mt-1 max-[300px]:text-[11px]">{restaurant.address.city}, {restaurant.address.state}</p>
                    )}
                  </div>
                  {restaurant.deliveryTime && (
                    <div className="text-xs font-semibold text-gray-600 max-[300px]:text-[11px]">{restaurant.deliveryTime}</div>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/restaurant/${restaurant._id}`)}
                  className="mt-3 text-sm font-semibold max-[300px]:text-xs"
                  style={{ color: '#E23744' }}
                >
                  + Add more items
                </button>
              </div>
            )}

            {/* Your Items */}
              <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5 max-[400px]:p-3.5 max-[300px]:p-3 w-full max-w-full overflow-hidden">
              <h2 className="text-base font-bold text-gray-900 mb-3 max-[320px]:text-sm max-[300px]:text-sm max-[320px]:mb-2">Your Items</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item._id} className="flex items-center justify-between gap-3 max-[320px]:flex-col max-[320px]:items-start min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate max-[320px]:text-xs">{item.name}</p>
                      <p className="text-xs text-gray-500 max-[320px]:text-[11px]">{formatCurrency(Number(item.price) || 0)} each</p>
                    </div>
                    <div className="flex items-center gap-2 max-[320px]:w-full max-[320px]:justify-between">
                      <button
                        onClick={() => dispatch(updateQuantity({ itemId: item._id, quantity: item.quantity - 1 }))}
                        className="w-7 h-7 max-[320px]:w-6 max-[320px]:h-6 rounded-lg flex items-center justify-center"
                        style={{ border: '1.5px solid #E23744', color: '#E23744' }}
                      >
                        <MinusIcon className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm max-[320px]:text-xs">{item.quantity}</span>
                      <button
                        onClick={() => dispatch(updateQuantity({ itemId: item._id, quantity: item.quantity + 1 }))}
                        className="w-7 h-7 max-[320px]:w-6 max-[320px]:h-6 rounded-lg flex items-center justify-center"
                        style={{ background: '#E23744', color: 'white' }}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => dispatch(removeFromCart(item._id))}
                        className="ml-1 p-1.5 max-[320px]:p-1 text-gray-400 hover:text-red-500"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
              <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5 max-[400px]:p-3.5 max-[320px]:p-3 w-full max-w-full overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 max-[320px]:text-sm">Delivery Address</h2>
                <button
                  onClick={() => setShowAddAddressModal(true)}
                  className="text-sm font-semibold flex items-center gap-1 max-[320px]:text-xs"
                  style={{ color: '#E23744' }}
                >
                  + Add New
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8 max-[320px]:py-6">
                  <p className="text-gray-500 mb-4 text-sm max-[320px]:text-xs">No saved addresses</p>
                  <button onClick={() => setShowAddAddressModal(true)} className="btn-primary text-sm max-[320px]:text-xs px-5 max-[320px]:px-4 py-2.5 max-[320px]:py-2">
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-[320px]:space-y-2">
                  {addresses.map((address) => (
                    <label
                      key={address._id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all max-[400px]:p-3 max-[320px]:p-2.5 w-full max-w-full ${
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
                        onChange={() => {
                          setSelectedAddress(address._id);
                        }}
                        className="mt-1 flex-shrink-0"
                        style={{ accentColor: '#E23744' }}
                      />
                      <div className="min-w-0">
                        <span className="font-semibold capitalize text-sm text-gray-900 max-[320px]:text-xs">{address.type}</span>
                        <p className="text-xs text-gray-500 mt-0.5 max-[320px]:text-[11px] break-words">
                          {address.street}, {address.city}, {address.state} - {address.zipCode}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Details */}
            <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5 max-[400px]:p-3.5 max-[320px]:p-3 w-full max-w-full overflow-hidden">
              <h2 className="text-base font-bold text-gray-900 mb-3 max-[320px]:text-sm">Customer Details</h2>
              <div className="text-sm text-gray-600 space-y-1 max-[320px]:text-xs">
                <p><span className="font-semibold text-gray-800">Name:</span> {user?.name || '—'}</p>
                <p><span className="font-semibold text-gray-800">Phone:</span> {user?.phone || '—'}</p>
                <p><span className="font-semibold text-gray-800">Email:</span> {user?.email || '—'}</p>
              </div>
            </div>

            {/* Apply Coupon */}
            <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5 max-[400px]:p-3.5 max-[320px]:p-3 w-full max-w-full overflow-hidden">
              <h2 className="text-base font-bold text-gray-900 mb-3 max-[320px]:text-sm">Have a coupon?</h2>
              {appliedCoupon ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-700 font-bold">{appliedCoupon.code}</span>
                        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">APPLIED</span>
                      </div>
                      <p className="text-xs text-green-600 mt-1 max-[320px]:text-[11px]">{appliedCoupon.description}</p>
                      <p className="text-xs font-bold text-green-700 mt-1 max-[320px]:text-[11px]">You saved {formatCurrency(appliedCoupon.discount)}</p>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-red-500 text-sm font-semibold max-[320px]:text-xs">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 max-[320px]:flex-col">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 px-4 py-2.5 max-[320px]:px-3 max-[320px]:py-2 rounded-xl bg-gray-100 border border-transparent focus:outline-none focus:border-red-400 text-sm max-[320px]:text-xs font-medium transition"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="btn-primary px-5 max-[320px]:px-4 py-2.5 max-[320px]:py-2 text-sm max-[320px]:text-xs disabled:opacity-50"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 max-[320px]:text-xs">Available Coupons</h3>
                  {availableLoading && <span className="text-xs text-gray-400 max-[320px]:text-[11px]">Loading…</span>}
                </div>
                {availableCoupons.length === 0 && !availableLoading ? (
                  <p className="text-xs text-gray-500 max-[320px]:text-[11px]">No coupons available for this restaurant.</p>
                ) : (
                  <div className="space-y-2 max-[320px]:space-y-1.5">
                    {availableCoupons.map((coupon) => (
                      <div key={coupon.code} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2 max-[320px]:px-2.5 max-[320px]:py-1.5 w-full max-w-full">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate max-[320px]:text-xs">{coupon.code}</p>
                          <p className="text-xs text-gray-500 truncate max-[320px]:text-[11px]">{coupon.description}</p>
                        </div>
                        <button
                          onClick={() => handleApplySuggestedCoupon(coupon.code)}
                          className="text-xs font-semibold px-3 py-1 max-[320px]:px-2.5 max-[320px]:py-0.5 rounded-lg"
                          style={{ color: '#E23744', background: '#FEF2F3' }}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5 max-[400px]:p-3.5 max-[320px]:p-3 w-full max-w-full overflow-hidden">
              <h2 className="text-base font-bold text-gray-900 mb-3 max-[320px]:text-sm">Payment Method</h2>
              <div className="space-y-2.5 max-[320px]:space-y-2">
                {[
                  { value: 'card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, Amex & more', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
                  { value: 'upi', label: 'UPI', sub: 'PhonePe, Google Pay, Paytm & more', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" strokeWidth="3"/></svg> },
                  { value: 'cod', label: 'Cash on Delivery', sub: 'Pay with cash when your order arrives', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg> },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all max-[400px]:p-3 max-[320px]:p-2.5 ${
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
                      <span className="font-semibold text-sm text-gray-900 max-[320px]:text-xs">{opt.label}</span>
                      <p className="text-xs text-gray-400 mt-0.5 max-[320px]:text-[11px]">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="min-w-0">
            <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-5 sticky top-20 md:top-24 max-[400px]:static max-[400px]:p-3.5 max-[320px]:p-3 w-full max-w-full overflow-hidden">
              <h2 className="text-base font-bold text-gray-900 mb-4 max-[320px]:text-sm max-[320px]:mb-3">Order Summary</h2>

              <div className="space-y-2.5 mb-4 max-[320px]:space-y-2 max-[320px]:mb-3">
                {items.map((item) => (
                  <div key={item._id} className="flex justify-between gap-3 text-sm min-w-0 max-[320px]:text-xs">
                    <span className="text-gray-700 min-w-0 truncate">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                    <span className="font-medium shrink-0">{formatCurrency(((Number(item.price) || 0) * (1 + commissionPercent / 100)) * (item.quantity || 1))}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-3 max-[320px]:p-2.5 space-y-2 text-sm max-[320px]:text-xs mb-4 max-[320px]:mb-3" style={{ background: 'var(--bg-input)' }}>
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal (with commission)</span>
                  <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
                </div>
                {Math.abs(subtotal - listedSubtotal) > 0.001 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Listed item total</span>
                    <span className="font-medium">{formatCurrency(listedSubtotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Delivery Fee</span>
                  <span className="font-medium text-gray-700">{formatCurrency(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Platform Fee</span>
                  <span className="font-medium text-gray-700">{formatCurrency(platformFee)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Tax ({Math.round((taxRate || 0) * 100)}%)</span>
                  <span className="font-medium text-gray-700">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-[15px] max-[320px]:text-[14px] font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span style={{ color: '#E23744' }}>{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress || items.length === 0}
                className="hidden md:block w-full btn-primary py-3.5 max-[320px]:py-3 text-[15px] max-[320px]:text-[14px] font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Total Payable</p>
            <p className="text-base font-bold text-gray-900">{formatCurrency(total)}</p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={loading || !selectedAddress || items.length === 0}
            className="btn-primary px-5 py-3 text-sm font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Placing...' : 'Place Order'}
          </button>
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