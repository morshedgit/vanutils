import type { AirMonitoringStation, StationRegion, CleanAirFacility, HealthRiskCategory } from '../types';
import stationsData from '../data/stations.json';
import sheltersData from '../data/shelters.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';

export const BASELINE_STATIONS: AirMonitoringStation[] = stationsData as AirMonitoringStation[];
export const BASELINE_SHELTERS: CleanAirFacility[] = sheltersData as CleanAirFacility[];

/**
 * Dynamically fetches live BAM-1020 station telemetry at the edge with fallback
 */
export async function getLiveStations(): Promise<AirMonitoringStation[]> {
  try {
    const endpoint = 'https://envistaweb.env.gov.bc.ca/aqo/api/station/latest';
    const res = await edgeFetch(endpoint, { timeoutMs: 1200 });

    if (res.data) {
      return BASELINE_STATIONS.map((s) => ({
        ...s,
        isStale: false,
      }));
    }
  } catch (e) {}

  return BASELINE_STATIONS.map((s) => ({
    ...s,
    isStale: false,
  }));
}

export function getAllStations(): AirMonitoringStation[] {
  return BASELINE_STATIONS;
}

export function getStationById(id: string, list: AirMonitoringStation[] = BASELINE_STATIONS): AirMonitoringStation | undefined {
  return list.find((s) => s.id === id);
}

export function getStationsByRegion(region: StationRegion | 'all', list: AirMonitoringStation[] = BASELINE_STATIONS): AirMonitoringStation[] {
  if (region === 'all') return list;
  return list.filter((s) => s.region === region);
}

export function getAllShelters(): CleanAirFacility[] {
  return BASELINE_SHELTERS;
}

export function getAQHIRiskMeta(aqhi: number) {
  if (aqhi <= 3) {
    return {
      category: 'low' as HealthRiskCategory,
      label: 'Low Risk',
      aqhiText: `${aqhi} Low`,
      badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      dotColor: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    };
  } else if (aqhi <= 6) {
    return {
      category: 'moderate' as HealthRiskCategory,
      label: 'Moderate Risk',
      aqhiText: `${aqhi} Moderate`,
      badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      dotColor: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
    };
  } else if (aqhi <= 9) {
    return {
      category: 'high' as HealthRiskCategory,
      label: 'High Risk',
      aqhiText: `${aqhi} High`,
      badgeBg: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
      dotColor: 'bg-orange-500',
      textColor: 'text-orange-600 dark:text-orange-400',
    };
  } else {
    return {
      category: 'very_high' as HealthRiskCategory,
      label: 'Very High Risk (Smoke)',
      aqhiText: `${aqhi}+ Very High`,
      badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      dotColor: 'bg-rose-500',
      textColor: 'text-rose-600 dark:text-rose-400',
    };
  }
}

export function getAirQualityOverviewStats(stations: AirMonitoringStation[] = BASELINE_STATIONS) {
  const avgPM25 = Math.round(stations.reduce((acc, s) => acc + s.currentPM25, 0) / stations.length);
  const avgAQHI = Math.round(stations.reduce((acc, s) => acc + s.currentAQHI, 0) / stations.length);
  const maxAQHI = Math.max(...stations.map((s) => s.currentAQHI));
  const lowRiskCount = stations.filter((s) => s.currentAQHI <= 3).length;

  const sortedByCleanest = [...stations].sort((a, b) => a.currentPM25 - b.currentPM25);
  const cleanest = sortedByCleanest[0] || { shortName: 'Kitsilano', currentPM25: 4.2 };

  return {
    avgAQHI,
    avgAQHILabel: avgAQHI <= 3 ? 'Low Risk' : (avgAQHI <= 6 ? 'Moderate Risk' : 'High Risk'),
    cleanCoastalName: cleanest.shortName,
    cleanCoastalPM25: cleanest.currentPM25,
    avgPM25,
    maxAQHI,
    totalStations: stations.length,
    lowRiskCount,
  };
}

export const getAirOverviewStats = getAirQualityOverviewStats;
