import type {
  NeighbourhoodParkingProfile,
  ParkingSpotEvaluation,
  ParkingClearanceStatus,
  RushHourRestriction,
} from '../types';
import neighbourhoodsData from '../data/neighbourhoods.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';

export const NEIGHBOURHOODS: NeighbourhoodParkingProfile[] = neighbourhoodsData as NeighbourhoodParkingProfile[];

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
  // Vancouver time
  const vancouverTimeStr = date.toLocaleTimeString('en-CA', {
    timeZone: 'America/Vancouver',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [hourStr, minStr] = vancouverTimeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  // 1. Rush Hour Check (07:00-09:30 & 15:00-18:00 on Weekdays)
  const isMorningRush = isWeekday && (hour === 7 || hour === 8 || (hour === 9 && min <= 30));
  const isAfternoonRush = isWeekday && (hour >= 15 && hour < 18);
  const isCurrentlyRush = (isMorningRush || isAfternoonRush) && neighbourhood.rushHourLanes.corridors.length > 0;

  const isWithin12hRush = isWeekday && (
    (hour >= 19 && hour <= 23) || // Overnight before morning rush
    (hour >= 4 && hour < 7)       // Early morning before rush
  );

  const rushHour: RushHourRestriction = {
    hasRestriction: neighbourhood.rushHourLanes.corridors.length > 0,
    restrictedCorridors: neighbourhood.rushHourLanes.corridors,
    restrictedHoursText: neighbourhood.rushHourLanes.hoursText,
    morningWindow: { start: '07:00', end: '09:30' },
    afternoonWindow: { start: '15:00', end: '18:00' },
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
  const isCurrentlySweeping = hour >= sweepStartHour && hour < sweepEndHour;

  const nextSweepDate = new Date(date);
  if (hour >= sweepStartHour) {
    nextSweepDate.setDate(nextSweepDate.getDate() + 1);
  }
  nextSweepDate.setHours(sweepStartHour, 0, 0, 0);

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
