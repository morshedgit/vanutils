export type HealthRiskCategory = 'low' | 'moderate' | 'high' | 'very_high';

export type StationRegion = 'vancouver_core' | 'north_shore' | 'burrard_inland' | 'fraser_valley';

export interface PollutantReading {
  pollutantCode: 'PM25' | 'PM10' | 'O3' | 'NO2' | 'SO2';
  value: number;                  // e.g. 14.2
  unit: string;                   // "ug/m3" or "ppb"
  status: HealthRiskCategory;
}

export interface HistoricalReading {
  timestamp: string;              // ISO 8601
  pm25Value: number;
  aqhiValue: number;
}

export interface CleanAirFacility {
  id: string;
  name: string;                   // "Vancouver Public Library - Central Branch"
  address: string;
  facilityType: 'library' | 'community_centre' | 'civic_building';
  latitude: number;
  longitude: number;
  hasAirConditioning: boolean;
  hasHEPAFiltration: boolean;
  isOpenNow: boolean;
  hoursToday: string;             // "09:00 - 20:30"
  transitAccess: string;
}

export interface AirMonitoringStation {
  id: string;                     // "robson-square", "clark-drive", "kitsilano"
  name: string;                   // "Downtown Vancouver (Robson Square)"
  shortName: string;              // "Robson Square"
  region: StationRegion;
  latitude: number;
  longitude: number;
  currentAQHI: number;            // 1 to 10+
  currentPM25: number;            // in ug/m3
  riskCategory: HealthRiskCategory;
  primaryPollutant: string;       // "PM2.5"
  pollutants: PollutantReading[];
  historical24h: HistoricalReading[];
  healthAdvice: {
    generalPopulation: string;
    atRiskPopulation: string;
  };
  lastSampledTime: string;        // ISO 8601
  isStale: boolean;
}
