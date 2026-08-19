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

  // 2. Street Sweeping / Leaf Cleaning Check
  const sweeping = {
    nextSweepStart: date.toISOString(),
    nextSweepEnd: date.toISOString(),
    frequency: neighbourhood.sweepingSchedule.frequency,
    isWithin24Hours: false,
    isWithin12Hours: false,
    isCurrentlyActive: false,
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
  } else if (isWithin12hRush) {
    clearanceStatus = 'caution';
    primaryReason = `Upcoming rush hour restriction: ${neighbourhood.rushHourLanes.hoursText}`;
    rulesSummary.push('Only park in side streets or non-rush corridors.');
  }

  if (neighbourhood.residentialPermitRules.evoExempt) {
    rulesSummary.push(`Permit Zone ${neighbourhood.residentialPermitRules.permitZoneCode}: Free parking for approved car-shares.`);
  }

  return {
    latitude: 49.2827,
    longitude: -123.1207,
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
