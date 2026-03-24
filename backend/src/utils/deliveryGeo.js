const normalizeLngLat = (lng, lat) => {
  const lngNum = Number(lng);
  const latNum = Number(lat);

  if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) return null;
  if (lngNum < -180 || lngNum > 180 || latNum < -90 || latNum > 90) return null;

  return [lngNum, latNum];
};

const normalizePolygonRing = (ring = []) => {
  if (!Array.isArray(ring) || ring.length < 3) return null;

  const normalized = ring
    .map((point) => normalizeLngLat(point?.[0], point?.[1]))
    .filter(Boolean);

  if (normalized.length < 3) return null;

  const first = normalized[0];
  const last = normalized[normalized.length - 1];

  // GeoJSON polygon rings must be closed.
  if (first[0] !== last[0] || first[1] !== last[1]) {
    normalized.push([...first]);
  }

  if (normalized.length < 4) return null;
  return normalized;
};

const normalizeDeliveryZone = (zone) => {
  if (!zone || typeof zone !== 'object') return null;

  const type = zone.type || 'Polygon';
  if (type !== 'Polygon') return null;

  const ring = Array.isArray(zone.coordinates?.[0])
    ? zone.coordinates[0]
    : Array.isArray(zone.coordinates)
      ? zone.coordinates
      : null;

  const normalizedRing = normalizePolygonRing(ring || []);
  if (!normalizedRing) return null;

  return {
    type: 'Polygon',
    coordinates: [normalizedRing]
  };
};

// Ray-casting algorithm for point-in-polygon check on [lng, lat] coordinates.
const isPointInRing = (point, ring) => {
  const x = point[0];
  const y = point[1];

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);

    if (intersects) inside = !inside;
  }

  return inside;
};

const isPointInDeliveryZone = (zone, pointLngLat) => {
  const normalizedZone = normalizeDeliveryZone(zone);
  const normalizedPoint = normalizeLngLat(pointLngLat?.[0], pointLngLat?.[1]);

  if (!normalizedZone || !normalizedPoint) return false;

  const ring = normalizedZone.coordinates[0];
  return isPointInRing(normalizedPoint, ring);
};

const calculateEtaMinutes = ({ distanceKm, prepTimeMinutes = 20, bufferMinutes = 5, avgSpeedKmph = 25 }) => {
  const distance = Number(distanceKm);
  const prep = Number(prepTimeMinutes);

  const safeDistance = Number.isFinite(distance) && distance >= 0 ? distance : 0;
  const safePrep = Number.isFinite(prep) && prep > 0 ? prep : 20;

  const travelMinutes = (safeDistance / avgSpeedKmph) * 60;
  return Math.round(safePrep + travelMinutes + bufferMinutes);
};

module.exports = {
  normalizeDeliveryZone,
  isPointInDeliveryZone,
  calculateEtaMinutes,
};
