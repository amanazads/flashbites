import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapClickHandler = ({ onPick }) => {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    }
  });
  return null;
};

const MapPicker = ({ lat, lng, onChange }) => {
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const center = hasCoords ? [lat, lng] : [27.28, 80.83];

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-gray-200">
      <MapContainer center={center} zoom={hasCoords ? 15 : 12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onPick={onChange} />
        {hasCoords && (
          <Marker
            position={[lat, lng]}
            draggable
            icon={markerIcon}
            eventHandlers={{
              dragend: (event) => {
                const point = event.target.getLatLng();
                onChange(point);
              }
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapPicker;
