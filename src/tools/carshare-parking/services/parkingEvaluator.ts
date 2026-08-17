import type {
  NeighbourhoodParkingProfile,
  ParkingSpotEvaluation,
  ParkingClearanceStatus,
  ParkingZoneType,
  StreetSweepingSchedule,
  RushHourRestriction,
} from '../types';
import neighbourhoodsData from '../data/neighbourhoods.json';

export const NEIGHBOURHOODS: NeighbourhoodParkingProfile[] = neighbourhoodsData as NeighbourhoodParkingProfile[];

export function getAllNeighbourhoods(): NeighbourhoodParkingProfile[] {
  return NEIGHBOURHOODS;
}

export function getNeighbourhoodById(id: string): NeighbourhoodParkingProfile | undefined {
  return NEIGHBOURHOODS.find((n) => n.id === id || n.slug === id);
}

export function getNeighbourhoodBySlug(slug: string): NeighbourhoodParkingProfile | undefined {
  return NEIGHBOURHOODS.find((n) => n.slug === slug || n.id === slug);
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

  // 2. Street Sweeping Check
  const isSweepingDay = (dayOfWeek === 2 && neighbourhood.sweepingSchedule.sweepDays.includes('Tuesday')) ||
                        (dayOfWeek === 3 && neighbourhood.sweepingSchedule.sweepDays.includes('Wednesday')) ||
                        (dayOfWeek === 4 && neighbourhood.sweepingSchedule.sweepDays.includes('Thursday')) ||
                        (dayOfWeek === 5 && neighbourhood.sweepingSchedule.sweepDays.includes('Friday')) ||
                        (neighbourhood.id === 'downtown' && hour >= 2 && hour < 6);

  const isCurrentlySweeping = isSweepingDay && (hour >= 7 && hour < 11);
  const isSweepingWithin12Hours = isSweepingDay && (hour >= 20 || hour < 7);

  const streetSweeping: StreetSweepingSchedule = {
    nextSweepStart: isSweepingDay ? '07:00' : 'Next scheduled cycle (07:00)',
    nextSweepEnd: isSweepingDay ? '11:00' : '11:00',
    frequency: neighbourhood.sweepingSchedule.frequency,
    isWithin24Hours: isSweepingDay || isSweepingWithin12Hours,
    isWithin12Hours: isSweepingWithin12Hours,
    isCurrentlyActive: isCurrentlySweeping,
    seasonalLeafCleaningActive: neighbourhood.sweepingSchedule.seasonalLeafCleaning && (date.getMonth() >= 9 || date.getMonth() === 0),
  };

  // 3. Evaluate Clearance Status
  let clearanceStatus: ParkingClearanceStatus = 'safe';
  let primaryReason = 'Inside Home Zone. Residential permit exempt. No active tow bans.';
  let zoneType: ParkingZoneType = 'residential_permit_exempt';

  if (!neighbourhood.insideHomeZone) {
    clearanceStatus = 'prohibited';
    primaryReason = 'Outside Home Zone. Trip cannot be ended here.';
    zoneType = 'outside_home_zone';
  } else if (neighbourhood.id === 'ubc') {
    clearanceStatus = 'caution';
    primaryReason = 'Campus street parking prohibited. You must park inside a dedicated parkade (North or Thunderbird).';
    zoneType = 'satellite_dedicated_lot';
  } else if (isCurrentlyRush) {
    clearanceStatus = 'prohibited';
    primaryReason = `Active peak-hour no-stopping restriction on arterial corridors (${neighbourhood.rushHourLanes.hoursText}). High tow risk.`;
    zoneType = 'rush_hour_no_stopping';
  } else if (isCurrentlySweeping) {
    clearanceStatus = 'prohibited';
    primaryReason = 'Street sweeping in progress on this block. City tow trucks active.';
    zoneType = 'commercial_loading';
  } else if (isWithin12hRush || isSweepingWithin12Hours) {
    clearanceStatus = 'caution';
    primaryReason = 'Legal now, but rush-hour lane or street sweep begins within 12 hours. Do not leave overnight if parked on main corridor.';
    zoneType = 'metered_standard';
  } else if (hour >= 22 || hour < 9) {
    clearanceStatus = 'safe';
    primaryReason = 'Free overnight parking active on meters (10 PM - 9 AM) and residential permit streets.';
    zoneType = 'residential_permit_exempt';
  }

  const rulesSummary = [
    neighbourhood.residentialPermitRules.description,
    `Meters: Free overnight ${neighbourhood.meterRules.freeOvernightHours}. Daytime limit: ${neighbourhood.meterRules.maxTimeLimit}.`,
    `Sweeping: ${neighbourhood.sweepingSchedule.frequency} (${neighbourhood.sweepingSchedule.sweepHours}).`,
  ];

  return {
    latitude: 49.2827,
    longitude: -123.1207,
    nearestAddress: `${neighbourhood.name}, Vancouver, BC`,
    neighbourhood: neighbourhood.name,
    insideHomeZone: neighbourhood.insideHomeZone,
    clearanceStatus,
    primaryReason,
    zoneType,
    streetSweeping,
    rushHour,
    activeClosures: neighbourhood.activeAlerts,
    rulesSummary,
    lastEvaluatedAt: date.toISOString(),
  };
}

export function getOverallParkingStats(neighbourhoods: NeighbourhoodParkingProfile[] = NEIGHBOURHOODS) {
  const evaluated = neighbourhoods.map((n) => evaluateNeighbourhoodSpot(n));
  const safeCount = evaluated.filter((e) => e.clearanceStatus === 'safe').length;
  const cautionCount = evaluated.filter((e) => e.clearanceStatus === 'caution').length;
  const prohibitedCount = evaluated.filter((e) => e.clearanceStatus === 'prohibited').length;

  return {
    totalNeighbourhoods: neighbourhoods.length,
    safeCount,
    cautionCount,
    prohibitedCount,
    homeZoneCoveragePercent: 95,
  };
}
