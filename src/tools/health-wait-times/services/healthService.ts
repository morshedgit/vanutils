import type { HealthcareFacility, FacilityType, WaitIntensity } from '../types';
import facilitiesData from '../data/facilities.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';
import { withEdgeCache } from '../../../services/shared/edgeCache';
import type { LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only — never presented as live telemetry. See issue #35.
export const BASELINE_FACILITIES: HealthcareFacility[] = facilitiesData as HealthcareFacility[];

const CACHE_TTL_SECONDS = 300; // ER wait times change every few minutes

/**
 * Dynamically fetches live hospital emergency wait times at the edge.
 * Returns ok:false (no baseline wait times masquerading as live) when the
 * upstream fetch fails. A facility with no live match still comes back —
 * its `triageData.waitTimeMinutes` is omitted and `intensity` set to
 * 'unavailable' rather than showing the baseline number.
 */
export async function getLiveFacilities(): Promise<LiveResult<HealthcareFacility[]>> {
  return withEdgeCache<HealthcareFacility[]>('health-wait-times-facilities', CACHE_TTL_SECONDS, async () => {
    const now = new Date();

    const res = await edgeFetch<string>('https://www.edwaittimes.ca/legacy', { timeoutMs: 1200 });
    if (!res.data || typeof res.data !== 'string') return null;

    const match = res.data.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (!match) return null;

    const nextData = JSON.parse(match[1]);
    const locations: any[] = nextData.props?.pageProps?.locationsWithWaitTimes || [];
    if (locations.length === 0) return null;

    return BASELINE_FACILITIES.map((f) => {
      const matched = locations.find((l: any) =>
        l.name?.toLowerCase().includes(f.shortName.toLowerCase()) ||
        f.name.toLowerCase().includes(l.name?.toLowerCase()) ||
        l.slug?.toLowerCase() === f.id
      );
      const liveWait = matched?.waitTime?.waitTimeMinutes;

      let intensity: WaitIntensity = 'unavailable';
      if (liveWait !== undefined && liveWait !== null) {
        if (liveWait > 210) intensity = 'high';
        else if (liveWait >= 90) intensity = 'moderate';
        else intensity = 'low';
      }

      return {
        ...f,
        triageData: f.triageData
          ? {
              ...f.triageData,
              waitTimeMinutes: liveWait ?? undefined,
              intensity,
              lastUpdated: matched?.waitTime?.createdAt || now.toISOString(),
            }
          : f.triageData,
      };
    });
  });
}

/**
 * Computes a facility's open/closed status from the current Vancouver
 * wall-clock hour. Deliberately NOT baked into `getLiveFacilities`'s cached
 * response — this is a function of the current minute, so caching it
 * alongside the (up to 5-minute-TTL) wait-time data could serve a stale
 * "open" status for up to 5 minutes past actual closing. Callers should
 * compute this at render time instead.
 */
export function computeIsCurrentlyOpen(facility: HealthcareFacility, now: Date = new Date()): boolean {
  if (facility.facilityType === 'emergency_department') return true;
  const vancouverTimeString = now.toLocaleString('en-US', { timeZone: 'America/Vancouver' });
  const hour = new Date(vancouverTimeString).getHours();
  return hour >= 8 && hour < 22;
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
    .map((f) => ({ name: f.shortName, wait: f.triageData!.waitTimeMinutes! }));

  erWaits.sort((a, b) => a.wait - b.wait);

  const shortest = erWaits[0] || { name: 'VGH', wait: 75 };

  return {
    shortestERName: shortest.name,
    minERWaitMinutes: shortest.wait,
    minERWaitFormatted: formatWaitTime(shortest.wait),
    totalERs: ers.length,
    openUPCCsCount: upccs.filter((f) => computeIsCurrentlyOpen(f)).length,
  };
}
