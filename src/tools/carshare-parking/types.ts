export type ParkingClearanceStatus = 'safe' | 'caution' | 'prohibited';

export type ParkingZoneType =
  | 'residential_permit_exempt'
  | 'metered_standard'
  | 'rush_hour_no_stopping'
  | 'commercial_loading'
  | 'satellite_dedicated_lot'
  | 'outside_home_zone';

export type ParkingFilterCategory = 'all' | 'evo_homezone' | 'modo_stalls' | 'street_sweeping' | 'satellite_lots';

export interface StreetSweepingSchedule {
  nextSweepStart: string; // ISO 8601
  nextSweepEnd: string;   // ISO 8601
  frequency: string;      // e.g. "1st & 3rd Tuesday 07:00-11:00"
  isWithin24Hours: boolean;
  isWithin12Hours: boolean;
  isCurrentlyActive: boolean;
  seasonalLeafCleaningActive: boolean;
}

export interface RushHourRestriction {
  hasRestriction: boolean;
  restrictedCorridors: string[]; // e.g. ["West Georgia St", "Burrard St"]
  restrictedHoursText: string;   // "07:00-09:30 & 15:00-18:00 Mon-Fri"
  isCurrentlyActive: boolean;
  isWithin12Hours: boolean;
}

export interface ParkingSpotEvaluation {
  latitude: number;
  longitude: number;
  nearestAddress: string;
  neighbourhood: string;
  insideHomeZone: boolean;
  clearanceStatus: ParkingClearanceStatus;
  primaryReason: string;
  zoneType: ParkingZoneType;
  streetSweeping: StreetSweepingSchedule;
  rushHour: RushHourRestriction;
  activeClosures: string[];
  rulesSummary: string[];
  lastEvaluatedAt: string; // ISO 8601
}

export interface SatelliteLot {
  id: string;
  name: string;
  shortName: string;
  locationName: string;
  category: 'airport' | 'university' | 'mountain' | 'ferry';
  latitude: number;
  longitude: number;
  totalStalls: number;
  accessInstructions: string;
  feeDetails: string;
  operatingHours: string;
  evChargingAvailable: boolean;
  directionsUrl: string;
}

export interface NeighbourhoodParkingProfile {
  id: string;
  name: string;
  slug: string;
  municipality: string;
  insideHomeZone: boolean;
  residentialPermitRules: {
    evoExempt: boolean;
    modoExempt: boolean;
    permitZoneCode: string;
    description: string;
  };
  meterRules: {
    freeOvernightHours: string; // "22:00 - 09:00"
    daytimeRateRange: string;   // "$2.00 - $6.50/hr"
    maxTimeLimit: string;       // "2 hours"
  };
  sweepingSchedule: {
    frequency: string;
    sweepDays: string;
    sweepHours: string;
    seasonalLeafCleaning: boolean;
  };
  rushHourLanes: {
    corridors: string[];
    hoursText: string;
  };
  activeAlerts: string[];
  satelliteLotsNearby: string[]; // SatelliteLot IDs
  popularDestinations: string[];
}
