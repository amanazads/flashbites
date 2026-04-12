import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getOrderById } from '../api/orderApi';
import { createRazorpayOrder, recordPaymentFailure, verifyPayment } from '../api/paymentApi';
import { formatCurrency } from '../utils/formatters';
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

const Payment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(location.state?.paymentMethod || 'upi');
  const { t } = useLanguage();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await getOrderById(orderId);
        const fetchedOrder = response?.data?.order;
        if (!fetchedOrder) throw new Error('Order not found');
        setOrder(fetchedOrder);
      } catch (error) {
        toast.error(error.response?.data?.message || t('payment.loadOrderFailed', 'Failed to load order'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const summary = useMemo(() => {
    if (!order) return null;
    return {
      items: order.items || [],
      total: order.total || 0,
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      discount: order.discount || 0
    };
  }, [order]);

  const startPayment = async () => {
    if (!order) return;
    if (paying) return;

    if (!RAZORPAY_KEY_ID) {
      toast.error(t('payment.keyMissing', 'Razorpay key is missing. Please contact support.'));
      return;
    }

    if (isProdBuild && !isLiveRazorpayKey(RAZORPAY_KEY_ID)) {
      toast.error(t('payment.liveKeyMissing', 'Live Razorpay key is not configured for production.'));
      return;
    }

    setPaying(true);
    toast.loading(t('payment.init', 'Initializing payment...'));

    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error(t('payment.loadFailed', 'Failed to load Razorpay'));
      }

      const razorpayResponse = await createRazorpayOrder(order._id, order.total);
      if (!razorpayResponse.success) {
        throw new Error('Failed to initialize payment');
      }

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: razorpayResponse.data.amount,
        currency: razorpayResponse.data.currency,
        name: 'FlashBites',
        description: `Order #${order._id.slice(-8)}`,
        order_id: razorpayResponse.data.orderId,
        prefill: {
          name: order.userId?.name || '',
          email: order.userId?.email || '',
          contact: order.userId?.phone || ''
        },
        theme: { color: '#EA580C' },
        method: {
          upi: paymentMethod === 'upi',
          card: paymentMethod === 'card',
          netbanking: false,
          wallet: false
        },
        handler: async function (response) {
          try {
            toast.dismiss();
            toast.loading(t('payment.verify', 'Verifying payment...'));

            await verifyPayment({
              paymentId: razorpayResponse.data.paymentId,
              gateway: 'razorpay',
              gatewayResponse: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }
            });

            toast.dismiss();
            toast.success(t('payment.success', 'Payment successful!'));
            navigate(`/orders/${order._id}`);
          } catch (error) {
            toast.dismiss();
            toast.error(t('payment.verifyFailedRetry', 'Payment verification failed. Redirecting to checkout.'));
            navigate('/checkout');
          }
        },
        modal: {
          ondismiss: async function () {
            toast.dismiss();
            toast.error(t('payment.cancelled', 'Payment cancelled.'));
            try {
              await recordPaymentFailure(razorpayResponse.data.paymentId, {
                gateway: 'razorpay',
                reason: 'User cancelled payment',
              });
            } catch {}
            navigate('/checkout');
          }
        },
        notes: {
          order_id: order._id,
          customer_id: order.userId?._id || ''
        }
      };

      toast.dismiss();
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', async (response) => {
        toast.dismiss();
        const reason = response?.error?.description || response?.error?.reason || 'Payment failed';
        toast.error(t('payment.failed', 'Payment failed. Redirecting to order details.'));
        try {
          await recordPaymentFailure(razorpayResponse.data.paymentId, {
            gateway: 'razorpay',
            reason,
          });
        } catch {
          // Ignore failure logging errors and continue redirect.
        }
        navigate('/checkout');
      });
      razorpay.open();
    } catch (error) {
      toast.dismiss();
      toast.error(error.message || t('payment.initFailed', 'Payment initialization failed'));
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-red-200 border-t-red-500 animate-spin" />
          <p className="text-sm text-gray-500">{t('payment.loading', 'Loading payment...')}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center px-6">
          <h1 className="text-xl font-bold text-gray-900">{t('payment.orderNotFound', 'Order not found')}</h1>
          <p className="text-sm text-gray-500 mt-2">{t('payment.tryAgain', 'Please go back and try again.')}</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold"
          >
            {t('payment.viewOrders', 'View Orders')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white lg:bg-[var(--bg-app)]">
      <div className="max-w-5xl mx-auto container-px py-6 pb-24 max-[400px]:py-4 max-[400px]:pb-16">
        <div className="flex flex-col md:flex-row gap-6 max-[400px]:gap-4">
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-soft p-5 max-[400px]:p-3.5">
              <h1 className="text-2xl font-bold text-gray-900 max-[400px]:text-xl">{t('payment.complete', 'Complete Payment')}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Order #{order._id.slice(-8)} · {order.restaurantId?.name || 'Restaurant'}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-soft p-5 max-[400px]:p-3.5">
              <h2 className="text-base font-bold text-gray-900 mb-3">{t('payment.chooseMethod', 'Choose payment method')}</h2>
              <div className="space-y-2">
                {[
                  { value: 'upi', label: 'UPI', sub: t('payment.upiSub', 'Pay via PhonePe, GPay, Paytm') },
                  { value: 'card', label: 'Card', sub: t('payment.cardSub', 'Credit / Debit cards') }
                ].map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition max-[400px]:p-2.5 ${
                      paymentMethod === method.value ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={() => setPaymentMethod(method.value)}
                      className="accent-red-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{method.label}</p>
                      <p className="text-xs text-gray-500">{method.sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={startPayment}
                disabled={paying}
                className="mt-4 w-full rounded-xl bg-red-500 text-white font-semibold text-sm py-3 disabled:opacity-60"
              >
                {paying ? t('payment.openingRazorpay', 'Opening Razorpay...') : `${t('payment.pay', 'Pay')} ${formatCurrency(summary?.total || 0)}`}
              </button>
            </div>
          </div>

          <div className="w-full md:w-[340px]">
            <div className="bg-white rounded-2xl shadow-soft p-5 sticky top-6 max-[400px]:static max-[400px]:p-3.5">
              <h2 className="text-base font-bold text-gray-900 mb-3">{t('payment.orderSummary', 'Order summary')}</h2>
              <div className="space-y-2 text-sm">
                {summary?.items?.map((item) => (
                  <div key={item._id || item.menuItemId} className="flex justify-between text-gray-700">
                    <span className="truncate">{item.name} x{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>{t('payment.subtotal', 'Subtotal')}</span>
                  <span>{formatCurrency(summary?.subtotal || 0)}</span>
                </div>
                {(summary?.tax || 0) > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>{t('payment.tax', 'Tax')}</span>
                    <span>{formatCurrency(summary?.tax || 0)}</span>
                  </div>
                )}
                {summary?.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t('payment.discount', 'Discount')}</span>
                    <span>-{formatCurrency(summary.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>{t('payment.total', 'Total')}</span>
                  <span>{formatCurrency(summary?.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
