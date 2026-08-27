import type { SportsFacility, FacilityCategory } from '../types';
import facilitiesData from '../data/facilities.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';
import { liveFail, liveOk, type LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only (courts/pools/rinks) — never presented as
// live telemetry values. See issue #35.
export const BASELINE_FACILITIES: SportsFacility[] = facilitiesData as SportsFacility[];

/**
 * Evaluates each facility's open/closed session status against the current
 * Vancouver clock time. Deliberately NOT cached — the same reasoning as
 * carshare-parking's clearance evaluation: it's a function of the current
 * hour, so caching would serve a stale open/closed status. The
 * parks-facilities open-data query below has no per-facility fields that
 * map onto SportsFacility (booking/session status), so it isn't merged in —
 * this loader's only genuine "live" signal is the clock-based evaluation,
 * which never depends on that fetch.
 */
export async function getLiveSportsFacilities(): Promise<LiveResult<SportsFacility[]>> {
  try {
    const endpoint = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parks-facilities/records?limit=10';
    await edgeFetch<{ results: any[] }>(endpoint, { timeoutMs: 1200 }).catch(() => null);

    const now = new Date();
    const vancouverTimeString = now.toLocaleString('en-US', { timeZone: 'America/Vancouver' });
    const vancouverDate = new Date(vancouverTimeString);
    const hour = vancouverDate.getHours();

    const evaluated = BASELINE_FACILITIES.map((f) => {
      let isOpen = true;
      if (f.category === 'tennis_court' || f.category === 'pickleball_court') {
        const curfew = f.courtDetails?.hasLights ? 22 : 20;
        isOpen = hour >= 6 && hour < curfew;
      } else if (f.category === 'swimming_pool') {
        isOpen = hour >= 6 && hour < 22;
      } else if (f.category === 'ice_rink') {
        isOpen = hour >= 6 && hour < 22;
      }

      return {
        ...f,
        session: {
          ...f.session,
          isOpenNow: isOpen,
        },
      };
    });

    return liveOk(evaluated, now.toISOString(), 'live');
  } catch (e: any) {
    return liveFail(e?.message || 'Sports facility evaluation failed');
  }
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
