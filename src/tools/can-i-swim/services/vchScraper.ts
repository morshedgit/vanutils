import type { Beach, BeachFilterOptions } from '../types';
import beachesData from '../data/beaches.json';
import { calculateDistanceKm } from '../../../services/shared/geo';

// Cast imported JSON data to typed Beach array
export const BEACHES: Beach[] = beachesData as Beach[];

/**
 * Returns all beaches in Metro Vancouver registry
 */
export function getAllBeaches(): Beach[] {
  return BEACHES;
}

/**
 * Returns a single beach by its unique slug ID
 */
export function getBeachById(id: string): Beach | undefined {
  return BEACHES.find((b) => b.id === id);
}

/**
 * Calculates high-level summary metrics across all beaches
 */
export function getBeachStats(beaches: Beach[] = BEACHES) {
  const total = beaches.length;
  const safe = beaches.filter((b) => b.currentStatus === 'safe').length;
  const caution = beaches.filter((b) => b.currentStatus === 'caution').length;
  const advisory = beaches.filter((b) => b.currentStatus === 'advisory').length;
  const unmonitored = beaches.filter((b) => b.currentStatus === 'unmonitored').length;
  const cleanPercentage = total > 0 ? Math.round((safe / total) * 100) : 0;

  return {
    total,
    safe,
    caution,
    advisory,
    unmonitored,
    cleanPercentage,
  };
}

/**
 * Filters and sorts beaches according to search query, region, amenities, and user location
 */
export function filterBeaches(
  beaches: Beach[] = BEACHES,
  options: BeachFilterOptions = {}
): (Beach & { distanceKm?: number })[] {
  let results: (Beach & { distanceKm?: number })[] = beaches.map((beach) => {
    let distanceKm: number | undefined;
    if (options.userLat !== undefined && options.userLng !== undefined) {
      distanceKm = calculateDistanceKm(
        { latitude: options.userLat, longitude: options.userLng },
        { latitude: beach.latitude, longitude: beach.longitude }
      );
    }
    return { ...beach, distanceKm };
  });

  // Filter by search query (name, municipality, keywords)
  if (options.query && options.query.trim()) {
    const q = options.query.toLowerCase().trim();
    results = results.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.municipality.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.bestFor.some((item) => item.toLowerCase().includes(q))
    );
  }

  // Filter by Municipality
  if (options.municipality && options.municipality !== 'all') {
    results = results.filter(
      (b) => b.municipality.toLowerCase() === options.municipality?.toLowerCase()
    );
  }

  // Filter by Water Type (ocean vs freshwater lake)
  if (options.waterType && options.waterType !== 'all') {
    results = results.filter((b) => b.waterType === options.waterType);
  }

  // Filter by Status
  if (options.status && options.status !== 'all') {
    results = results.filter((b) => b.currentStatus === options.status);
  }

  // Amenity filters
  if (options.dogFriendly) {
    results = results.filter((b) => b.dogFriendly);
  }
  if (options.lifeguards) {
    results = results.filter((b) => b.lifeguards);
  }
  if (options.wheelchairAccessible) {
    results = results.filter((b) => b.wheelchairAccessible);
  }
  if (options.washrooms) {
    results = results.filter((b) => b.washrooms);
  }

  // Sort
  if (options.sortBy === 'distance' && options.userLat !== undefined && options.userLng !== undefined) {
    results.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  } else if (options.sortBy === 'name') {
    results.sort((a, b) => a.name.localeCompare(b.name));
  } else if (options.sortBy === 'eColi') {
    results.sort((a, b) => a.latestSample.eColiCount - b.latestSample.eColiCount);
  } else {
    // Default sort: Safe first, then by geometric mean E. coli ascending
    const statusOrder: Record<string, number> = { safe: 1, caution: 2, advisory: 3, unmonitored: 4 };
    results.sort((a, b) => {
      const orderDiff = (statusOrder[a.currentStatus] || 99) - (statusOrder[b.currentStatus] || 99);
      if (orderDiff !== 0) return orderDiff;
      return a.latestSample.eColiCount - b.latestSample.eColiCount;
    });
  }

  return results;
}

/**
 * Finds the nearest safe (green status) beach to the user's coordinates
 */
export function getNearestSafeBeach(
  beaches: Beach[] = BEACHES,
  userLat: number,
  userLng: number
): (Beach & { distanceKm: number }) | undefined {
  const safeBeaches = beaches
    .filter((b) => b.currentStatus === 'safe')
    .map((beach) => ({
      ...beach,
      distanceKm: calculateDistanceKm(
        { latitude: userLat, longitude: userLng },
        { latitude: beach.latitude, longitude: beach.longitude }
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return safeBeaches[0];
}

/**
 * Finds nearby clean alternatives for a given beach
 */
export function getNearbyCleanBeaches(
  currentBeachId: string,
  limit = 3
): (Beach & { distanceKm: number })[] {
  const current = getBeachById(currentBeachId);
  if (!current) return [];

  return BEACHES.filter((b) => b.id !== currentBeachId && b.currentStatus === 'safe')
    .map((b) => ({
      ...b,
      distanceKm: calculateDistanceKm(
        { latitude: current.latitude, longitude: current.longitude },
        { latitude: b.latitude, longitude: b.longitude }
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
