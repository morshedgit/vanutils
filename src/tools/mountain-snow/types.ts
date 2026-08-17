export type PrecipitationType = 'snow' | 'wet_snow' | 'rain' | 'mixed' | 'clear' | 'fog';

export type RoadConditionStatus = 'bare_dry' | 'bare_wet' | 'compact_snow' | 'slush' | 'ice' | 'chains_required';

export type AvalancheDanger = 'low' | 'moderate' | 'considerable' | 'high' | 'extreme' | 'no_rating';

export type MountainRegion = 'all' | 'north_shore' | 'sea_to_sky';

export interface ElevationPoint {
  label: string;             // "Base", "Mid-Mountain", "Peak"
  elevationMeters: number;   // e.g. 910
  temperatureCelsius: number;// e.g. -2.5
  precipitation: PrecipitationType;
}

export interface SnowfallReport {
  last12HoursCm: number;
  last24HoursCm: number;
  last48HoursCm: number;
  last7DaysCm: number;
  baseDepthCm: number;
  openLifts: number;
  totalLifts: number;
  openRuns: number;
  totalRuns: number;
}

export interface RoadStatus {
  roadName: string;          // "Cypress Bowl Road"
  surfaceCondition: RoadConditionStatus;
  winterTiresMandatory: boolean;
  chainsEnforced: boolean;
  temperatureCelsius: number;
  lastReported: string;      // ISO 8601
}

export interface MountainWebcam {
  id: string;
  name: string;
  imageUrl: string;
  elevationMeters: number;
  description?: string;
}

export interface MountainResort {
  id: string;                // "cypress", "grouse", "seymour", "whistler"
  name: string;              // "Cypress Mountain"
  shortName: string;         // "Cypress (1,440m)"
  region: 'north_shore' | 'sea_to_sky';
  currentFreezingLevelMeters: number;
  elevationBands: ElevationPoint[];
  snowfall: SnowfallReport;
  accessRoad: RoadStatus;
  avalancheRating: {
    alpine: AvalancheDanger;
    treeline: AvalancheDanger;
    belowTreeline: AvalancheDanger;
    bulletinUrl: string;
  };
  webcams: MountainWebcam[];
  officialSourceUrl: string;
  lastUpdated: string;       // ISO 8601
}
