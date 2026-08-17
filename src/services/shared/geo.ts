import type { GeoCoord } from '../../types/shared';

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula in kilometers.
 */
export function calculateDistanceKm(coord1: GeoCoord, coord2: GeoCoord): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats a distance in kilometers into a human-friendly string.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Estimates driving and cycling time for Metro Vancouver terrain
 */
export function estimateTravelTimes(distanceKm: number): { driveMinutes: number; bikeMinutes: number; walkMinutes: number } {
  // Average urban speeds accounting for lights & traffic
  const driveMinutes = Math.max(2, Math.round((distanceKm / 35) * 60));
  const bikeMinutes = Math.max(3, Math.round((distanceKm / 16) * 60));
  const walkMinutes = Math.max(5, Math.round((distanceKm / 4.8) * 60));
  return { driveMinutes, bikeMinutes, walkMinutes };
}
