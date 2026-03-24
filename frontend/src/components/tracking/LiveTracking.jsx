import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { orderApi } from '../../api/orderApi';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

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
  shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const TRACKING_STATUSES = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];

const normalizeStatus = (status) => {
  const map = {
    pending: 'placed',
    confirmed: 'accepted',
    preparing: 'preparing',
    ready: 'preparing',
    out_for_delivery: 'out_for_delivery',
    delivered: 'delivered',
  };
  return map[status] || 'placed';
};

const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculateBearing = (fromLat, fromLng, toLat, toLng) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const y = Math.sin(toRad(toLng - fromLng)) * Math.cos(toRad(toLat));
  const x =
    Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat)) -
    Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(toRad(toLng - fromLng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const buildRiderIcon = (headingDeg) => L.divIcon({
  className: 'moving-bike-marker',
  html: `
    <div style="
      width:38px;
      height:38px;
      border-radius:9999px;
      background:linear-gradient(135deg,#22c55e,#16a34a);
      border:2px solid #ffffff;
      box-shadow:0 10px 24px rgba(22,163,74,0.35);
      display:flex;
      align-items:center;
      justify-content:center;
      animation: bikePulse 1.6s ease-in-out infinite;
      transform: rotate(${headingDeg.toFixed(2)}deg);
      transform-origin:center;
    ">
      <span style="font-size:18px;line-height:1;color:#fff;display:block;">🚴</span>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -18]
});

function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);

  return null;
}

const LiveTracking = ({ orderId, socket }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partnerTargetPosition, setPartnerTargetPosition] = useState(null);
  const [animatedPartnerPosition, setAnimatedPartnerPosition] = useState(null);
  const [riderHeading, setRiderHeading] = useState(0);
  const [liveEtaMins, setLiveEtaMins] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeDurationMins, setRouteDurationMins] = useState(null);
  const [routeSource, setRouteSource] = useState('projected');
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const animationFrameRef = useRef(null);
  const previousTargetRef = useRef(null);
  const lastRouteFetchAtRef = useRef(0);
  const lastRouteStartRef = useRef(null);

  const isValidCoordinatePair = (lat, lng) => (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001)
  );

  const getDeliveryPair = (data) => {
    if (!data) return null;
    if (Array.isArray(data?.deliveryAddress?.coordinates?.coordinates)) {
      const [lng, lat] = data.deliveryAddress.coordinates.coordinates;
      return isValidCoordinatePair(lat, lng) ? [lat, lng] : null;
    }
    if (Array.isArray(data?.deliveryAddress?.coordinates)) {
      const [lng, lat] = data.deliveryAddress.coordinates;
      return isValidCoordinatePair(lat, lng) ? [lat, lng] : null;
    }
    return null;
  };

  const restaurantPosition = useMemo(() => {
    if (!trackingData?.restaurant?.location?.coordinates) return null;
    const [lng, lat] = trackingData.restaurant.location.coordinates;
    return isValidCoordinatePair(lat, lng) ? [lat, lng] : null;
  }, [trackingData]);

  const deliveryPosition = useMemo(() => getDeliveryPair(trackingData), [trackingData]);

  const trackingPath = useMemo(() => {
    const base = (trackingData?.trackingHistory || [])
      .map((point) => {
        if (Array.isArray(point?.location?.coordinates)) {
          const [lng, lat] = point.location.coordinates;
          return isValidCoordinatePair(lat, lng) ? [lat, lng] : null;
        }
        if (Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)) {
          return isValidCoordinatePair(point.latitude, point.longitude) ? [point.latitude, point.longitude] : null;
        }
        return null;
      })
      .filter(Boolean);

    if (animatedPartnerPosition) {
      base.push(animatedPartnerPosition);
    }

    return base;
  }, [trackingData, animatedPartnerPosition]);

  const previewRoute = useMemo(() => {
    if (!animatedPartnerPosition || !deliveryPosition) return [];
    const [fromLat, fromLng] = animatedPartnerPosition;
    const [toLat, toLng] = deliveryPosition;
    const pivotLng = fromLng + ((toLng - fromLng) * 0.55);
    const pivotLat = fromLat + ((toLat - fromLat) * 0.45);
    return [
      [fromLat, fromLng],
      [fromLat, pivotLng],
      [pivotLat, pivotLng],
      [toLat, toLng],
    ];
  }, [animatedPartnerPosition, deliveryPosition]);

  useEffect(() => {
    if (!partnerTargetPosition || !deliveryPosition) {
      setRoutePath([]);
      setRouteDistanceKm(null);
      setRouteDurationMins(null);
      setRouteSource('projected');
      return;
    }

    const now = Date.now();
    const fetchCooldownMs = 6000;
    const [fromLat, fromLng] = partnerTargetPosition;
    const [toLat, toLng] = deliveryPosition;

    const lastStart = lastRouteStartRef.current;
    const movedKm = lastStart
      ? haversineDistanceKm(lastStart[0], lastStart[1], fromLat, fromLng)
      : Infinity;

    if (now - lastRouteFetchAtRef.current < fetchCooldownMs && movedKm < 0.08) {
      return;
    }

    lastRouteFetchAtRef.current = now;
    lastRouteStartRef.current = [fromLat, fromLng];

    const controller = new AbortController();

    const fetchRoadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Routing API failed (${res.status})`);

        const payload = await res.json();
        const route = payload?.routes?.[0];
        const coordinates = route?.geometry?.coordinates;

        if (Array.isArray(coordinates) && coordinates.length > 1) {
          const normalizedPath = coordinates
            .map((pair) => {
              const lng = Number(pair?.[0]);
              const lat = Number(pair?.[1]);
              return isValidCoordinatePair(lat, lng) ? [lat, lng] : null;
            })
            .filter(Boolean);

          if (normalizedPath.length > 1) {
            setRoutePath(normalizedPath);
            setRouteDistanceKm(Number.isFinite(route.distance) ? route.distance / 1000 : null);
            setRouteDurationMins(Number.isFinite(route.duration) ? Math.max(1, Math.ceil(route.duration / 60)) : null);
            setRouteSource('road');
            return;
          }
        }

        setRouteSource('projected');
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setRouteSource('projected');
        }
      }
    };

    fetchRoadRoute();

    return () => controller.abort();
  }, [partnerTargetPosition, deliveryPosition]);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        setLoading(true);
        const response = await orderApi.getOrderTracking(orderId);
        const data = response?.data;
        setTrackingData(data);

        if (data?.currentLocation) {
          const initial = [data.currentLocation.latitude, data.currentLocation.longitude];
          setPartnerTargetPosition(initial);
          setAnimatedPartnerPosition(initial);
          previousTargetRef.current = initial;
        }
      } catch (error) {
        console.error('Error fetching tracking data:', error);
        toast.error('Failed to load tracking information');
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
  }, [orderId]);

  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data) => {
      const latitude = data?.location?.latitude ?? data?.lat;
      const longitude = data?.location?.longitude ?? data?.lng;

      if (data?.orderId !== orderId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const nextTarget = [latitude, longitude];
      const prevTarget = previousTargetRef.current;
      if (prevTarget) {
        setRiderHeading(calculateBearing(prevTarget[0], prevTarget[1], nextTarget[0], nextTarget[1]));
      }
      previousTargetRef.current = nextTarget;
      setPartnerTargetPosition(nextTarget);

      setTrackingData((prev) => ({
        ...prev,
        currentLocation: {
          latitude,
          longitude,
          lastUpdated: data.timestamp,
        },
        trackingHistory: [
          ...(prev?.trackingHistory || []),
          {
            location: { coordinates: [longitude, latitude] },
            timestamp: data.timestamp,
            status: prev?.status,
          },
        ],
      }));
    };

    const handleStatusUpdate = (payload) => {
      const nextStatus = typeof payload === 'string' ? payload : payload?.status;
      if (!nextStatus) return;
      setTrackingData((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    };

    socket.on('delivery_location_update', handleLocationUpdate);
    socket.on('locationUpdate', handleLocationUpdate);
    socket.on('status_update', handleStatusUpdate);
    socket.on('statusUpdate', handleStatusUpdate);

    return () => {
      socket.off('delivery_location_update', handleLocationUpdate);
      socket.off('locationUpdate', handleLocationUpdate);
      socket.off('status_update', handleStatusUpdate);
      socket.off('statusUpdate', handleStatusUpdate);
    };
  }, [socket, orderId]);

  useEffect(() => {
    if (!partnerTargetPosition) return;
    if (!animatedPartnerPosition) {
      setAnimatedPartnerPosition(partnerTargetPosition);
      return;
    }

    const [fromLat, fromLng] = animatedPartnerPosition;
    const [toLat, toLng] = partnerTargetPosition;
    const startAt = performance.now();
    const durationMs = 950;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const step = (now) => {
      const progress = Math.min((now - startAt) / durationMs, 1);
      const lat = fromLat + ((toLat - fromLat) * progress);
      const lng = fromLng + ((toLng - fromLng) * progress);
      setAnimatedPartnerPosition([lat, lng]);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [partnerTargetPosition]);

  useEffect(() => {
    if (!deliveryPosition || !partnerTargetPosition) {
      setLiveEtaMins(null);
      return;
    }

    if (routeDurationMins && routeSource === 'road') {
      setLiveEtaMins(routeDurationMins);
      return;
    }

    const distanceKm = haversineDistanceKm(
      partnerTargetPosition[0],
      partnerTargetPosition[1],
      deliveryPosition[0],
      deliveryPosition[1]
    );
    const speedKmPerHour = 22;
    const mins = Math.max(2, Math.ceil((distanceKm / speedKmPerHour) * 60));
    setLiveEtaMins(mins);
  }, [deliveryPosition, partnerTargetPosition, routeDurationMins, routeSource]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tracking information not available</p>
      </div>
    );
  }

  const normalizedStatus = normalizeStatus(trackingData.status);
  const statusIndex = TRACKING_STATUSES.indexOf(normalizedStatus);
  const progressPercent = ((Math.max(statusIndex, 0) + 1) / TRACKING_STATUSES.length) * 100;
  const mapCenter = animatedPartnerPosition || restaurantPosition || deliveryPosition || [28.6139, 77.2090];
  const riderIcon = buildRiderIcon(riderHeading);

  const etaBand = liveEtaMins
    ? {
        best: Math.max(1, liveEtaMins - Math.ceil(liveEtaMins * 0.15)),
        likely: liveEtaMins,
        worst: liveEtaMins + Math.max(2, Math.ceil(liveEtaMins * 0.2)),
      }
    : null;

  const displayRoute = routeSource === 'road' && routePath.length > 1 ? routePath : previewRoute;

  return (
    <div className="space-y-4">
      <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: 'min(72vh, 620px)', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {restaurantPosition && (
            <Marker position={restaurantPosition} icon={restaurantIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{trackingData.restaurant?.name}</p>
                  <p className="text-gray-600">Restaurant pickup point</p>
                </div>
              </Popup>
            </Marker>
          )}

          {deliveryPosition && (
            <Marker position={deliveryPosition} icon={deliveryIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Delivery Address</p>
                  <p className="text-gray-600">{trackingData.deliveryAddress?.street || 'Destination'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {deliveryPosition && etaBand && (
            <>
              <Circle center={deliveryPosition} radius={220} pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.05, weight: 1 }} />
              <Circle center={deliveryPosition} radius={420} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.04, weight: 1 }} />
            </>
          )}

          {trackingPath.length > 1 && (
            <Polyline positions={trackingPath} color="#16a34a" weight={3} opacity={0.8} dashArray="6, 8" />
          )}

          {displayRoute.length > 1 && (
            <>
              <Polyline positions={displayRoute} color="#60a5fa" weight={14} opacity={0.16} />
              <Polyline positions={displayRoute} color="#3b82f6" weight={8} opacity={0.25} />
              <Polyline positions={displayRoute} color="#2563eb" weight={4} opacity={0.95} dashArray="10, 10" />
            </>
          )}

          {animatedPartnerPosition && (
            <Marker position={animatedPartnerPosition} icon={riderIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{trackingData.deliveryPartner?.name || 'Delivery Partner'}</p>
                  <p className="text-gray-600">Heading: {Math.round(riderHeading)}°</p>
                  {trackingData.currentLocation?.lastUpdated && (
                    <p className="text-xs text-gray-500 mt-1">Updated {new Date(trackingData.currentLocation.lastUpdated).toLocaleTimeString()}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {animatedPartnerPosition && <MapUpdater center={animatedPartnerPosition} />}
        </MapContainer>

        <div className={`absolute left-0 right-0 bottom-0 z-[500] pointer-events-auto ${sheetExpanded ? '' : 'translate-y-[62%]'} transition-transform duration-300`}>
          <div className="mx-3 mb-3 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-100 shadow-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setSheetExpanded((v) => !v)}
              className="w-full py-2 flex items-center justify-center"
              aria-label={sheetExpanded ? 'Collapse tracking panel' : 'Expand tracking panel'}
            >
              <span className="h-1.5 w-14 rounded-full bg-gray-300" />
            </button>

            <div className="px-4 pb-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Live tracking</p>
                  <h3 className="text-base font-bold text-gray-900">Order #{orderId.slice(-8)}</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  {(trackingData.status || '').replace(/_/g, ' ')}
                </span>
              </div>

              {etaBand && normalizedStatus !== 'delivered' && (
                <div className="mb-3 rounded-xl border border-gray-100 p-3 bg-gradient-to-r from-emerald-50 to-blue-50">
                  <p className="text-xs text-gray-500 mb-1">ETA confidence band</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {etaBand.best}-{etaBand.worst} min <span className="text-gray-500 font-normal">(most likely {etaBand.likely} min)</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Route: {routeSource === 'road' ? 'Road-accurate' : 'Projected'}{routeDistanceKm ? ` • ${routeDistanceKm.toFixed(1)} km` : ''}
                  </p>
                </div>
              )}

              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
                  <span>Delivery milestones</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg,#fb7185,#22c55e)' }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TRACKING_STATUSES.map((status, idx) => (
                    <span
                      key={status}
                      className={`text-[11px] px-2 py-1 rounded-full ${idx <= statusIndex ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {status.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={trackingData.deliveryPartner?.phone ? `tel:${trackingData.deliveryPartner.phone}` : '/help'}
                  className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white"
                >
                  Call Rider
                </a>
                <a
                  href="/help"
                  className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
                >
                  Need Help
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {trackingData.trackingHistory?.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Tracking History</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {trackingData.trackingHistory.slice().reverse().map((point, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm border-b border-gray-100 pb-2">
                <div>
                  {Array.isArray(point?.location?.coordinates) ? (
                    <span className="text-gray-600">
                      Lat: {point.location.coordinates[1].toFixed(6)}, Lng: {point.location.coordinates[0].toFixed(6)}
                    </span>
                  ) : Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude) ? (
                    <span className="text-gray-600">
                      Lat: {point.latitude.toFixed(6)}, Lng: {point.longitude.toFixed(6)}
                    </span>
                  ) : (
                    <span className="text-gray-400">Location unavailable</span>
                  )}
                  {point.status && <span className="ml-2 text-primary-600 font-medium">({point.status})</span>}
                </div>
                <span className="text-gray-500 text-xs">{new Date(point.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
