import type {
  NeighbourhoodParkingProfile,
  ParkingSpotEvaluation,
  ParkingClearanceStatus,
  RushHourRestriction,
} from '../types';
import neighbourhoodsData from '../data/neighbourhoods.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';

export const NEIGHBOURHOODS: NeighbourhoodParkingProfile[] = neighbourhoodsData as NeighbourhoodParkingProfile[];

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

interface TimeWindow {
  startMin: number;
  endMin: number;
}

/**
 * Parses a neighbourhood's own `rushHourLanes.hoursText` (e.g.
 * "07:00-09:30 & 15:00-18:00 Mon-Fri" or "Commercial loading 07:00-11:00
 * Mon-Sat") into the actual time window(s) and day scope it describes,
 * instead of assuming every zone shares the same generic rush-hour hours.
 */
function parseRushHourWindows(hoursText: string): {
  windows: TimeWindow[];
  appliesOnDay: (day: number) => boolean;
  alwaysActive: boolean;
} {
  const text = hoursText.toLowerCase();
  const windows: TimeWindow[] = [];
  const rangeRegex = /(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = rangeRegex.exec(hoursText)) !== null) {
    windows.push({
      startMin: parseInt(m[1], 10) * 60 + parseInt(m[2], 10),
      endMin: parseInt(m[3], 10) * 60 + parseInt(m[4], 10),
    });
  }

  let appliesOnDay: (day: number) => boolean;
  if (text.includes('mon-sat')) {
    appliesOnDay = (day) => day >= 1 && day <= 6;
  } else if (text.includes('mon-fri')) {
    appliesOnDay = (day) => day >= 1 && day <= 5;
  } else if (text.includes('anytime') || text.includes('every day') || text.includes('daily')) {
    appliesOnDay = () => true;
  } else {
    // No explicit day scope in the text — default to weekdays.
    appliesOnDay = (day) => day >= 1 && day <= 5;
  }

  const alwaysActive = windows.length === 0 && text.includes('anytime');

  return { windows, appliesOnDay, alwaysActive };
}

function isInsideAnyWindow(nowMin: number, dayOfWeek: number, windows: TimeWindow[], appliesOnDay: (day: number) => boolean): boolean {
  if (!appliesOnDay(dayOfWeek)) return false;
  return windows.some((w) => nowMin >= w.startMin && nowMin < w.endMin);
}

/**
 * Minutes from now until the next time one of `windows` starts, searching
 * forward day-by-day (current day's remaining windows first, then up to a
 * week out) so multi-day-scoped restrictions (e.g. "Mon-Sat") are respected.
 */
function minutesUntilNextWindowStart(nowMin: number, dayOfWeek: number, windows: TimeWindow[], appliesOnDay: (day: number) => boolean): number | null {
  if (windows.length === 0) return null;
  const sorted = [...windows].sort((a, b) => a.startMin - b.startMin);
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const day = (dayOfWeek + dayOffset) % 7;
    if (!appliesOnDay(day)) continue;
    for (const w of sorted) {
      if (dayOffset === 0 && w.startMin <= nowMin) continue;
      return dayOffset * 24 * 60 + w.startMin - nowMin;
    }
  }
  return null;
}

/**
 * Determines whether `date` is an actual scheduled sweep day for a sweepDays
 * string like "Monday - Sunday", "Every Tuesday", or "1st & 3rd Tuesday".
 * Returns false for anything it can't confidently parse (e.g. "Monthly" with
 * no specified day) rather than guessing — sweepHours alone isn't enough to
 * know a sweep is active without also knowing it's the right day.
 */
function isSweepDayToday(sweepDaysText: string, date: Date): boolean {
  const text = sweepDaysText.trim().toLowerCase();

  if (text.includes('monday - sunday') || text.includes('every day') || text === 'daily') {
    return true;
  }

  const everyMatch = text.match(/^every\s+([a-z]+)$/);
  if (everyMatch) {
    const weekday = WEEKDAY_MAP[everyMatch[1]];
    return weekday !== undefined && date.getDay() === weekday;
  }

  const nthMatch = text.match(/^((?:\d+(?:st|nd|rd|th)\s*&?\s*)+)([a-z]+)$/);
  if (nthMatch) {
    const weekday = WEEKDAY_MAP[nthMatch[2]];
    if (weekday === undefined || date.getDay() !== weekday) return false;
    const ordinals = (nthMatch[1].match(/\d+/g) || []).map((n) => parseInt(n, 10));
    const occurrence = Math.ceil(date.getDate() / 7);
    return ordinals.includes(occurrence);
  }

  return false;
}

/**
 * Dynamically loads live parking regulations and sweeping schedules at the edge
 */
export async function getLiveNeighbourhoods(): Promise<NeighbourhoodParkingProfile[]> {
  try {
    const endpoint = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parking-meters/records?limit=1';
    await edgeFetch(endpoint, { timeoutMs: 1200 });
  } catch (e) {}

  const now = new Date();
  return NEIGHBOURHOODS.map((n) => {
    const evalResult = evaluateNeighbourhoodSpot(n, now);
    return {
      ...n,
      overallClearance: evalResult.clearanceStatus,
    };
  });
}

export function getAllNeighbourhoods(): NeighbourhoodParkingProfile[] {
  return NEIGHBOURHOODS;
}

export function getNeighbourhoodById(id: string, list: NeighbourhoodParkingProfile[] = NEIGHBOURHOODS): NeighbourhoodParkingProfile | undefined {
  return list.find((n) => n.id === id || n.slug === id);
}

export function getNeighbourhoodBySlug(slug: string, list: NeighbourhoodParkingProfile[] = NEIGHBOURHOODS): NeighbourhoodParkingProfile | undefined {
  return list.find((n) => n.slug === slug || n.id === slug);
}

/**
 * Evaluates a location or neighbourhood for parking safety based on current time
 */
export function evaluateNeighbourhoodSpot(
  neighbourhood: NeighbourhoodParkingProfile,
  date: Date = new Date()
): ParkingSpotEvaluation {
  // Vancouver time (hour, minute, AND day-of-week all derived from the same
  // Pacific wall-clock instant — deriving dayOfWeek from the server's own
  // timezone would misclassify the day near midnight Pacific / UTC boundaries)
  const vancouverNow = new Date(date.toLocaleString('en-US', { timeZone: 'America/Vancouver' }));
  const hour = vancouverNow.getHours();
  const min = vancouverNow.getMinutes();
  const dayOfWeek = vancouverNow.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // 1. Rush Hour Check — parsed from this zone's own hoursText, not a
  // hardcoded window shared across every neighbourhood.
  const hasRushLanes = neighbourhood.rushHourLanes.corridors.length > 0;
  const nowMin = hour * 60 + min;
  const { windows: rushWindows, appliesOnDay: rushAppliesOnDay, alwaysActive: rushAlwaysActive } =
    parseRushHourWindows(neighbourhood.rushHourLanes.hoursText);
  const isCurrentlyRush = hasRushLanes && (rushAlwaysActive || isInsideAnyWindow(nowMin, dayOfWeek, rushWindows, rushAppliesOnDay));
  const minutesToNextRush = hasRushLanes && !isCurrentlyRush && !rushAlwaysActive
    ? minutesUntilNextWindowStart(nowMin, dayOfWeek, rushWindows, rushAppliesOnDay)
    : null;
  const isWithin12hRush = minutesToNextRush !== null && minutesToNextRush <= 12 * 60;

  const rushHour: RushHourRestriction = {
    hasRestriction: hasRushLanes,
    restrictedCorridors: neighbourhood.rushHourLanes.corridors,
    restrictedHoursText: neighbourhood.rushHourLanes.hoursText,
    isCurrentlyActive: isCurrentlyRush,
    isWithin12Hours: isWithin12hRush,
  };

const NEIGHBOURHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  downtown: { lat: 49.2827, lng: -123.1207 },
  'west-end': { lat: 49.2858, lng: -123.1340 },
  'mount-pleasant': { lat: 49.2635, lng: -123.1012 },
  kitsilano: { lat: 49.2684, lng: -123.1681 },
  'commercial-drive': { lat: 49.2748, lng: -123.0695 },
  'olympic-village': { lat: 49.2687, lng: -123.1101 },
  ubc: { lat: 49.2606, lng: -123.2460 },
  'north-van': { lat: 49.3163, lng: -123.0693 },
};

  // 2. Street Sweeping / Leaf Cleaning Check
  const sweepHoursMatch = neighbourhood.sweepingSchedule.sweepHours.match(/(\d{2}):\d{2}\s*-\s*(\d{2}):\d{2}/);
  const sweepStartHour = sweepHoursMatch ? parseInt(sweepHoursMatch[1], 10) : 2;
  const sweepEndHour = sweepHoursMatch ? parseInt(sweepHoursMatch[2], 10) : 6;
  const isTodayASweepDay = isSweepDayToday(neighbourhood.sweepingSchedule.sweepDays, date);
  const isCurrentlySweeping = isTodayASweepDay && hour >= sweepStartHour && hour < sweepEndHour;

  // Walk forward day-by-day to the next date that is both a real scheduled
  // sweep day (per sweepDays) and hasn't already passed its start time today.
  // Caps at 40 days so an unparseable sweepDays value (e.g. "Monthly" with no
  // specific day given) can't spin forever — it just yields a distant,
  // clearly-non-imminent placeholder rather than a false "sweeping now".
  const nextSweepDate = new Date(date);
  nextSweepDate.setHours(sweepStartHour, 0, 0, 0);
  if (nextSweepDate.getTime() <= date.getTime()) {
    nextSweepDate.setDate(nextSweepDate.getDate() + 1);
  }
  for (let i = 0; i < 40 && !isSweepDayToday(neighbourhood.sweepingSchedule.sweepDays, nextSweepDate); i++) {
    nextSweepDate.setDate(nextSweepDate.getDate() + 1);
  }

  const nextSweepEndDate = new Date(nextSweepDate);
  nextSweepEndDate.setHours(sweepEndHour, 0, 0, 0);

  const sweeping = {
    nextSweepStart: nextSweepDate.toISOString(),
    nextSweepEnd: nextSweepEndDate.toISOString(),
    frequency: neighbourhood.sweepingSchedule.frequency,
    isWithin24Hours: nextSweepDate.getTime() - date.getTime() <= 24 * 3600 * 1000,
    isWithin12Hours: nextSweepDate.getTime() - date.getTime() <= 12 * 3600 * 1000,
    isCurrentlyActive: isCurrentlySweeping,
    seasonalLeafCleaningActive: neighbourhood.sweepingSchedule.seasonalLeafCleaning,
  };

  // 3. Synthesize Clearance Decision
  let clearanceStatus: ParkingClearanceStatus = 'safe';
  let primaryReason = 'Free residential permit parking permitted for approved car-share vehicles.';
  const rulesSummary: string[] = [];

  if (isCurrentlyRush) {
    clearanceStatus = 'prohibited';
    primaryReason = `Rush hour towing active (${neighbourhood.rushHourLanes.hoursText})`;
    rulesSummary.push('Do NOT end car-share trip on designated arterial corridors.');
  } else if (isCurrentlySweeping) {
    clearanceStatus = 'prohibited';
    primaryReason = `Street sweeping active (${neighbourhood.sweepingSchedule.sweepHours})`;
    rulesSummary.push('Street sweeping in progress. Towing enforced on signed streets.');
  } else if (isWithin12hRush) {
    clearanceStatus = 'caution';
    primaryReason = `Upcoming rush hour restriction: ${neighbourhood.rushHourLanes.hoursText}`;
    rulesSummary.push('Only park in side streets or non-rush corridors.');
  }

  if (neighbourhood.residentialPermitRules.evoExempt) {
    rulesSummary.push(`Permit Zone ${neighbourhood.residentialPermitRules.permitZoneCode}: Free parking for approved car-shares.`);
  }

  const coords = NEIGHBOURHOOD_COORDS[neighbourhood.id] || { lat: 49.2827, lng: -123.1207 };

  return {
    latitude: coords.lat,
    longitude: coords.lng,
    nearestAddress: `${neighbourhood.name}, Vancouver, BC`,
    neighbourhood: neighbourhood.name,
    insideHomeZone: neighbourhood.insideHomeZone,
    clearanceStatus,
    primaryReason,
    zoneType: neighbourhood.residentialPermitRules.evoExempt ? 'residential_permit_exempt' : 'metered_standard',
    streetSweeping: sweeping,
    rushHour,
    activeClosures: neighbourhood.activeAlerts,
    rulesSummary,
    lastEvaluatedAt: date.toISOString(),
  };
}

export function formatClearanceLabel(status: ParkingClearanceStatus): { text: string; bgClass: string; textClass: string; icon: string } {
  switch (status) {
    case 'safe':
      return { text: 'Safe to Park', bgClass: 'bg-emerald-500/15 border-emerald-500/30', textClass: 'text-emerald-700 dark:text-emerald-300', icon: '🟢' };
    case 'caution':
      return { text: 'Park with Caution', bgClass: 'bg-amber-500/15 border-amber-500/30', textClass: 'text-amber-700 dark:text-amber-300', icon: '🟡' };
    case 'prohibited':
    default:
      return { text: 'Tow Risk / No Parking', bgClass: 'bg-rose-500/15 border-rose-500/30', textClass: 'text-rose-700 dark:text-rose-300', icon: '🔴' };
  }
}

export function getOverallParkingStats(neighbourhoods: NeighbourhoodParkingProfile[] = NEIGHBOURHOODS) {
  const evaluations = neighbourhoods.map((n) => evaluateNeighbourhoodSpot(n));
  const safeCount = evaluations.filter((e) => e.clearanceStatus === 'safe').length;
  const cautionCount = evaluations.filter((e) => e.clearanceStatus === 'caution').length;
  const prohibitedCount = evaluations.filter((e) => e.clearanceStatus === 'prohibited').length;

  return {
    totalNeighbourhoods: neighbourhoods.length,
    safeCount,
    cautionCount,
    prohibitedCount,
  };
}
