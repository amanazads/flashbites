# Real-Time Live Tracking System

This document describes the implementation of real-time live tracking for delivery orders using maps and Socket.IO.

## Overview

The live tracking system enables customers to track their delivery partner's location in real-time on an interactive map. The system uses:
- **Backend**: Node.js/Express with Socket.IO for real-time communication
- **Database**: MongoDB with GeoJSON for geospatial data
- **Frontend**: React with Leaflet maps (react-leaflet)
- **Real-time**: Socket.IO for instant location updates

## Features

✅ **Real-time Location Tracking**: Delivery partner's location updates every 10 seconds
✅ **Interactive Map**: OpenStreetMap-based map with custom markers
✅ **Route Visualization**: See the path taken by the delivery partner
✅ **Multi-point Display**: Restaurant location, delivery address, and current partner position
✅ **Auto-centering**: Map automatically centers on delivery partner's current location
✅ **Tracking History**: Complete history of location updates with timestamps
✅ **Socket.IO Integration**: Real-time updates without page refresh
✅ **Authorization**: Only authorized users can view tracking data
✅ **Location Toggle**: Delivery partners can enable/disable location sharing

## Architecture

### Backend Components

#### 1. Order Model (`backend/src/models/Order.js`)
```javascript
deliveryPartnerLocation: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    default: [0, 0]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
},
trackingHistory: [{
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: String
}]
```

**Geospatial Index**: `orderSchema.index({ 'deliveryPartnerLocation': '2dsphere' });`

#### 2. Location Update Endpoint
**Route**: `PUT /api/delivery/location`
**File**: `backend/src/controllers/deliveryPartnerController.js`

**Request Body**:
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "orderId": "optional_order_id"
}
```

**Functionality**:
- Updates delivery partner's User model location
- If `orderId` provided, updates order's `deliveryPartnerLocation`
- Adds entry to order's `trackingHistory`
- Emits Socket.IO event `delivery_location_update` to room `order_${orderId}`

**Socket Event**:
```javascript
socket.to(`order_${orderId}`).emit('delivery_location_update', {
  orderId,
  location: { latitude, longitude },
  timestamp: new Date()
});
```

#### 3. Tracking Retrieval Endpoint
**Route**: `GET /api/orders/:id/tracking`
**File**: `backend/src/controllers/orderController.js`

**Authorization**: Order owner, restaurant owner, admin, or assigned delivery partner

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "status": "out_for_delivery",
    "estimatedDeliveryTime": "2024-01-18T15:30:00Z",
    "restaurant": {
      "name": "Restaurant Name",
      "address": "123 Main St",
      "location": {
        "type": "Point",
        "coordinates": [77.2090, 28.6139]
      }
    },
    "deliveryAddress": {
      "street": "456 Customer St",
      "city": "Delhi",
      "zipCode": "110001",
      "coordinates": {
        "type": "Point",
        "coordinates": [77.2100, 28.6150]
      }
    },
    "deliveryPartner": {
      "name": "Partner Name",
      "phone": "+91 9876543210"
    },
    "currentLocation": {
      "latitude": 28.6145,
      "longitude": 77.2095,
      "lastUpdated": "2024-01-18T15:25:00Z"
    },
    "trackingHistory": [
      {
        "location": {
          "coordinates": [77.2090, 28.6139]
        },
        "timestamp": "2024-01-18T15:20:00Z",
        "status": "picked_up"
      }
    ]
  }
}
```

### Frontend Components

#### 1. LiveTracking Component
**File**: `frontend/src/components/tracking/LiveTracking.jsx`

**Props**:
- `orderId` (string): The order ID to track
- `socket` (Socket): Socket.IO client instance

**Features**:
- Fetches initial tracking data from API
- Listens for `delivery_location_update` socket events
- Displays interactive Leaflet map with markers
- Shows order status, delivery partner info, and ETA
- Displays tracking history with timestamps
- Auto-centers map on delivery partner's location

**Custom Markers**:
- 🔴 Red: Restaurant location
- 🔵 Blue: Delivery address
- 🟢 Green: Delivery partner (current position)

**Map Layers**:
- Base layer: OpenStreetMap tiles
- Polyline: Green dashed line showing the route

#### 2. OrderDetail Page Integration
**File**: `frontend/src/pages/OrderDetail.jsx`

**New Features**:
- Socket.IO connection initialization
- "Track Order" button (visible when order status is `out_for_delivery` or `ready`)
- LiveTracking component embedded in page
- Auto joins/leaves order room via socket
- Toggle to show/hide tracking view

#### 3. Location Tracking Hook
**File**: `frontend/src/hooks/useLocationTracking.js`

**Purpose**: Automatic location tracking for delivery partners

**Usage**:
```javascript
const { currentLocation, error, isTracking } = useLocationTracking(
  orderId,           // Active order ID
  isEnabled,         // Enable/disable tracking
  10000             // Update interval (ms)
);
```

**Features**:
- Uses browser's `navigator.geolocation.watchPosition` API
- Automatically sends location updates every 10 seconds
- Only tracks when an active order is assigned
- Handles permission errors gracefully
- Cleans up watchers on unmount

#### 4. DeliveryPartnerDashboard Integration
**File**: `frontend/src/pages/DeliveryPartnerDashboard.jsx`

**New Features**:
- Location tracking toggle switch
- Real-time tracking status indicator
- Current coordinates display
- Automatic tracking for active orders (`out_for_delivery` or `ready`)

**Status Indicators**:
- 🟢 Active - Tracking Order (green pulsing dot)
- 🟡 Ready - No Active Order (yellow dot)
- ⚫ Disabled (gray dot)

## Socket.IO Events

### Client → Server

#### 1. `join_order_room`
**Purpose**: Join a specific order's room to receive real-time updates
**Payload**: `orderId` (string)
**Emitted by**: Customer viewing order details

```javascript
socket.emit('join_order_room', orderId);
```

#### 2. `leave_order_room`
**Purpose**: Leave order room (cleanup)
**Payload**: `orderId` (string)
**Emitted by**: Customer leaving order details page

```javascript
socket.emit('leave_order_room', orderId);
```

### Server → Client

#### 1. `delivery_location_update`
**Purpose**: Broadcast delivery partner's new location to all clients in order room
**Room**: `order_${orderId}`
**Payload**:
```javascript
{
  orderId: "order_id",
  location: {
    latitude: 28.6145,
    longitude: 77.2095
  },
  timestamp: "2024-01-18T15:25:00Z"
}
```

**Emitted when**: Delivery partner sends location update via `PUT /api/delivery/location` with orderId

## API Endpoints

### 1. Update Delivery Location
```
PUT /api/delivery/location
Authorization: Bearer <delivery_partner_token>
```

**Request**:
```json
{
  "latitude": 28.6145,
  "longitude": 77.2095,
  "orderId": "67890abcdef12345" // Optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Location updated successfully"
}
```

### 2. Get Order Tracking
```
GET /api/orders/:id/tracking
Authorization: Bearer <user_token>
```

**Response**: See "Tracking Retrieval Endpoint" section above

## Database Schema

### Order Collection

**GeoJSON Location Fields**:
```javascript
{
  deliveryPartnerLocation: {
    type: "Point",
    coordinates: [77.2095, 28.6145], // [longitude, latitude]
    lastUpdated: "2024-01-18T15:25:00Z"
  },
  trackingHistory: [
    {
      location: {
        type: "Point",
        coordinates: [77.2090, 28.6139]
      },
      timestamp: "2024-01-18T15:20:00Z",
      status: "picked_up"
    }
  ]
}
```

**Geospatial Index**: Enables location-based queries
```javascript
orderSchema.index({ 'deliveryPartnerLocation': '2dsphere' });
```

## Usage Flow

### For Customers

1. **Place Order**: Customer places order through the platform
2. **Order Assigned**: Restaurant assigns order to delivery partner
3. **View Tracking**: When order status is "Out for Delivery", customer clicks "Track Order" button
4. **Real-time Updates**: Map shows delivery partner's location updating every 10 seconds
5. **Route Visualization**: Customer sees the path delivery partner has taken
6. **Delivery**: When order is delivered, tracking becomes historical data

### For Delivery Partners

1. **Accept Order**: Partner accepts an available order
2. **Enable Tracking**: Location tracking toggle is ON by default
3. **Start Delivery**: Partner picks up order from restaurant
4. **Automatic Updates**: Location is sent every 10 seconds automatically
5. **Complete Delivery**: Partner marks order as delivered
6. **Tracking Stops**: Location tracking stops for that order

### For Restaurant Owners

1. **View Orders**: See all orders in restaurant dashboard
2. **Track Delivery**: Click on any out-for-delivery order to see live tracking
3. **Monitor Progress**: Ensure timely deliveries and customer satisfaction

## Security & Authorization

### Tracking Access Control

**Who can view tracking**:
- ✅ Order owner (customer who placed the order)
- ✅ Restaurant owner (restaurant that received the order)
- ✅ Assigned delivery partner
- ✅ Platform admin

**Implemented in**: `getOrderTracking` controller with authorization checks

```javascript
const isOrderOwner = order.userId.toString() === user._id.toString();
const isRestaurantOwner = order.restaurantId.ownerId.toString() === user._id.toString();
const isDeliveryPartner = order.deliveryPartnerId?.toString() === user._id.toString();
const isAdmin = user.role === 'admin';

if (!isOrderOwner && !isRestaurantOwner && !isDeliveryPartner && !isAdmin) {
  return res.status(403).json({
    success: false,
    message: 'You are not authorized to view this tracking information'
  });
}
```

## Dependencies

### Backend
- `socket.io`: ^4.8.3 - Real-time bidirectional communication
- `mongoose`: Geospatial queries with 2dsphere index

### Frontend
- `react-leaflet`: ^4.2.1 - React components for Leaflet maps
- `leaflet`: Map library (installed with react-leaflet)
- `socket.io-client`: ^4.8.3 - Socket.IO client

## Installation

### Backend (Already Configured)
No additional installation needed. Socket.IO is already set up.

### Frontend
```bash
cd frontend
npm install react-leaflet@4.2.1 leaflet --legacy-peer-deps
```

### Leaflet CSS
Already imported in `LiveTracking.jsx`:
```javascript
import 'leaflet/dist/leaflet.css';
```

## Environment Variables

No additional environment variables needed. Uses existing:
- `VITE_API_URL`: API base URL (frontend)
- Socket.IO connects to the same URL as API

## Testing

### Manual Testing

#### Test Location Update (Delivery Partner)
```bash
# Login as delivery partner and get token
# Then update location
curl -X PUT http://localhost:5000/api/delivery/location \
  -H "Authorization: Bearer <delivery_partner_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6145,
    "longitude": 77.2095,
    "orderId": "67890abcdef12345"
  }'
```

#### Test Tracking Retrieval (Customer)
```bash
curl http://localhost:5000/api/orders/67890abcdef12345/tracking \
  -H "Authorization: Bearer <customer_token>"
```

### Browser Testing

1. **Customer View**:
   - Login as customer
   - Place an order
   - Wait for order to be "Out for Delivery"
   - Click "Track Order" button
   - Verify map loads with markers

2. **Delivery Partner View**:
   - Login as delivery partner
   - Accept an order
   - Verify location tracking toggle is ON
   - Check browser console for location permission
   - Verify green "Active" status appears

3. **Real-time Updates**:
   - Open customer view in one browser tab
   - Open delivery partner dashboard in another tab
   - Move around (or simulate location changes)
   - Verify customer's map updates in real-time

## Troubleshooting

### Location Not Updating

**Issue**: Delivery partner's location not appearing on map

**Solutions**:
1. Check browser location permission (must be granted)
2. Verify `locationTrackingEnabled` toggle is ON
3. Check browser console for geolocation errors
4. Ensure HTTPS (required for geolocation in production)

### Map Not Loading

**Issue**: Map shows blank or doesn't render

**Solutions**:
1. Check Leaflet CSS is imported
2. Verify map container has explicit height in CSS
3. Check browser console for tile loading errors
4. Ensure internet connection (map tiles are from OpenStreetMap)

### Socket Connection Failed

**Issue**: Real-time updates not working

**Solutions**:
1. Check Socket.IO server is running
2. Verify `VITE_API_URL` is correct
3. Check CORS configuration allows Socket.IO
4. Look for socket connection errors in browser console

### Authorization Error

**Issue**: "Not authorized to view tracking information"

**Solutions**:
1. Verify user is logged in
2. Check user is either order owner, restaurant owner, delivery partner, or admin
3. Verify order ID is correct
4. Check JWT token is valid and not expired

## Performance Considerations

### Location Update Frequency
- **Default**: 10 seconds
- **Recommended**: 10-30 seconds
- **Battery Impact**: More frequent updates drain battery faster
- **Network Usage**: More updates = more API calls

### Map Rendering
- Leaflet is lightweight and performant
- Polyline updates are efficient
- Auto-centering uses smooth animation

### Socket.IO Optimization
- Room-based broadcasting (only relevant clients receive updates)
- Automatic reconnection on disconnect
- Minimal payload size

## Future Enhancements

### Planned Features
- 🔲 ETA calculation based on distance and traffic
- 🔲 Route optimization suggestions
- 🔲 Push notifications for location milestones
- 🔲 Offline location queueing
- 🔲 Google Maps integration (alternative to OSM)
- 🔲 Historical route replay
- 🔲 Delivery heatmaps for analytics
- 🔲 Multi-delivery optimization
- 🔲 Customer location sharing (for better directions)
- 🔲 In-app navigation for delivery partners

## Browser Compatibility

### Geolocation API
- ✅ Chrome 5+
- ✅ Firefox 3.5+
- ✅ Safari 5+
- ✅ Edge (all versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Leaflet Maps
- ✅ All modern browsers
- ✅ Mobile responsive
- ✅ Touch-friendly

### Socket.IO
- ✅ All modern browsers with WebSocket support
- ✅ Automatic fallback to polling if needed

## Production Deployment

### HTTPS Requirement
⚠️ **Important**: Geolocation API requires HTTPS in production
- Development: `http://localhost` works
- Production: Must use HTTPS

### Environment Setup
1. Ensure Socket.IO server URL is set correctly
2. Configure CORS to allow frontend domain
3. Set up SSL certificate (Let's Encrypt recommended)
4. Test location permissions on deployed domain

### Monitoring
- Track Socket.IO connection health
- Monitor location update frequency
- Check geospatial query performance
- Alert on authorization failures

## Support

For issues or questions about the live tracking system:
- Check browser console for errors
- Verify all dependencies are installed
- Test Socket.IO connection separately
- Review authorization logic for access issues

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Status**: Production Ready ✅
