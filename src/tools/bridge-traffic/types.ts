export type CrossingRegion = 'burrard_inlet' | 'false_creek' | 'fraser_river';

export type TrafficStatus = 'flowing' | 'moderate' | 'heavy' | 'closed';

export type CounterflowState = 'standard' | 'inbound_priority' | 'outbound_priority' | 'incident_hold' | 'not_applicable';

export interface DirectionalTraffic {
  directionName: string;          // "Northbound (To North Shore)" / "Southbound (To Downtown)"
  travelTimeMinutes: number;      // 18
  normalTimeMinutes: number;      // 7
  delayMinutes: number;           // 11
  averageSpeedKmh: number;        // 22
  status: TrafficStatus;
}

export interface CounterflowDetails {
  hasCounterflow: boolean;
  activeConfiguration: string;    // "2 Lanes Northbound, 1 Lane Southbound"
  state: CounterflowState;
  lastChangedTimestamp?: string;  // ISO 8601
}

export interface CrossingIncident {
  id: string;
  severity: 'minor' | 'major' | 'closure';
  description: string;            // "Stalled vehicle in center lane on Lions Gate Bridge"
  lanesAffected: string;          // "Center lane blocked"
  reportedTime: string;           // ISO 8601
}

export interface CrossingWebcam {
  name: string;
  imageUrl: string;
  viewLocation: string;
}

export interface BridgeCrossing {
  id: string;                     // "lions-gate", "ironworkers", "massey-tunnel"
  name: string;                   // "Lions Gate Bridge"
  shortName: string;              // "Lions Gate"
  highwayNumber?: string;         // "Hwy 99"
  coordinates: { lat: number; lng: number };
  region: CrossingRegion;
  directions: {
    primary: DirectionalTraffic;
    reverse: DirectionalTraffic;
  };
  counterflow: CounterflowDetails;
  activeIncidents: CrossingIncident[];
  webcams: CrossingWebcam[];
  officialSourceUrl: string;
  lastUpdated: string;            // ISO 8601
}
