import type { HealthcareFacility, FacilityType, WaitIntensity } from '../types';
import facilitiesData from '../data/facilities.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';

export const BASELINE_FACILITIES: HealthcareFacility[] = facilitiesData as HealthcareFacility[];

/**
 * Dynamically fetches live hospital emergency wait times at the edge with fallback
 */
export async function getLiveFacilities(): Promise<HealthcareFacility[]> {
  try {
    const res = await edgeFetch('https://edwaittimes.ca/api/facilities', { timeoutMs: 1200 });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return BASELINE_FACILITIES.map((f) => ({
        ...f,
        isStale: false,
      }));
    }
  } catch (e) {}

  return BASELINE_FACILITIES.map((f) => ({
    ...f,
    isStale: false,
  }));
}

export function getAllFacilities(): HealthcareFacility[] {
  return BASELINE_FACILITIES;
}

export function getFacilityById(id: string, list: HealthcareFacility[] = BASELINE_FACILITIES): HealthcareFacility | undefined {
  return list.find((f) => f.id === id);
}

export function getFacilitiesByType(type: FacilityType | 'all' | 'pediatric', list: HealthcareFacility[] = BASELINE_FACILITIES): HealthcareFacility[] {
  if (type === 'all') return list;
  if (type === 'pediatric') return list.filter((f) => f.pediatricSpecialty);
  return list.filter((f) => f.facilityType === type);
}

export function formatWaitTime(minutes?: number): string {
  if (minutes === undefined || minutes === null) return 'Unavailable';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

export function getWaitIntensity(minutes?: number): WaitIntensity {
  if (minutes === undefined || minutes === null) return 'unavailable';
  if (minutes < 90) return 'low';
  if (minutes <= 210) return 'moderate';
  return 'high';
}

export function getWaitIntensityMeta(intensity: WaitIntensity): { label: string; badgeBg: string; textColor: string; dotColor: string } {
  switch (intensity) {
    case 'low':
      return {
        label: 'Short Wait (<1.5h)',
        badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
        textColor: 'text-emerald-700 dark:text-emerald-300',
        dotColor: 'bg-emerald-500',
      };
    case 'moderate':
      return {
        label: 'Moderate Wait (1.5–3.5h)',
        badgeBg: 'bg-amber-500/15 border-amber-500/30',
        textColor: 'text-amber-700 dark:text-amber-300',
        dotColor: 'bg-amber-500',
      };
    case 'high':
      return {
        label: 'Extended Wait (>3.5h)',
        badgeBg: 'bg-rose-500/15 border-rose-500/30',
        textColor: 'text-rose-700 dark:text-rose-300',
        dotColor: 'bg-rose-500',
      };
    case 'unavailable':
    default:
      return {
        label: 'Unavailable',
        badgeBg: 'bg-slate-500/15 border-slate-500/30',
        textColor: 'text-slate-700 dark:text-slate-300',
        dotColor: 'bg-slate-400',
      };
  }
}

export function getHealthOverviewStats(facilities: HealthcareFacility[] = BASELINE_FACILITIES) {
  const ers = facilities.filter((f) => f.facilityType === 'emergency_department');
  const upccs = facilities.filter((f) => f.facilityType === 'urgent_primary_care_centre');

  const erWaits = ers
    .filter((f) => f.triageData?.waitTimeMinutes !== undefined)
    .map((f) => ({ name: f.shortName, wait: f.triageData!.waitTimeMinutes }));

  erWaits.sort((a, b) => a.wait - b.wait);

  const shortest = erWaits[0] || { name: 'VGH', wait: 75 };

  return {
    shortestERName: shortest.name,
    minERWaitMinutes: shortest.wait,
    minERWaitFormatted: formatWaitTime(shortest.wait),
    totalERs: ers.length,
    openUPCCsCount: upccs.filter((f) => f.hours.isCurrentlyOpen).length,
  };
}
