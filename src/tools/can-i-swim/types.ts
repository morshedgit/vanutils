export type WaterQualityStatus = 'safe' | 'caution' | 'advisory' | 'unmonitored';

export type Municipality =
  | 'Vancouver'
  | 'West Vancouver'
  | 'North Vancouver'
  | 'Burnaby'
  | 'Richmond'
  | 'Belcarra'
  | 'White Rock'
  | 'Bowen Island'
  | 'Lions Bay';

export type WaterType = 'ocean' | 'freshwater_lake';

export interface SamplingRecord {
  date: string; // ISO 8601 YYYY-MM-DD
  eColiCount: number; // 30-day geometric mean per 100mL
  singleSampleCount?: number; // Latest individual sample per 100mL
  status: WaterQualityStatus;
  notes?: string;
}

export interface Beach {
  id: string; // e.g. "kitsilano-beach"
  name: string;
  municipality: Municipality;
  waterType: WaterType;
  latitude: number;
  longitude: number;
  dogFriendly: boolean;
  lifeguards: boolean;
  washrooms: boolean;
  wheelchairAccessible: boolean;
  currentStatus: WaterQualityStatus;
  advisoryReason?: string;
  latestSample: SamplingRecord;
  // False when this beach had no matching feature in the live VCH/Metro
  // Vancouver GIS response — currentStatus/latestSample are the last-known
  // seed values, not a fresh reading. Undefined on baseline-only lookups
  // (metadata paths that never call getLiveBeaches). See issue #35.
  isLive?: boolean;
  officialSourceUrl: string;
  description: string;
  bestFor: string[];
  parkingInfo: string;
  transitInfo: string;
  waterTempC?: number;
}

export interface BeachFilterOptions {
  query?: string;
  municipality?: string;
  waterType?: string;
  status?: string;
  dogFriendly?: boolean;
  lifeguards?: boolean;
  wheelchairAccessible?: boolean;
  washrooms?: boolean;
  sortBy?: 'distance' | 'name' | 'eColi' | 'cleanest';
  userLat?: number;
  userLng?: number;
}
