import type { CommunityEvent, EventCategory } from '../types';
import eventsData from '../data/events.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';

export const BASELINE_EVENTS: CommunityEvent[] = eventsData as CommunityEvent[];

/**
 * Dynamically loads live community events at the edge with fallback
 */
export async function getLiveEvents(): Promise<CommunityEvent[]> {
  try {
    const endpoint = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/special-events/records?limit=15';
    await edgeFetch<{ results: any[] }>(endpoint, { timeoutMs: 1200 });
  } catch (e) {}

  // This dataset has no per-event fields that map onto CommunityEvent (see
  // scripts/sync-live-events.js), so no live data is ever actually merged
  // here. isStale must stay true regardless of whether the connectivity probe
  // above succeeded — a reachable endpoint doesn't make these records fresh.
  return BASELINE_EVENTS.map((e) => ({
    ...e,
    isStale: true,
  }));
}

export function getAllEvents(): CommunityEvent[] {
  return BASELINE_EVENTS;
}

export function getEventById(id: string, list: CommunityEvent[] = BASELINE_EVENTS): CommunityEvent | undefined {
  return list.find((e) => e.id.toLowerCase() === id.toLowerCase());
}

export function getCategoryMeta(category: EventCategory) {
  switch (category) {
    case 'street_festival':
      return {
        label: 'Street Festival',
        icon: '🎪',
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      };
    case 'park_outdoor':
      return {
        label: 'Parks & Movies',
        icon: '🌳',
        badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      };
    case 'farmers_market':
      return {
        label: 'Farmers Market',
        icon: '🍓',
        badgeBg: 'bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30',
      };
    case 'library_talk':
      return {
        label: 'Library & Culture',
        icon: '📚',
        badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      };
    case 'community_arts':
    default:
      return {
        label: 'Community Arts',
        icon: '🎨',
        badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      };
  }
}

export function getEventsOverviewStats(events: CommunityEvent[] = BASELINE_EVENTS) {
  const freeEventsCount = events.filter((e) => e.isFreeAdmission).length;
  const allAgesCount = events.filter((e) => e.isAllAges).length;

  return {
    totalEvents: events.length,
    freeEventsCount,
    allAgesCount,
  };
}
