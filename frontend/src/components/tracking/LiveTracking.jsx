import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { orderApi } from '../../api/orderApi';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
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

const deliveryPartnerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to auto-center map when delivery partner location updates
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
  const [deliveryPartnerPosition, setDeliveryPartnerPosition] = useState(null);
  const mapRef = useRef(null);

  // Fetch initial tracking data
  useEffect(() => {
    const fetchTracking = async () => {
      try {
        setLoading(true);
        const response = await orderApi.getOrderTracking(orderId);
        setTrackingData(response.data);
        
        if (response.data.currentLocation) {
          setDeliveryPartnerPosition([
            response.data.currentLocation.latitude,
            response.data.currentLocation.longitude
          ]);
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

  // Listen for real-time location updates
  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data) => {
      if (data.orderId === orderId) {
        setDeliveryPartnerPosition([
          data.location.latitude,
          data.location.longitude
        ]);
        
        // Update tracking data with new location
        setTrackingData(prev => ({
          ...prev,
          currentLocation: {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            lastUpdated: data.timestamp
          },
          trackingHistory: [
            ...(prev?.trackingHistory || []),
            {
              location: {
                coordinates: [data.location.longitude, data.location.latitude]
              },
              timestamp: data.timestamp
            }
          ]
        }));
      }
    };

    socket.on('delivery_location_update', handleLocationUpdate);

    return () => {
      socket.off('delivery_location_update', handleLocationUpdate);
    };
  }, [socket, orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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

  const restaurantPosition = trackingData.restaurant?.location?.coordinates 
    ? [trackingData.restaurant.location.coordinates[1], trackingData.restaurant.location.coordinates[0]]
    : null;

  const deliveryPosition = trackingData.deliveryAddress?.coordinates?.coordinates
    ? [trackingData.deliveryAddress.coordinates.coordinates[1], trackingData.deliveryAddress.coordinates.coordinates[0]]
    : null;

  // Calculate map center (middle point between restaurant and delivery)
  const mapCenter = restaurantPosition && deliveryPosition
    ? [(restaurantPosition[0] + deliveryPosition[0]) / 2, (restaurantPosition[1] + deliveryPosition[1]) / 2]
    : restaurantPosition || deliveryPosition || [28.6139, 77.2090]; // Default to Delhi

  // Create route line from tracking history
  const routePath = trackingData.trackingHistory?.length > 0
    ? trackingData.trackingHistory.map(point => [
        point.location.coordinates[1],
        point.location.coordinates[0]
      ])
    : [];

  // Add current position to route if available
  if (deliveryPartnerPosition) {
    routePath.push(deliveryPartnerPosition);
  }

  return (
    <div className="space-y-4">
      {/* Order Status Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Order #{orderId.slice(-8)}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            trackingData.status === 'delivered' ? 'bg-green-100 text-green-800' :
            trackingData.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {trackingData.status.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
        
        {trackingData.deliveryPartner && (
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Delivery Partner:</span> {trackingData.deliveryPartner.name}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {trackingData.deliveryPartner.phone}
            </div>
          </div>
        )}

        {trackingData.estimatedDeliveryTime && (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Estimated Delivery:</span>{' '}
            {new Date(trackingData.estimatedDeliveryTime).toLocaleTimeString()}
          </div>
        )}

        {trackingData.currentLocation?.lastUpdated && (
          <div className="mt-1 text-xs text-gray-500">
            Last updated: {new Date(trackingData.currentLocation.lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '500px', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Restaurant Marker */}
          {restaurantPosition && (
            <Marker position={restaurantPosition} icon={restaurantIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{trackingData.restaurant.name}</p>
                  <p className="text-gray-600">{trackingData.restaurant.address}</p>
                  <p className="text-xs text-gray-500 mt-1">Restaurant Location</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Delivery Address Marker */}
          {deliveryPosition && (
            <Marker position={deliveryPosition} icon={deliveryIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Delivery Address</p>
                  <p className="text-gray-600">{trackingData.deliveryAddress.street}</p>
                  <p className="text-gray-600">
                    {trackingData.deliveryAddress.city}, {trackingData.deliveryAddress.zipCode}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Delivery Partner Current Position */}
          {deliveryPartnerPosition && (
            <Marker position={deliveryPartnerPosition} icon={deliveryPartnerIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{trackingData.deliveryPartner?.name || 'Delivery Partner'}</p>
                  <p className="text-gray-600">Current Location</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(trackingData.currentLocation?.lastUpdated).toLocaleTimeString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route Path */}
          {routePath.length > 1 && (
            <Polyline
              positions={routePath}
              color="green"
              weight={3}
              opacity={0.7}
              dashArray="5, 10"
            />
          )}

          {/* Auto-center map when delivery partner moves */}
          {deliveryPartnerPosition && <MapUpdater center={deliveryPartnerPosition} />}
        </MapContainer>
      </div>

      {/* Tracking History */}
      {trackingData.trackingHistory?.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Tracking History</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {trackingData.trackingHistory.slice().reverse().map((point, index) => (
              <div key={index} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                <div>
                  <span className="text-gray-600">
                    Lat: {point.location.coordinates[1].toFixed(6)}, 
                    Lng: {point.location.coordinates[0].toFixed(6)}
                  </span>
                  {point.status && (
                    <span className="ml-2 text-orange-600 font-medium">
                      ({point.status})
                    </span>
                  )}
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(point.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
