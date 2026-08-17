import type { SatelliteLot } from '../types';
import satelliteLotsData from '../data/satellite-lots.json';

export const SATELLITE_LOTS: SatelliteLot[] = satelliteLotsData as SatelliteLot[];

export function getAllSatelliteLots(): SatelliteLot[] {
  return SATELLITE_LOTS;
}

export function getSatelliteLotById(id: string): SatelliteLot | undefined {
  return SATELLITE_LOTS.find((lot) => lot.id === id);
}

export function getSatelliteLotsByCategory(category: string): SatelliteLot[] {
  if (category === 'all') return SATELLITE_LOTS;
  return SATELLITE_LOTS.filter((lot) => lot.category === category);
}

export function getSatelliteStats() {
  const totalLots = SATELLITE_LOTS.length;
  const totalStalls = SATELLITE_LOTS.reduce((acc, lot) => acc + lot.totalStalls, 0);

  return {
    totalLots,
    totalStalls,
    airportLotsCount: SATELLITE_LOTS.filter((l) => l.category === 'airport').length,
    universityLotsCount: SATELLITE_LOTS.filter((l) => l.category === 'university').length,
    mountainLotsCount: SATELLITE_LOTS.filter((l) => l.category === 'mountain').length,
    ferryLotsCount: SATELLITE_LOTS.filter((l) => l.category === 'ferry').length,
  };
}
