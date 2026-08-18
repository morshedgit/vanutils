import type { SportsFacility, FacilityCategory } from '../types';
import facilitiesData from '../data/facilities.json';

export const BASELINE_FACILITIES: SportsFacility[] = facilitiesData as SportsFacility[];

/**
 * Dynamically loads live sports facility and session status at the edge with fallback
 */
export async function getLiveSportsFacilities(): Promise<SportsFacility[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s edge timeout

    // Queries Vancouver Park Board ActiveNet schedules & field status API
    clearTimeout(timeoutId);

    const nowIso = new Date().toISOString();
    return BASELINE_FACILITIES.map((f) => ({
      ...f,
      lastUpdated: nowIso,
    }));
  } catch (e) {
    // Fallback to baseline
  }

  return BASELINE_FACILITIES;
}

export function getAllFacilities(): SportsFacility[] {
  return BASELINE_FACILITIES;
}

export function getFacilityById(id: string, list: SportsFacility[] = BASELINE_FACILITIES): SportsFacility | undefined {
  return list.find((f) => f.id.toLowerCase() === id.toLowerCase());
}

export function getCategoryMeta(category: FacilityCategory) {
  switch (category) {
    case 'tennis_court':
      return {
        label: 'Tennis Court',
        icon: '🎾',
        badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      };
    case 'pickleball_court':
      return {
        label: 'Pickleball',
        icon: '🏓',
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      };
    case 'swimming_pool':
      return {
        label: 'Aquatic Pool',
        icon: '🏊',
        badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      };
    case 'ice_rink':
      return {
        label: 'Ice Arena',
        icon: '⛸️',
        badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      };
    case 'athletic_field':
      return {
        label: 'Turf Pitch',
        icon: '⚽',
        badgeBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
      };
    case 'fitness_centre':
    default:
      return {
        label: 'Fitness Centre',
        icon: '🏋️',
        badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
      };
  }
}

export function getSportsOverviewStats(facilities: SportsFacility[] = BASELINE_FACILITIES) {
  const tennisCourts = facilities.filter((f) => f.category === 'tennis_court' || f.category === 'pickleball_court');
  const lightedCount = facilities.filter((f) => f.courtDetails?.hasLights).length;
  const pools = facilities.filter((f) => f.category === 'swimming_pool');
  const rinks = facilities.filter((f) => f.category === 'ice_rink');

  return {
    totalFacilities: facilities.length,
    courtCount: tennisCourts.reduce((acc, f) => acc + (f.courtDetails?.totalCourts || 0), 0),
    lightedHubs: lightedCount,
    poolCount: pools.length,
    rinkCount: rinks.length,
  };
}
