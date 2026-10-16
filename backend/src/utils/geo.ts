const EARTH_RADIUS_KM = 6371.0088;

/**
 * Calculates the Great Circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in decimal degrees
 * @param lon1 Longitude of point 1 in decimal degrees
 * @param lat2 Latitude of point 2 in decimal degrees
 * @param lon2 Longitude of point 2 in decimal degrees
 * @returns Distance in kilometers (rounded to 2 decimal places)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Determines whether a target point falls within a given radius from a reference point.
 *
 * @param refLat Reference latitude
 * @param refLon Reference longitude
 * @param targetLat Target latitude
 * @param targetLon Target longitude
 * @param radiusKm Radius boundary in kilometers
 */
export function isWithinRadius(
  refLat: number,
  refLon: number,
  targetLat: number,
  targetLon: number,
  radiusKm: number
): boolean {
  const dist = calculateDistanceKm(refLat, refLon, targetLat, targetLon);
  return dist <= radiusKm;
}
