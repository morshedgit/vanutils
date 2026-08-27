export type FerryProvider = 'bc-ferries' | 'hullo' | 'translink' | 'water-taxi' | 'moti';

export type VesselType = 'vehicle_and_passenger' | 'passenger_only' | 'cable_barge';

export type StandbyRiskLevel = 'low' | 'moderate' | 'high' | 'full' | 'not_applicable';

export type WeatherRisk = 'normal' | 'caution' | 'high_wind_warning';

export type RouteCategory = 'all' | 'vehicle' | 'passenger' | 'local';

export interface Sailing {
  departureTime: string;          // e.g. "15:00"
  estimatedDepartureTime?: string;
  arrivalTime: string;            // e.g. "16:35"
  vesselName: string;             // e.g. "Spirit of British Columbia" / "Hullo Spindle Whorl"
  deckSpacePercent?: number;      // 0-100 (for vehicle ferries)
  passengerSpaceAvailable: boolean;
  isCancelled: boolean;
  delayMinutes: number;
  standbyRisk: StandbyRiskLevel;
  weatherRisk?: WeatherRisk;
  statusText?: string;
}

export interface HighwayCamera {
  id: string;
  name: string;
  imageUrl: string;
  highwayName: string;
  location: string;
  orientation?: string;
}

export interface FerryRoute {
  id: string;                     // "TSA-SWB", "HULLO-VAN-NAN", "TL-SEABUS", etc.
  provider: FerryProvider;
  category: RouteCategory;
  name: string;                   // "Tsawwassen to Swartz Bay"
  shortName: string;              // "TSA ➔ SWB (Victoria)"
  originTerminal: string;
  destinationTerminal: string;
  vesselType: VesselType;
  crossingDurationMinutes: number;
  nextSailings: Sailing[];
  activeNotices: string[];
  highwayCameras: HighwayCamera[];
  lastUpdated: string;            // ISO 8601
  reverseRouteId?: string;
  fareNote?: string;
  frequencyText?: string;
}

export interface SeaBusLiveStatus {
  headwayMinutes: number;         // e.g. 10 or 15
  peakStatus: 'peak_10min' | 'offpeak_15min' | 'night_30min';
  activeVessels: string[];        // ["Burrard Otter II", "Burrard Chinook"]
  disruptions: string[];
  nextWaterfrontDeparture: string;
  nextLonsdaleDeparture: string;
  crossingDurationMinutes: number;
  isStale: boolean;               // true when derived from the published headway
                                   // schedule rather than a real-time vessel feed
                                   // (TransLink's GTFS-realtime API requires a key
                                   // we don't have) — always true today
}

export interface MarineWeatherStatus {
  region: string;                 // "Strait of Georgia - South of Nanaimo"
  windSpeedKnots: number;
  windDirection: string;
  waveHeightMeters: number;
  waterTempC: number;
  advisoryLevel: WeatherRisk;
  warningText?: string;
  lastUpdated: string;
}
