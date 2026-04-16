import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { XMarkIcon, TrashIcon, MinusIcon, PlusIcon, ArrowLeftIcon, MagnifyingGlassIcon, MapPinIcon, HomeIcon, ShoppingBagIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { toggleCart, closeCart } from '../../redux/slices/uiSlice';
import { removeFromCart, updateQuantity, clearCart } from '../../redux/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import { calculateCartTotal } from '../../utils/helpers';
import { BRAND } from '../../constants/theme';
import { getPlatformSettings } from '../../api/settingsApi';
import { validateCoupon } from '../../api/couponApi';
import logo from '../../assets/logo.png';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { getDeliveryAddressLabel } from '../../utils/deliveryAddress';

const CartDrawer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [platformSettings, setPlatformSettings] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const { cartOpen } = useSelector((state) => state.ui);
  const selectedDeliveryAddress = useSelector((state) => state.ui.selectedDeliveryAddress);
  const { items, restaurant } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const deliveryAddressLabel = getDeliveryAddressLabel(selectedDeliveryAddress);

  const isFeeEnabledNow = (control) => {
    if (control?.enabled === false) return false;
    if (!control?.effectiveFrom) return true;
    const effectiveFrom = new Date(control.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) return true;
    return effectiveFrom.getTime() <= Date.now();
  };

  const resolveEffectiveFeeControl = (globalControl, restaurantControl) => {
    if (restaurantControl?.useGlobal === false) {
      return {
        enabled: restaurantControl?.enabled !== false,
        effectiveFrom: restaurantControl?.effectiveFrom || null,
      };
    }

    return {
      enabled: globalControl?.enabled !== false,
      effectiveFrom: globalControl?.effectiveFrom || null,
    };
  };

  useEffect(() => {
    let isMounted = true;

    const fetchPlatformSettings = async () => {
      try {
        const response = await getPlatformSettings();
        if (isMounted) {
          setPlatformSettings(response?.data?.settings || null);
        }
      } catch {
        if (isMounted) {
          setPlatformSettings(null);
        }
      }
    };

    fetchPlatformSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const subtotal = calculateCartTotal(items);
  const globalFeeControls = platformSettings?.feeControls || {};
  const restaurantFeeControls = restaurant?.feeControls || {};

  const effectiveDeliveryControl = resolveEffectiveFeeControl(
    globalFeeControls.deliveryFee,
    restaurantFeeControls.deliveryFee
  );
  const effectivePlatformControl = resolveEffectiveFeeControl(
    globalFeeControls.platformFee,
    restaurantFeeControls.platformFee
  );
  const effectiveTaxControl = resolveEffectiveFeeControl(
    globalFeeControls.tax,
    restaurantFeeControls.tax
  );

  const isDeliveryFeeEnabled = isFeeEnabledNow(effectiveDeliveryControl);
  const isPlatformFeeEnabled = isFeeEnabledNow(effectivePlatformControl);
  const isTaxEnabled = isFeeEnabledNow(effectiveTaxControl);

  const configuredDeliveryFee = Number(platformSettings?.deliveryFee);
  const fallbackRestaurantDeliveryFee = Number(restaurant?.deliveryFee || 0);
  const baseDeliveryFee = Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee >= 0
    ? configuredDeliveryFee
    : (Number.isFinite(fallbackRestaurantDeliveryFee) ? fallbackRestaurantDeliveryFee : 0);
  const deliveryFee = isDeliveryFeeEnabled ? baseDeliveryFee : 0;

  const basePlatformFee = Number(platformSettings?.platformFee || 0);
  const platformFee = isPlatformFeeEnabled ? basePlatformFee : 0;

  const baseTaxRate = Number(platformSettings?.taxRate || 0.05);
  const taxRate = isTaxEnabled ? baseTaxRate : 0;
  const tax = subtotal * taxRate;

  const discount = Number(appliedCoupon?.discount || 0);
  const total = Math.max(subtotal + deliveryFee + platformFee + tax - discount, 0);

  useEffect(() => {
    dispatch(closeCart());
  }, [location.pathname, dispatch]);

  useEffect(() => {
    if (!cartOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [cartOpen]);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
      dispatch(closeCart());
      return;
    }
    navigate('/checkout');
    dispatch(closeCart());
  };

  const handleApplyCoupon = async () => {
    const codeToApply = promoCode.trim();
    if (!codeToApply) {
      toast.error('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    try {
      const response = await validateCoupon(codeToApply, subtotal, restaurant?._id);
      if (response?.success) {
        setAppliedCoupon(response.data.coupon);
        setPromoCode(codeToApply.toUpperCase());
        toast.success(response.message || 'Coupon applied successfully');
      }
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(error?.response?.data?.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setPromoCode('');
    toast.success('Coupon removed');
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
        className="fixed inset-0 bg-black/50 z-[1390] animate-fade-in"
        onClick={() => dispatch(closeCart())}
      />

      {/* Drawer – full-screen on mobile, right-side panel on sm+ */}
      <div className="fixed inset-0 z-[1400] sm:left-auto sm:w-[400px] bg-[#F5F3F1] shadow-2xl flex flex-col animate-slide-up sm:animate-slide-right overflow-hidden h-[100dvh]">
        <div className="px-4 bg-[#F5F3F1] sticky top-0 z-10 border-b border-[#EDE7E3]" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => dispatch(closeCart())}
                className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-[0_8px_18px_rgba(234,88,12,0.32)]"
                aria-label="Go back"
                style={{ background: 'linear-gradient(rgb(255, 122, 69) 0%, rgb(234, 88, 12) 100%)' }}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>

              <button type="button" className="flex items-center gap-2 text-left">
                <MapPinIcon className="h-4 w-4" style={{ color: 'rgb(234, 88, 12)' }} />
                <div>
                  <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">Deliver to</p>
                  <p className="text-[12px] leading-none font-semibold text-gray-900 truncate">{deliveryAddressLabel}</p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => navigate('/restaurants')}>
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-700" />
              </button>
              <button type="button" onClick={() => navigate('/profile')} className="h-8 w-8 rounded-full border-2 border-[#EA580C] overflow-hidden">
                <img src={logo} alt="Profile" className="h-full w-full object-cover" />
              </button>
            </div>
          </div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#FF6A2A] font-semibold mb-1">Checkout Journey</p>
          {/* <h2 className="text-[24px] leading-[1] font-extrabold tracking-[-0.014em] text-[#171415]">My Culinary<br />Selections</h2> */}
        </div>

        {/* Cart Items – Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 max-[388px]:p-3 pb-[calc(24px+env(safe-area-inset-bottom,0px))]" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div
                className="w-20 h-20 rounded-full mb-5 flex items-center justify-center"
                style={{ background: '#FFF7ED' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="1.5" className="w-9 h-9">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-900 text-[16px] max-[388px]:text-[15px] mb-1">Your cart is empty</p>
              <p className="text-gray-400 text-sm max-[388px]:text-xs mb-4">Add items from a restaurant to get started</p>
              <button
                onClick={() => {
                  dispatch(closeCart());
                  navigate('/restaurants');
                }}
                className="text-sm max-[388px]:text-xs font-semibold px-5 max-[388px]:px-4 py-2.5 max-[388px]:py-2 rounded-xl touch-feedback transition-colors"
                style={{ background: '#FFF7ED', color: BRAND }}
              >
                Browse Restaurants
              </button>
              <button
                onClick={() => {
                  dispatch(closeCart());
                  navigate('/');
                }}
                className="mt-3 text-sm max-[388px]:text-xs font-semibold px-5 max-[388px]:px-4 py-2.5 max-[388px]:py-2 rounded-xl touch-feedback transition-colors"
                style={{ background: '#F9FAFB', color: '#374151' }}
              >
                Go Home
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {restaurant && (
                <div className="rounded-[20px] bg-[#F2EEEB] px-3.5 py-3 border border-[#ECE6E1]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-[#E9E0D9] flex-shrink-0">
                      <img src={restaurant.image || logo} alt={restaurant.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-extrabold text-[#151213] truncate">{restaurant.name}</p>
                      <p className="text-[11px] text-[#5E5957]">Estimated delivery: 25-30 mins</p>
                    </div>
                  </div>
                </div>
              )}

              {items.map((item) => (
                <div
                  key={item._id}
                  className="rounded-[20px] bg-[#F7F4F2] border border-[#E3DDD8] p-3"
                >
                  <div className="flex gap-3">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-[62px] w-[62px] rounded-[14px] object-cover bg-[#E9E3DE] flex-shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] leading-[1.15] font-extrabold text-[#171415] line-clamp-2">
                        {item.name}
                      </h4>
                      <p className="text-[11px] italic text-[#5D5956] mt-1 line-clamp-2">{item.description || 'Chef special crafted for your order'}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[18px] leading-none font-black tracking-[-0.01em] text-[#FF5A1F]">
                          {formatCurrency(Number(item.price) || 0)}
                        </span>
                        <div className="h-9 bg-[#F0E9E3] rounded-full px-1 flex items-center gap-1">
                          <button
                            onClick={() => dispatch(updateQuantity({ itemId: item._id, quantity: item.quantity - 1 }))}
                            className="h-6.5 w-6.5 rounded-full bg-[#F8F4F1] text-[#5A5552] flex items-center justify-center"
                            aria-label="Decrease quantity"
                          >
                            <MinusIcon className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-[14px] font-bold text-[#171415] tabular-nums">{item.quantity}</span>
                          <button
                            onClick={() => dispatch(updateQuantity({ itemId: item._id, quantity: item.quantity + 1 }))}
                            className="h-6.5 w-6.5 rounded-full bg-[#FF6A2A] text-white flex items-center justify-center"
                            aria-label="Increase quantity"
                          >
                            <PlusIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => dispatch(removeFromCart(item._id))}
                    className="mt-1 text-[10px] text-[#A67B6C] font-semibold flex items-center gap-1"
                    aria-label="Remove item"
                  >
                    <TrashIcon className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              ))}

              {/* Clear Cart Button */}
              <button
                onClick={async () => {
                  const result = await Swal.fire({
                    title: 'Clear your cart?',
                    text: 'All items will be removed.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#EA580C',
                    cancelButtonColor: '#9CA3AF',
                    confirmButtonText: 'Yes, clear it',
                    cancelButtonText: 'Keep items',
                  });
                  if (result.isConfirmed) dispatch(clearCart());
                }}
                className="w-full mt-1 py-2 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm max-[388px]:text-xs font-medium rounded-lg transition-colors"
              >
                Clear Cart
              </button>

              <div className="border-t border-[#E4DCD6] pt-5">
                <h3 className="text-[22px] leading-[0.98] font-black tracking-[-0.015em] text-[#171415] mb-2">Promotions</h3>
                {appliedCoupon ? (
                  <div className="rounded-2xl border border-[#D9E8D3] bg-[#F1F8EE] p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#2F6A1F] truncate">{appliedCoupon.code}</p>
                      <p className="text-[11px] text-[#4A7D3A] truncate">Saved {formatCurrency(appliedCoupon.discount || 0)}</p>
                    </div>
                    <button type="button" onClick={handleRemoveCoupon} className="text-[11px] font-bold text-[#B42318] px-2 py-1 rounded-lg hover:bg-[#FFE9E7]">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="rounded-full border border-[#E0D5CE] bg-[#F2ECE8] p-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="flex-1 bg-transparent px-3 py-1.5 text-[13px] text-[#3C3937] placeholder:text-[#9B918A] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !promoCode.trim()}
                      className="rounded-full bg-[#1D1614] text-white text-[13px] leading-none px-4 py-2 font-bold disabled:opacity-50"
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-[13px] rounded-[20px] p-3.5 mt-1" style={{ background: '#F4EFEB', border: '1px solid #E4DCD6' }}>
                <h3 className="text-[22px] leading-[0.98] font-black tracking-[-0.015em] text-[#171415] mb-1.5">Order Summary</h3>
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
                </div>
                {isDeliveryFeeEnabled && (
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery</span>
                    <span className="font-medium text-gray-700">{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                {isPlatformFeeEnabled && (
                  <div className="flex justify-between text-gray-500">
                    <span>Platform Fee</span>
                    <span className="font-medium text-gray-700">{formatCurrency(platformFee)}</span>
                  </div>
                )}
                {isTaxEnabled && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax ({Math.round((taxRate || 0) * 100)}%)</span>
                    <span className="font-medium text-gray-700">{formatCurrency(tax)}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span className="font-semibold">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[14px] font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span style={{ color: '#FF5A1F', fontSize: '20px', lineHeight: '1' }}>{formatCurrency(total)}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full mt-2.5 py-3 text-[15px] font-extrabold text-white rounded-full touch-feedback transition-all"
                  style={{ background: 'linear-gradient(90deg, #FF5A1F 0%, #FF7440 100%)' }}
                >
                  Complete Payment  -&gt;
                </button>

                <p className="text-center mt-1 text-[11px] text-[#8A817C] font-medium">Secure encrypted checkout</p>
              </div>

            </div>
          )}
        </div>

        <div className="border-t border-[#E6E2DE] bg-[#F5F3F1] lg:hidden" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-md mx-auto px-6 pt-2 flex items-center justify-between text-[#B0ACA8]">
            <button
              type="button"
              onClick={() => {
                dispatch(closeCart());
                navigate('/');
              }}
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
              style={{ color: 'rgb(176, 172, 168)' }}
            >
              <HomeIcon className="h-5 w-5" />
              <span className="text-[8px]">Home</span>
            </button>

            <button
              type="button"
              onClick={() => {
                dispatch(closeCart());
                navigate('/restaurants');
              }}
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
              style={{ color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' }}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              <span className="text-[8px]">Search</span>
            </button>

            <button
              type="button"
              onClick={() => {
                dispatch(closeCart());
                navigate('/orders');
              }}
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
              style={{ color: 'rgb(176, 172, 168)' }}
            >
              <ShoppingBagIcon className="h-5 w-5" />
              <span className="text-[8px]">Orders</span>
            </button>

            <button
              type="button"
              onClick={() => {
                dispatch(closeCart());
                navigate('/profile');
              }}
              className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1"
              style={{ color: 'rgb(176, 172, 168)' }}
            >
              <UserCircleIcon className="h-5 w-5" />
              <span className="text-[8px]">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
