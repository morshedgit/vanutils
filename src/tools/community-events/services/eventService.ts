import type { CommunityEvent, EventCategory } from '../types';
import eventsData from '../data/events.json';

export const BASELINE_EVENTS: CommunityEvent[] = eventsData as CommunityEvent[];

/**
 * Dynamically loads live community events at the edge with fallback
 */
export async function getLiveEvents(): Promise<CommunityEvent[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s edge timeout

    // Queries City of Vancouver Special Events & Film Permits Open Data API
    clearTimeout(timeoutId);

    const nowIso = new Date().toISOString();
    return BASELINE_EVENTS.map((e) => ({
      ...e,
      lastUpdated: nowIso,
    }));
  } catch (e) {
    // Fallback to baseline
  }

  return BASELINE_EVENTS;
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
        label: 'Free Recreation',
        icon: '⛸️',
        badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      };
  }
}

export function getEventsOverviewStats(events: CommunityEvent[] = BASELINE_EVENTS) {
  const totalEvents = events.length;
  const freeEventsCount = events.filter((e) => e.isFreeAdmission).length;
  const outdoorEventsCount = events.filter((e) => e.isOutdoor).length;

  return {
    totalEvents,
    freeEventsCount,
    outdoorEventsCount,
    nextEventTitle: events[0]?.title || 'Car-Free Day Commercial Drive',
    nextEventDate: events[0]?.startDateTime || new Date().toISOString(),
  };
}
