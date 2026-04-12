import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  ClockIcon,
  CreditCardIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { createOrder } from '../redux/slices/orderSlice';
import { clearCart } from '../redux/slices/cartSlice';
import { setSelectedDeliveryAddress } from '../redux/slices/uiSlice';
import { getAddresses } from '../api/userApi';
import { getPlatformSettings } from '../api/settingsApi';
import { createRazorpayOrder, recordPaymentFailure, verifyPayment } from '../api/paymentApi';
import { calculateCartTotal, calculateDistance, isRestaurantOpen } from '../utils/helpers';
import { formatCurrency } from '../utils/formatters';
import AddAddressModal from '../components/common/AddAddressModal';
import logo from '../assets/logo.png';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
const isProdBuild = import.meta.env.PROD;
const isLiveRazorpayKey = (key) => typeof key === 'string' && key.startsWith('rzp_live_');

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

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

const calculateDeliveryFee = (distance, rules) => {
  const tiers = Array.isArray(rules) && rules.length > 0
    ? rules
    : [
        { minDistance: 0, maxDistance: 5, charge: 0 },
        { minDistance: 5, maxDistance: 15, charge: 25 },
        { minDistance: 15, maxDistance: 9999, charge: 30 },
      ];

  const tier = tiers.find((t) => distance >= t.minDistance && distance < t.maxDistance);
  return tier ? tier.charge : 0;
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

const isFeeEnabledNow = (control) => {
  if (control?.enabled === false) return false;
  if (!control?.effectiveFrom) return true;
  const effectiveFrom = new Date(control.effectiveFrom);
  if (Number.isNaN(effectiveFrom.getTime())) return true;
  return effectiveFrom.getTime() <= Date.now();
};

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { items, restaurant } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const selectedDeliveryAddress = useSelector((state) => state.ui.selectedDeliveryAddress);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [platformSettings, setPlatformSettings] = useState(null);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [addressResponse, settingsResponse] = await Promise.all([
          getAddresses(),
          getPlatformSettings(),
        ]);

        const fetchedAddresses = addressResponse?.data?.addresses || addressResponse?.addresses || [];
        setAddresses(fetchedAddresses);
        setPlatformSettings(settingsResponse?.data?.settings || null);

        const preselectedFromGlobal = selectedDeliveryAddress?.id
          ? fetchedAddresses.find((addr) => addr._id === selectedDeliveryAddress.id)
          : null;

        if (preselectedFromGlobal) {
          setSelectedAddress(preselectedFromGlobal._id);
          return;
        }

        const defaultAddr = fetchedAddresses.find((addr) => addr.isDefault) || fetchedAddresses[0];
        if (defaultAddr) {
          setSelectedAddress(defaultAddr._id);
          const mapped = mapSavedAddressToSelection(defaultAddr);
          if (mapped) {
            dispatch(setSelectedDeliveryAddress(mapped));
          }
        }
      } catch {
        toast.error(t('checkout.failedLoad', 'Failed to load checkout details'));
      }
    };

    bootstrap();
  }, [dispatch, selectedDeliveryAddress?.id]);

  useEffect(() => {
    if (!selectedAddress) return;

    const selectedAddressObj = addresses.find((addr) => addr._id === selectedAddress);
    const mapped = mapSavedAddressToSelection(selectedAddressObj);
    if (mapped) {
      dispatch(setSelectedDeliveryAddress(mapped));
    }
  }, [selectedAddress, addresses, dispatch]);

  useEffect(() => {
    if (!selectedAddress || !restaurant?.location?.coordinates) return;

    const address = addresses.find((addr) => addr._id === selectedAddress);
    if (!address || !Array.isArray(address.coordinates) || address.coordinates.length < 2) return;

    const [restLng, restLat] = restaurant.location.coordinates;
    const [addrLng, addrLat] = address.coordinates;
    const distance = calculateDistance(restLat, restLng, addrLat, addrLng);
    setDeliveryDistance(parseFloat(distance));
  }, [selectedAddress, restaurant, addresses]);

  const selectedAddressObj = useMemo(
    () => addresses.find((addr) => addr._id === selectedAddress) || null,
    [addresses, selectedAddress]
  );

  const listedSubtotal = calculateCartTotal(items);

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
  const resolvedDeliveryFee = Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee >= 0
    ? configuredDeliveryFee
    : (deliveryDistance > 0
        ? calculateDeliveryFee(deliveryDistance, platformSettings?.deliveryChargeRules)
        : 0);

  const deliveryFee = isDeliveryFeeEnabled ? resolvedDeliveryFee : 0;
  const platformFee = isPlatformFeeEnabled ? Number(platformSettings?.platformFee || 25) : 0;
  const taxRate = isTaxEnabled ? Number(platformSettings?.taxRate || 0.05) : 0;
  const tax = listedSubtotal * taxRate;
  const total = listedSubtotal + deliveryFee + platformFee + tax;

  const restaurantAvailability = isRestaurantOpen(restaurant?.timing, restaurant?.acceptingOrders !== false);
  const isRestaurantCurrentlyOpen = !restaurant ? true : restaurantAvailability.isOpen;

  const etaText = useMemo(() => {
    if (!deliveryDistance || deliveryDistance <= 0) return '18 - 25 Mins';
    const minEta = Math.max(18, Math.round(deliveryDistance * 3.5));
    const maxEta = Math.max(25, Math.round(deliveryDistance * 4.8));
    return `${minEta} - ${maxEta} Mins`;
  }, [deliveryDistance]);

  const handleAddressAdded = (newAddress) => {
    setAddresses((prev) => [...prev, newAddress]);
    setSelectedAddress(newAddress._id);

    const mapped = mapSavedAddressToSelection(newAddress);
    if (mapped) {
      dispatch(setSelectedDeliveryAddress(mapped));
    }

    setShowAddAddressModal(false);
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error(t('checkout.cartEmptyToast', 'Your cart is empty'));
      return;
    }

    if (!restaurant?._id) {
      toast.error(t('checkout.restaurantMissing', 'Restaurant details are missing. Please refresh and try again.'));
      return;
    }

    if (!isRestaurantCurrentlyOpen) {
      const opensAtText = restaurantAvailability.opensAt ? ` Opens at ${restaurantAvailability.opensAt}.` : '';
      toast.error(`${t('checkout.closedToast', 'This outlet is currently closed.')}${opensAtText}`);
      return;
    }

    if (!selectedAddressObj) {
      toast.error(t('checkout.selectAddress', 'Please select a delivery address'));
      return;
    }

    if (!paymentMethod) {
      toast.error(t('checkout.selectPayment', 'Please select a payment method'));
      return;
    }

    const hasCoordinates = Array.isArray(selectedAddressObj.coordinates)
      && selectedAddressObj.coordinates.length >= 2
      && Number.isFinite(Number(selectedAddressObj.coordinates[0]))
      && Number.isFinite(Number(selectedAddressObj.coordinates[1]));

    if (!hasCoordinates) {
      toast.error(t('checkout.invalidAddressCoords', 'Please edit this address and select a valid location before placing the order.'));
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const selectedPaymentMethod = paymentMethod === 'cod' ? 'cod' : paymentMethod;

      const orderData = {
        restaurantId: restaurant._id,
        addressId: selectedAddress,
        items: items.map((item) => ({
          menuItemId: item.originalId || item._id,
          quantity: item.quantity,
          variantName: item.selectedVariant ? item.selectedVariant.name : undefined,
        })),
        paymentMethod: selectedPaymentMethod,
        couponCode: null,
      };

      const result = await dispatch(createOrder(orderData));

      if (createOrder.fulfilled.match(result)) {
        const createdOrder = result.payload?.data?.order;
        if (!createdOrder?._id) {
          throw new Error('Order was created but response payload is missing order details');
        }

        const orderId = createdOrder._id;
        const isOnlinePayment = selectedPaymentMethod === 'card' || selectedPaymentMethod === 'upi';

        if (!isOnlinePayment) {
          dispatch(clearCart());
          toast.success(t('checkout.orderPlacedCod', 'Order placed successfully! Pay on delivery'));
          navigate(`/orders/${orderId}`);
          return;
        }

        if (!RAZORPAY_KEY_ID) {
          toast.error(t('checkout.razorpayKeyMissing', 'Razorpay key is missing. Please contact support.'));
          navigate('/checkout');
          return;
        }

        if (isProdBuild && !isLiveRazorpayKey(RAZORPAY_KEY_ID)) {
          toast.error(t('checkout.liveKeyMissing', 'Live Razorpay key is not configured for production.'));
          navigate('/checkout');
          return;
        }

        const scriptReady = await loadRazorpayScript();
        if (!scriptReady) {
          toast.error(t('checkout.razorpayLoadFailed', 'Failed to load Razorpay. Please try again.'));
          navigate('/checkout');
          return;
        }

        toast.loading(t('checkout.initializingPayment', 'Initializing payment...'));
        const razorpayResponse = await createRazorpayOrder(orderId, createdOrder.total);
        if (!razorpayResponse?.success) {
          toast.dismiss();
          toast.error(t('checkout.paymentInitFailed', 'Failed to initialize payment'));
          return;
        }

        const options = {
          key: RAZORPAY_KEY_ID,
          amount: razorpayResponse.data.amount,
          currency: razorpayResponse.data.currency,
          name: 'FlashBites',
          description: `Order #${orderId.slice(-8)}`,
          order_id: razorpayResponse.data.orderId,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: { color: '#EA580C' },
          method: {
            upi: selectedPaymentMethod === 'upi',
            card: selectedPaymentMethod === 'card',
            netbanking: false,
            wallet: false,
          },
          handler: async function (response) {
            try {
              toast.dismiss();
              toast.loading(t('checkout.verifyingPayment', 'Verifying payment...'));

              await verifyPayment({
                paymentId: razorpayResponse.data.paymentId,
                gateway: 'razorpay',
                gatewayResponse: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });

              dispatch(clearCart());
              toast.dismiss();
              toast.success(t('checkout.paymentSuccess', 'Payment successful!'));
              navigate(`/orders/${orderId}`);
            } catch {
              toast.dismiss();
              toast.error(t('checkout.paymentVerifyFailed', 'Payment verification failed. Please contact support.'));
              navigate('/checkout');
            }
          },
          modal: {
            ondismiss: async function () {
              toast.dismiss();
              toast.error(t('checkout.paymentCancelled', 'Payment cancelled.'));
              try {
                await recordPaymentFailure(razorpayResponse.data.paymentId, {
                  gateway: 'razorpay',
                  reason: 'User cancelled payment',
                });
              } catch {}
              navigate('/checkout');
            },
          },
          notes: {
            order_id: orderId,
          },
        };

        toast.dismiss();
        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', async (response) => {
          toast.dismiss();
          toast.error(t('checkout.paymentFailed', 'Payment failed. Please try again.'));
          try {
            const reason = response?.error?.description || response?.error?.reason || 'Payment failed';
            await recordPaymentFailure(razorpayResponse.data.paymentId, {
              gateway: 'razorpay',
              reason,
            });
          } catch {}
          navigate('/checkout');
        });
        razorpay.open();
      } else if (createOrder.rejected.match(result)) {
        toast.error(result.payload || t('checkout.orderPlaceFailed', 'Unable to place your order right now. Please check your address and try again.'));
      }
    } catch (error) {
      toast.error(error.message || t('checkout.orderPlaceFailed', 'Unable to place your order right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden" style={{ background: '#F5F3F1' }}>
        <div className="max-w-md mx-auto px-5 pt-12 pb-24 text-center">
          <div className="bg-white rounded-3xl border border-[#EEE8E3] p-8">
            <h1 className="text-2xl font-bold text-[#171415]">{t('checkout.cartEmpty', 'Your cart is empty')}</h1>
            <p className="text-sm text-[#726a66] mt-2">{t('checkout.addItems', 'Add items to continue checkout.')}</p>
            <button
              type="button"
              onClick={() => navigate('/restaurants')}
              className="mt-6 h-12 px-6 rounded-full text-white font-semibold"
              style={{ background: '#F85B24' }}
            >
              {t('checkout.browseRestaurants', 'Browse Restaurants')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: '#F5F3F1' }}>
      <div className="max-w-md mx-auto pb-32">
        <div className="px-4 pt-[max(env(safe-area-inset-top),10px)]" style={{ backgroundColor: 'rgb(245, 243, 241)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) navigate(-1);
                  else navigate('/restaurants');
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-[0_8px_18px_rgba(234,88,12,0.32)]"
                aria-label="Go back"
                style={{ background: 'linear-gradient(rgb(255, 122, 69) 0%, rgb(234, 88, 12) 100%)' }}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>

              <button type="button" onClick={() => setShowAddAddressModal(true)} className="flex items-center gap-2 text-left">
                <MapPinIcon className="h-4 w-4" style={{ color: 'rgb(234, 88, 12)' }} />
                <div>
                  <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">{t('common.deliverTo', 'Deliver to')}</p>
                  <p className="text-[12px] leading-none font-semibold text-gray-900">{t('common.currentArea', 'Current Area')}</p>
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
        </div>

        <div className="px-5 pt-2.5 space-y-5">
          {restaurant && (
            <section className="rounded-[22px] border border-[#ECE8E5] bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3.5">
                <div className="h-[78px] w-[78px] rounded-full overflow-hidden bg-[#E6E1DC] flex-shrink-0">
                  <img src={restaurant.image || '/logo.png'} alt={restaurant.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] leading-none font-medium text-[#4E4A48] flex items-center gap-1.5">
                    <ClockIcon className="h-3.5 w-3.5" /> {t('checkout.estimatedDelivery', 'Estimated Delivery')}
                  </p>
                  <p className="text-[18px] leading-none font-extrabold tracking-[-0.01em] text-[#171415] mt-1.5">{etaText}</p>
                  <p className="text-[13px] leading-none text-[#0D8656] font-medium mt-2">{t('checkout.flashDelivery', 'Flash Delivery active')}</p>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[15px] leading-none font-extrabold text-[#171415]">{t('checkout.deliveryAddress', 'Delivery Address')}</h2>
              <button
                type="button"
                onClick={() => setShowAddAddressModal(true)}
                className="text-[14px] leading-none font-semibold"
                style={{ color: '#F85B24' }}
              >
                {t('checkout.change', 'Change')}
              </button>
            </div>

            {selectedAddressObj ? (
              <div className="rounded-[20px] bg-[#EEECEA] p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#FFDCCD] flex items-center justify-center flex-shrink-0">
                    <HomeIcon className="h-6 w-6 text-[#3A1D14]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-none font-semibold text-[#171415] capitalize">{selectedAddressObj.type || 'home'}</p>
                    <p className="text-[12px] leading-[1.45] text-[#4C3F3B] mt-1.5 break-words">
                      {selectedAddressObj.street}, {selectedAddressObj.city}, {selectedAddressObj.state} - {selectedAddressObj.zipCode}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddAddressModal(true)}
                className="w-full rounded-[16px] border border-[#F4BBA8] bg-[#FFF2EC] py-3 text-[14px] font-semibold"
                style={{ color: '#B34222' }}
              >
                {t('checkout.addAddress', 'Add delivery address')}
              </button>
            )}
          </section>

          <section>
            <h2 className="text-[15px] leading-none font-extrabold text-[#171415] mb-3">{t('checkout.paymentMethod', 'Payment Method')}</h2>
            <div className="space-y-3">
              {[
                {
                  value: 'upi',
                  label: t('checkout.upiPayment', 'UPI Payment'),
                  icon: <DevicePhoneMobileIcon className="h-6 w-6" />,
                },
                {
                  value: 'card',
                  label: t('checkout.cardPayment', 'Credit / Debit Card'),
                  icon: <CreditCardIcon className="h-6 w-6" />,
                },
                {
                  value: 'cod',
                  label: t('checkout.cod', 'Cash on Delivery'),
                  icon: <BanknotesIcon className="h-6 w-6" />,
                },
              ].map((option) => {
                const isActive = paymentMethod === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentMethod(option.value)}
                    className="w-full rounded-[20px] bg-white px-4 py-3.5 border text-left"
                    style={{ borderColor: isActive ? '#F8AF94' : '#EFECE8' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-[#F1EFED] flex items-center justify-center text-[#5A3D34] flex-shrink-0">
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-none font-semibold text-[#171415]">{option.label}</p>
                        <p className="text-[12px] leading-none text-[#4E4542] mt-1.5">
                          {option.value === 'upi' ? t('checkout.payUsingUpi', 'Pay using any UPI app') : option.value === 'card' ? t('checkout.secureCard', 'Secure card payment') : t('checkout.payAfterDelivery', 'Pay after receiving order')}
                        </p>
                      </div>
                      <span
                        className="h-7 w-7 rounded-full border-2 flex-shrink-0"
                        style={{
                          borderColor: isActive ? '#DDAFA4' : '#D8C5BF',
                          background: isActive ? '#EA580C' : 'transparent',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[22px] bg-[#EEEAE7] p-4.5">
            <h2 className="text-[14px] leading-none font-extrabold text-[#171415] mb-4">{t('checkout.orderSummary', 'Order Summary')}</h2>
            <div className="space-y-3 text-[12px] leading-none text-[#3F3532]">
              <div className="flex items-center justify-between">
                <span>{t('checkout.listedTotal', 'Listed Total')}</span>
                <span className="font-medium">{formatCurrency(listedSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('checkout.deliveryFee', 'Delivery Fee')}</span>
                <span className="font-medium" style={{ color: deliveryFee === 0 ? '#0D8656' : '#3F3532' }}>
                  {deliveryFee === 0 ? t('checkout.free', 'FREE') : formatCurrency(deliveryFee)}
                </span>
              </div>
              {isPlatformFeeEnabled && (
                <div className="flex items-center justify-between">
                  <span>{t('checkout.platformFee', 'Platform Fee')}</span>
                  <span className="font-medium">{formatCurrency(platformFee)}</span>
                </div>
              )}
              {isTaxEnabled && (
                <div className="flex items-center justify-between">
                  <span>{t('checkout.tax', 'Taxes & Charges')}</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-dashed border-[#DEBBB2] flex items-center justify-between">
              <span className="text-[15px] leading-none font-extrabold text-[#171415]">{t('checkout.totalToPay', 'Total to Pay')}</span>
              <span className="text-[18px] leading-none font-black text-[#171415]">{formatCurrency(total)}</span>
            </div>
          </section>

          <section className="pb-2 pt-1 flex items-center justify-center gap-6 text-[#726D68]">
            <div className="flex items-center gap-1.5">
              <ShieldCheckIcon className="h-4 w-4" />
              <span className="text-[10px] leading-none tracking-[0.14em] font-semibold">{t('checkout.securePayment', 'SECURE PAYMENT')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CubeIcon className="h-4 w-4" />
              <span className="text-[10px] leading-none tracking-[0.14em] font-semibold">{t('checkout.ecoPackaging', 'ECO-PACKAGING')}</span>
            </div>
          </section>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E7E2DE] rounded-t-[28px]"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto px-5 pt-2">
          <div className="flex items-start justify-between mb-2.5 gap-3">
            <div className="min-w-0 flex items-start gap-2">
              <div className="h-5 w-5 mt-0.5 rounded-[5px] bg-[#F85B24] text-white flex items-center justify-center flex-shrink-0">
                <DevicePhoneMobileIcon className="h-3 w-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] leading-none font-semibold uppercase text-[#2F2927] tracking-[0.03em]">
                {paymentMethod === 'upi'
                  ? t('checkout.payingWithUpi', 'Paying with UPI')
                  : paymentMethod === 'card'
                    ? t('checkout.payingWithCard', 'Paying with Card')
                    : paymentMethod === 'cod'
                      ? t('checkout.payingWithCod', 'Cash on Delivery')
                      : t('checkout.selectPaymentMethod', 'Select Payment Method')}
                </p>
                <p className="text-[12px] leading-none text-[#171415] mt-1 truncate">
                {paymentMethod === 'upi'
                  ? t('checkout.upiApps', 'UPI apps')
                  : paymentMethod === 'card'
                    ? t('checkout.cardPaymentShort', 'Card payment')
                    : paymentMethod === 'cod'
                      ? t('checkout.cashPayment', 'Cash payment')
                      : t('checkout.chooseToContinue', 'Choose one to continue')}
                </p>
              </div>
            </div>
            <p className="text-[18px] leading-none font-black text-[#171415]">{formatCurrency(total)}</p>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={loading || !selectedAddress || !paymentMethod || items.length === 0 || !isRestaurantCurrentlyOpen}
            className="w-full rounded-full py-3 text-[16px] leading-none font-extrabold text-white disabled:opacity-50"
            style={{ backgroundColor: '#F85B24' }}
          >
            {loading ? t('checkout.placing', 'Placing...') : (isRestaurantCurrentlyOpen ? `${t('checkout.placeOrder', 'Place Order')}  ->` : t('checkout.outletClosed', 'Outlet Closed'))}
          </button>
        </div>
      </div>

      <AddAddressModal
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        onAddressAdded={handleAddressAdded}
      />
    </div>
  );
};

export default Checkout;
