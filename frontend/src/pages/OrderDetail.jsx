import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getOrderById, cancelOrder } from '../api/orderApi';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ORDER_STATUS_LABELS } from '../utils/constants';
import { getSocketBaseUrl } from '../utils/apiBase';
import { Loader } from '../components/common/Loader';
import ReviewModal from '../components/common/ReviewModal';
import CancellationModal from '../components/common/CancellationModal';
import OrderInvoiceModal from '../components/common/OrderInvoiceModal';
import LiveTracking from '../components/tracking/LiveTracking';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { MapContainer, Marker, TileLayer, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeftIcon,
  MapPinIcon,
  PhoneIcon,
  XCircleIcon,
  EnvelopeIcon,
  CreditCardIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  StarIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import logo from '../assets/logo.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const restaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const riderIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [socket, setSocket] = useState(null);
  const [livePartnerPosition, setLivePartnerPosition] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = getSocketBaseUrl();

    const newSocket = io(socketUrl, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected for order tracking');
      // Join order room for real-time updates
      newSocket.emit('join_order_room', id);
      newSocket.emit('joinOrderRoom', id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    const refreshOrder = () => {
      fetchOrderDetails();
    };

    const handleLiveStatus = (payload) => {
      const nextStatus = typeof payload === 'string' ? payload : payload?.status;
      if (!nextStatus) return;

      setOrder((prev) => {
        if (!prev) return prev;
        return { ...prev, status: nextStatus };
      });

      refreshOrder();
    };

    const handleLiveLocation = (payload) => {
      const latitude = payload?.location?.latitude ?? payload?.lat;
      const longitude = payload?.location?.longitude ?? payload?.lng;

      if (payload?.orderId && payload.orderId !== id) return;

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        setLivePartnerPosition([latitude, longitude]);
      }

      refreshOrder();
    };

    newSocket.on('status_update', handleLiveStatus);
    newSocket.on('statusUpdate', handleLiveStatus);
    newSocket.on('delivery_location_update', handleLiveLocation);
    newSocket.on('locationUpdate', handleLiveLocation);

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_order_room', id);
      newSocket.emit('leaveOrderRoom', id);
      newSocket.off('status_update', handleLiveStatus);
      newSocket.off('statusUpdate', handleLiveStatus);
      newSocket.off('delivery_location_update', handleLiveLocation);
      newSocket.off('locationUpdate', handleLiveLocation);
      newSocket.close();
    };
  }, [id]);

  useEffect(() => {
    fetchOrderDetails();
    // Auto-refresh every 30 seconds for status updates
    const interval = setInterval(fetchOrderDetails, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const response = await getOrderById(id);
      setOrder(response.data.order);
    } catch (error) {
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (reason) => {
    setCancelling(true);
    try {
      await cancelOrder(id, reason);
      toast.success('Order cancelled successfully');
      setShowCancellationModal(false);
      fetchOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Loader />;
  if (!order) return null;

  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  const etaMinutes = Number(order?.etaMinutes || 0);
  const etaDisplay = etaMinutes > 0 ? `${etaMinutes}` : '12';
  const arrivalTime = order?.estimatedDelivery ? formatDateTime(order.estimatedDelivery) : 'Arriving soon';
  const progressFlow = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
  const progressIndex = Math.max(progressFlow.indexOf(order.status), 0);
  const miniTimelineSteps = [
    { label: 'ORDERED', active: progressIndex >= 0 },
    { label: 'PREPARING', active: progressIndex >= 1 },
    { label: 'DELIVERY', active: progressIndex >= 4 },
    { label: 'ENJOY', active: progressIndex >= 5 },
  ];
  const deliveryPerson = order?.deliveryPartnerId;
  const deliveryPartnerName = typeof deliveryPerson === 'object' ? deliveryPerson?.name : '';
  const deliveryPartnerPhone = typeof deliveryPerson === 'object' ? deliveryPerson?.phone : '';
  const deliveryPartnerVehicle = typeof deliveryPerson === 'object' ? deliveryPerson?.vehicleNumber : '';
  const hasDeliveryPartnerAssigned = Boolean(
    (deliveryPerson && typeof deliveryPerson === 'object' && (deliveryPerson?._id || deliveryPartnerName || deliveryPartnerPhone))
      || (typeof deliveryPerson === 'string' && deliveryPerson.trim())
  );
  const canShowDeliveryContact = hasDeliveryPartnerAssigned && ['ready', 'out_for_delivery', 'delivered'].includes(order.status);

  const restaurantPosition = (() => {
    const coords = order?.restaurantId?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  })();

  const deliveryPosition = (() => {
    const c1 = order?.addressId?.coordinates;
    if (Array.isArray(c1) && c1.length >= 2) {
      const [lng, lat] = c1;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }

    const c2 = order?.deliveryAddress?.coordinates?.coordinates || order?.deliveryAddress?.coordinates;
    if (Array.isArray(c2) && c2.length >= 2) {
      const [lng, lat] = c2;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }

    return null;
  })();

  const partnerPosition = (() => {
    if (livePartnerPosition) return livePartnerPosition;

    const c = order?.deliveryPartnerId?.currentLocation?.coordinates;
    if (Array.isArray(c) && c.length >= 2) {
      const [lng, lat] = c;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }

    return null;
  })();

  const mapCenter = partnerPosition || restaurantPosition || deliveryPosition || [12.9716, 77.5946];
  const hasRealMapData = Boolean(restaurantPosition || deliveryPosition || partnerPosition);

  const orderIdShort = order?._id?.slice(-8)?.toUpperCase() || 'N/A';
  const restaurant = order?.restaurantId || {};
  const restaurantName = restaurant?.name || 'Restaurant';
  const restaurantImage = restaurant?.image || restaurant?.bannerImage || logo;

  const address = order?.addressId || order?.deliveryAddress || {};
  const addressType = String(address?.label || address?.type || 'Home').toLowerCase();
  const addressName = address?.name || address?.street || address?.line1 || 'Address details unavailable';
  const addressCityLine = [address?.city, address?.state, address?.pincode || address?.zipCode].filter(Boolean).join(', ');
  const addressLandmark = address?.landmark || '';

  const itemSubtotal = Number(order?.subtotal ?? order?.items?.reduce((sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0), 0) ?? 0);
  const deliveryFee = Number(order?.deliveryFee ?? order?.deliveryCharge ?? order?.deliveryCharges ?? 0);
  const taxAmount = Number(order?.tax ?? order?.taxAmount ?? order?.gst ?? 0);
  const totalAmount = Number(order?.total ?? itemSubtotal + deliveryFee + taxAmount);

  const paymentMethodRaw = String(order?.paymentMethod || 'cod').toLowerCase();
  const paymentMethodLabel = paymentMethodRaw === 'cod' ? 'Cash On Delivery' : paymentMethodRaw === 'upi' ? 'UPI' : paymentMethodRaw === 'card' ? 'Card' : order?.paymentMethod || 'Unknown';
  const paymentBadge = paymentMethodRaw === 'cod' ? 'Pay on Delivery' : order?.paymentStatus === 'paid' ? 'Paid Online' : 'Pending Payment';
  const statusBadgeClass = order?.status === 'delivered'
    ? 'bg-green-100 text-green-700'
    : order?.status === 'cancelled'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';

  const isNavActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/restaurants') return location.pathname.startsWith('/restaurants') || location.pathname.startsWith('/restaurant/');
    if (path === '/orders') return location.pathname.startsWith('/orders');
    if (path === '/profile') return location.pathname.startsWith('/profile');
    return false;
  };

  const handleMessagePartner = () => {
    if (!deliveryPartnerPhone) {
      toast.error('Delivery partner contact is not available yet.');
      return;
    }
    window.location.href = `sms:${deliveryPartnerPhone}`;
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F5F3F1] pb-28">
      <div className="max-w-5xl lg:max-w-6xl mx-auto min-h-screen w-full overflow-x-hidden">
        <div className="max-w-md mx-auto">
          <div className="px-4 pt-[max(env(safe-area-inset-top),10px)]" style={{ backgroundColor: 'rgb(245, 243, 241)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-[0_8px_18px_rgba(234,88,12,0.32)]"
                  aria-label="Go back"
                  style={{ background: 'linear-gradient(rgb(255, 122, 69) 0%, rgb(234, 88, 12) 100%)' }}
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTracking((v) => !v)}
                  className="flex items-center gap-2 text-left min-w-0"
                >
                  <MapPinIcon className="h-4 w-4 flex-shrink-0" style={{ color: 'rgb(234, 88, 12)' }} />
                  <div className="min-w-0">
                    <p className="text-[7px] uppercase tracking-wide text-gray-500 font-semibold">Deliver to</p>
                    <p className="text-[12px] leading-none font-semibold text-gray-900 truncate">{address?.city || 'Current Area'}</p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate('/restaurants')}>
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-700" />
                </button>
                <button type="button" className="h-8 w-8 rounded-full border-2 border-[#EA580C] overflow-hidden">
                  <img src={logo} alt="Profile" className="h-full w-full object-cover" />
                </button>
              </div>
            </div>
          </div>

        <div className="relative h-[54vh] overflow-hidden">
          {hasRealMapData ? (
            <MapContainer center={mapCenter} zoom={14} className="h-full w-full" zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {restaurantPosition && (
                <>
                  <Marker position={restaurantPosition} icon={restaurantIcon} />
                  <Circle center={restaurantPosition} radius={130} pathOptions={{ color: '#EF4444', fillColor: '#FCA5A5', fillOpacity: 0.18, weight: 1 }} />
                </>
              )}

              {deliveryPosition && <Marker position={deliveryPosition} icon={deliveryIcon} />}
              {partnerPosition && <Marker position={partnerPosition} icon={riderIcon} />}
            </MapContainer>
          ) : (
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(190,186,180,0.78), rgba(190,186,180,0.78)), url(https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}

          <div className="absolute inset-0 bg-[#C3BBB2]/35" />
        </div>

        {showTracking && socket && (order.status === 'out_for_delivery' || order.status === 'ready') && (
          <div className="px-4 -mt-8 mb-4 relative z-20">
            <LiveTracking orderId={id} socket={socket} />
          </div>
        )}

        <div className="px-4 -mt-14 relative z-10">
          <div className="relative rounded-[30px] bg-[#F4F4F4] overflow-hidden border border-[#E5E2DE]">
            <div className="absolute left-1/2 -translate-x-1/2 -top-4 h-8 w-8 rounded-full bg-[#F4F4F4] border border-[#E5E2DE] flex items-center justify-center">
              <BuildingStorefrontIcon className="h-4 w-4 text-[#F97316]" />
            </div>

            <div className="px-5 pt-7 pb-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] tracking-[0.24em] font-bold text-[#F97316]">ESTIMATED ARRIVAL</p>
                  <p className="mt-1 text-[#171415] font-black leading-none">
                    <span className="text-[56px]">{etaDisplay}</span>
                    <span className="text-[38px] ml-1">min</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center rounded-full bg-[#FCEEDF] px-3 py-1.5 text-[10px] font-bold tracking-[0.07em] text-[#F97316] mb-2">
                    FAST TRACK
                  </div>
                  <p className="text-[14px] text-[#F97316]">{arrivalTime}</p>
                </div>
              </div>

              {!isCancelled && (
                <div>
                  <div className="h-1.5 rounded-full bg-[#E6E3DF] relative">
                    <div
                      className="h-1.5 rounded-full bg-[#FF6A00]"
                      style={{ width: `${Math.min(((progressIndex + 1) / progressFlow.length) * 100, 100)}%` }}
                    />
                    <div className="absolute inset-0 flex justify-between items-center px-[2px]">
                      {miniTimelineSteps.map((step, idx) => (
                        <span
                          key={step.label}
                          className={`h-5 w-5 rounded-full border-[3px] ${step.active ? 'bg-[#FF6A00] border-[#F9D6C0]' : 'bg-[#F4F4F4] border-[#E9E6E3]'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 text-center">
                    {miniTimelineSteps.map((step) => (
                      <p key={step.label} className={`text-[10px] font-bold ${step.active ? 'text-[#F97316]' : 'text-[#D4CFC9]'}`}>{step.label}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/85 border-t border-[#ECE7E2] px-5 py-5">
              {canShowDeliveryContact ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-16 w-12 rounded-[14px] overflow-hidden border-2 border-[#F97316] bg-[#EFEAE6] flex-shrink-0">
                      <img
                        src={deliveryPerson?.profileImage || logo}
                        alt={deliveryPartnerName || 'Delivery partner'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] tracking-[0.16em] font-bold text-[#F97316]">DELIVERY HERO</p>
                      <p className="text-[18px] font-black text-[#171415] leading-tight mt-1">{deliveryPartnerName || 'Delivery Partner'}</p>
                      <p className="text-[12px] text-[#F97316] mt-1">{deliveryPartnerVehicle || 'Rider is on the way'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleMessagePartner}
                      className="h-10 w-10 rounded-full bg-[#F4F4F4] flex items-center justify-center"
                      aria-label="Message delivery partner"
                    >
                      <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-[#171415]" />
                    </button>
                    <a
                      href={deliveryPartnerPhone ? `tel:${deliveryPartnerPhone}` : undefined}
                      onClick={(e) => {
                        if (!deliveryPartnerPhone) {
                          e.preventDefault();
                          toast.error('Delivery partner contact is not available yet.');
                        }
                      }}
                      className="h-10 px-5 rounded-full bg-[#FF6A00] text-white text-[12px] font-bold tracking-[0.07em] inline-flex items-center justify-center"
                    >
                      CALL
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#F0E8E2] bg-[#F9F6F3] px-3.5 py-3">
                  <p className="text-[11px] font-bold tracking-[0.08em] text-[#A28E81]">DELIVERY PARTNER</p>
                  <p className="text-[13px] font-semibold text-[#3A342F] mt-1">Not assigned yet</p>
                  <p className="text-[11px] text-[#8A837D] mt-1">Waiting for restaurant acceptance and partner assignment.</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="w-full border-t border-[#ECE7E2] px-5 py-3.5 flex items-center justify-between bg-white"
            >
              <p className="text-[14px] text-[#171415] font-semibold text-left truncate">
                {order.items?.slice(0, 2).map((i) => `${i.quantity}x ${i.name}`).join(' + ')}
              </p>
              <span className="text-[12px] font-bold text-[#F97316] tracking-[0.07em]">VIEW DETAILS</span>
            </button>
          </div>
        </div>

        <div className="px-4 mt-3 lg:mt-4">
          <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6 xl:gap-8">
            <div className="space-y-2.5 lg:col-span-2">
            <section className="rounded-2xl bg-white/95 border border-[#E9E3DC] p-3.5 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-bold text-[#1A1716]">Order Details</h2>
                  <p className="mt-1 text-[12px] text-[#5B5652]">Order #{orderIdShort}</p>
                  <p className="text-[11px] text-[#8A837D]">{formatDateTime(order.createdAt)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadgeClass}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
            </section>

            <section className="rounded-2xl bg-white/95 border border-[#E9E3DC] p-3.5 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <h3 className="text-[14px] font-bold text-[#1A1716] mb-3">Restaurant Details</h3>
              <Link
                to={restaurant?._id ? `/restaurant/${restaurant._id}` : '/restaurants'}
                className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[#F8F4F1] transition-colors"
              >
                <img src={restaurantImage} alt={restaurantName} className="h-12 w-12 rounded-lg object-cover border border-[#E8E2DB]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#1A1716] truncate">{restaurantName}</p>
                  <p className="text-[11px] text-[#6B6560] mt-0.5">Partnered with FlashBites</p>
                </div>
                <span className="text-[10px] font-semibold text-[#F97316]">View Menu →</span>
              </Link>
            </section>

            <section className="rounded-2xl bg-white/95 border border-[#E9E3DC] p-3.5 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <h3 className="text-[14px] font-bold text-[#1A1716] mb-3">Order Items</h3>
              <div className="space-y-2.5">
                {(order.items || []).map((item, index) => {
                  const itemImage = item?.menuItemId?.image || item?.image || restaurantImage;
                  const itemName = item?.name || item?.menuItemId?.name || 'Item';
                  const itemQty = Number(item?.quantity || 1);
                  const itemPrice = Number(item?.price || item?.menuItemId?.price || 0);
                  const itemTotal = itemQty * itemPrice;

                  return (
                    <div key={`${itemName}-${index}`} className="flex items-center gap-3 border-b border-[#F0EBE6] pb-2.5 last:border-b-0 last:pb-0">
                      <img src={itemImage} alt={itemName} className="h-11 w-11 rounded-lg object-cover border border-[#ECE6E0]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-[#1A1716] truncate">{itemName}</p>
                        <p className="text-[10px] text-[#6C655F]">Quantity: {itemQty}</p>
                        <p className="text-[10px] text-[#6C655F]">{formatCurrency(itemPrice)} each</p>
                      </div>
                      <p className="text-[12px] font-semibold text-[#1A1716]">{formatCurrency(itemTotal)}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl bg-white/95 border border-[#E9E3DC] p-3.5 max-[388px]:p-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <h3 className="text-[14px] max-[388px]:text-[13px] font-bold text-[#1A1716] mb-3 max-[388px]:mb-2.5">Delivery Address</h3>
              <div className="flex items-start gap-2.5 max-[388px]:gap-2">
                <MapPinIcon className="h-4 w-4 text-[#F97316] flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] max-[388px]:text-[11px] font-semibold text-[#1A1716] capitalize break-words">{addressType}</p>
                  <p className="text-[11px] max-[388px]:text-[10px] text-[#5E5853] break-words">{addressName}</p>
                  {addressCityLine && <p className="text-[11px] max-[388px]:text-[10px] text-[#5E5853] break-words">{addressCityLine}</p>}
                  {addressLandmark && <p className="text-[10px] max-[388px]:text-[9.5px] text-[#7E7771] mt-0.5 break-words">Landmark: {addressLandmark}</p>}
                </div>
              </div>
            </section>
            </div>

            <div className="space-y-2.5 lg:col-span-1 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-2xl bg-white/95 border border-[#E9E3DC] p-3.5 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <h3 className="text-[14px] font-bold text-[#1A1716] mb-3">Bill Details</h3>
              <div className="space-y-2 text-[11px] pb-3 border-b border-[#EFE9E3]">
                <div className="flex items-center justify-between">
                  <span className="text-[#6C655F]">Subtotal</span>
                  <span className="font-medium text-[#1A1716]">{formatCurrency(itemSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6C655F]">Delivery Fee</span>
                  <span className="font-medium text-[#1A1716]">{formatCurrency(deliveryFee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6C655F]">Tax (GST)</span>
                  <span className="font-medium text-[#1A1716]">{formatCurrency(taxAmount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[13px] font-bold mt-3 mb-3.5">
                <span className="text-[#1A1716]">Total Amount</span>
                <span className="text-[#F97316]">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="rounded-xl bg-[#F6F2EF] p-3 border border-[#ECE4DD] mb-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="h-4 w-4 text-[#6C655F]" />
                    <div>
                      <p className="text-[10px] text-[#6C655F]">Payment Method</p>
                      <p className="text-[12px] font-semibold text-[#1A1716]">{paymentMethodLabel}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{paymentBadge}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="w-full h-9 rounded-lg border border-[#F4CDB5] text-[#F97316] text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  View Invoice
                </button>

                {canCancel && !isCancelled && (
                  <button
                    onClick={() => setShowCancellationModal(true)}
                    disabled={cancelling}
                    className="w-full h-9 rounded-lg border border-[#FCA5A5] text-[#DC2626] text-[12px] font-semibold"
                  >
                    Cancel Order
                  </button>
                )}

                {isDelivered && !order.reviewId && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full h-9 rounded-lg bg-[#FF6A00] text-white text-[12px] font-semibold"
                  >
                    Rate Order
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white/95 border border-[#E9E3DC] p-3.5 mb-2 lg:mb-0 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <h3 className="text-[14px] font-bold text-[#1A1716] mb-3">Need Help?</h3>

              <div>
                <p className="text-[10px] text-[#6C655F] mb-2">For platform support:</p>
                <div className="space-y-1.5">
                  <p className="text-[12px] font-semibold text-[#F97316]">FlashBites Support</p>
                  <div className="flex items-center gap-2 text-[11px] text-[#F97316]">
                    <PhoneIcon className="h-3.5 w-3.5" />
                    <a href="tel:+917068247779" className="hover:underline">+91 70682 47779</a>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#F97316]">
                    <EnvelopeIcon className="h-3.5 w-3.5" />
                    <a href="mailto:flashbites@gmail.com" className="hover:underline">flashbites@gmail.com</a>
                  </div>
                  <p className="text-[10px] text-[#8A837D] pt-0.5">Available 24/7 for payment, refund, and technical issues</p>
                </div>
              </div>
            </section>
            </div>
          </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#E6E2DE] bg-[#F5F3F1]" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-md mx-auto px-6 pt-1.5 flex items-center justify-between text-[#B0ACA8]">
            <Link to="/" className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1" style={isNavActive('/') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}>
              <HomeIcon className="h-4 w-4" />
              <span className="text-[7px]">Home</span>
            </Link>
            <Link to="/restaurants" className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1" style={isNavActive('/restaurants') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}>
              <MagnifyingGlassIcon className="h-4 w-4" />
              <span className="text-[7px]">Search</span>
            </Link>
            <Link to="/orders" className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1" style={isNavActive('/orders') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}>
              <ShoppingBagIcon className="h-4 w-4" />
              <span className="text-[7px]">Orders</span>
            </Link>
            <Link to="/profile" className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1" style={isNavActive('/profile') ? { color: 'rgb(234, 88, 12)', background: 'rgb(255, 240, 237)' } : { color: 'rgb(176, 172, 168)' }}>
              <UserCircleIcon className="h-4 w-4" />
              <span className="text-[7px]">Profile</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          fetchOrderDetails(); // Refresh to show review submitted
        }}
        order={order}
      />

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        onConfirm={handleCancelOrder}
        order={order}
        loading={cancelling}
      />

      <OrderInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        order={order}
        viewer="customer"
      />
    </div>
  );
};

export default OrderDetail;
