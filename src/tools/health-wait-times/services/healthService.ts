import type { HealthcareFacility, FacilityType, WaitIntensity } from '../types';
import facilitiesData from '../data/facilities.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';

export const BASELINE_FACILITIES: HealthcareFacility[] = facilitiesData as HealthcareFacility[];

/**
 * Dynamically fetches live hospital emergency wait times at the edge with fallback
 */
export async function getLiveFacilities(): Promise<HealthcareFacility[]> {
  const now = new Date();
  const vancouverTimeString = now.toLocaleString('en-US', { timeZone: 'America/Vancouver' });
  const vancouverDate = new Date(vancouverTimeString);
  const hour = vancouverDate.getHours();

  try {
    const res = await edgeFetch<string>('https://www.edwaittimes.ca/legacy', { timeoutMs: 1200 });
    if (res.data && typeof res.data === 'string') {
      const match = res.data.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (match) {
        const nextData = JSON.parse(match[1]);
        const locations: any[] = nextData.props?.pageProps?.locationsWithWaitTimes || [];

        if (locations.length > 0) {
          return BASELINE_FACILITIES.map((f) => {
            const matched = locations.find((l: any) =>
              l.name?.toLowerCase().includes(f.shortName.toLowerCase()) ||
              f.name.toLowerCase().includes(l.name?.toLowerCase()) ||
              l.slug?.toLowerCase() === f.id
            );
            const liveWait = matched?.waitTime?.waitTimeMinutes;
            const isOpen = f.facilityType === 'emergency_department' ? true : (hour >= 8 && hour < 22);

            let intensity: WaitIntensity = 'low';
            if (liveWait === undefined || liveWait === null) {
              intensity = f.triageData?.intensity || 'unavailable';
            } else if (liveWait > 210) {
              intensity = 'high';
            } else if (liveWait >= 90) {
              intensity = 'moderate';
            }

            return {
              ...f,
              triageData: f.triageData && liveWait !== undefined && liveWait !== null
                ? {
                    ...f.triageData,
                    waitTimeMinutes: liveWait,
                    intensity,
                    lastUpdated: matched?.waitTime?.createdAt || now.toISOString(),
                    isStale: false,
                  }
                : f.triageData,
              hours: {
                ...f.hours,
                isCurrentlyOpen: isOpen,
              },
            };
          });
        }
      }
    }
  } catch (e) {}

  return BASELINE_FACILITIES.map((f) => {
    const isOpen = f.facilityType === 'emergency_department' ? true : (hour >= 8 && hour < 22);
    return {
      ...f,
      hours: {
        ...f.hours,
        isCurrentlyOpen: isOpen,
      },
    };
  });
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
