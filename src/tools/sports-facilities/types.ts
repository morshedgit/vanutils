export type FacilityCategory = 
  | 'tennis_court'
  | 'pickleball_court'
  | 'swimming_pool'
  | 'ice_rink'
  | 'athletic_field'
  | 'fitness_centre';

export type FieldPlayability = 'open' | 'restricted' | 'closed_weather' | 'maintenance';
export type PoolSessionMode = 'length_swim' | 'public_swim' | 'aquafit' | 'lessons_closed' | 'closed';
export type RinkSessionMode = 'public_skate' | 'stick_and_puck' | 'adult_hockey' | 'figure_skating' | 'dry_floor_season' | 'closed';

export interface ActiveSessionInfo {
  currentMode: string;
  endsAt?: string;
  nextMode?: string;
  nextStartsAt?: string;
  isOpenNow: boolean;
}

export interface CourtSpecs {
  totalCourts: number;
  hasLights: boolean;
  lightsCurfewTime?: string; // e.g. "22:00"
  isDedicatedPickleball: boolean;
  surfaceType: string;
  hasPracticeWall: boolean;
}

export interface PoolSpecs {
  poolLengthMeters: number;
  isOutdoor: boolean;
  hasHotTub: boolean;
  hasSaunaOrSteam: boolean;
  hasDivingBoards: boolean;
  acceptsOneCard: boolean;
}

export interface SportsFacility {
  id: string;                      // "kitsilano-beach-tennis"
  name: string;                    // "Kitsilano Beach Tennis Courts"
  category: FacilityCategory;
  address: string;
  neighbourhood: string;
  latitude: number;
  longitude: number;
  phone?: string;
  session: ActiveSessionInfo;
  courtDetails?: CourtSpecs;
  poolDetails?: PoolSpecs;
  playabilityStatus?: FieldPlayability;
  officialScheduleUrl: string;
  lastUpdated: string;             // ISO 8601
  isStale: boolean;
}
