export type FacilityType = 'emergency_department' | 'urgent_primary_care_centre' | 'pediatric_emergency';

export type HealthAuthority = 'vancouver_coastal_health' | 'fraser_health' | 'provincial_health_services';

export type WaitIntensity = 'low' | 'moderate' | 'high' | 'unavailable';

export type HealthFilterCategory = 'all' | 'emergency_department' | 'urgent_primary_care_centre' | 'pediatric';

export interface TriageWaitData {
  waitTimeMinutes: number;         // e.g. 105 (1h 45m)
  patientCountWaiting?: number;    // e.g. 18
  patientCountTreating?: number;   // e.g. 34
  intensity: WaitIntensity;
  lastUpdated: string;             // ISO 8601
  isStale: boolean;
}

export interface OperatingHours {
  isOpen24_7: boolean;
  openTime?: string;               // "08:00"
  closeTime?: string;              // "20:00"
  isCurrentlyOpen: boolean;
  acceptingWalkIns: boolean;
  notes?: string;
}

export interface HealthcareFacility {
  id: string;                      // "vgh", "st-pauls", "city-centre-upcc"
  name: string;                    // "Vancouver General Hospital"
  shortName: string;               // "VGH (Vancouver General)"
  facilityType: FacilityType;
  healthAuthority: HealthAuthority;
  address: string;
  municipality: 'Vancouver' | 'North Vancouver' | 'Richmond' | 'Burnaby' | 'New Westminster' | 'Surrey' | 'Port Moody' | 'Delta';
  latitude: number;
  longitude: number;
  phone: string;
  triageData?: TriageWaitData;     // Real-time live wait metrics
  hours: OperatingHours;
  servicesAvailable: string[];     // ["X-ray", "CT Scan", "Lab", "Pharmacy"]
  pediatricSpecialty: boolean;
  transitAccess: string;
  parkingInfo: string;
  officialPortalUrl: string;
}
