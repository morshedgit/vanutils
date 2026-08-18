export type SchoolCategory = 'elementary' | 'elementary_annex' | 'secondary';
export type ProgramTrack = 'english_regular' | 'early_french_immersion' | 'late_french_immersion' | 'montessori' | 'ib';

export interface SchoolInfo {
  id: string;                     // "general-gordon-elementary"
  name: string;                   // "General Gordon Elementary"
  category: SchoolCategory;
  gradeSpan: string;              // "K-7"
  address: string;
  neighbourhood: string;
  latitude: number;
  longitude: number;
  phone: string;
  feederSecondary?: string;       // e.g. "Kitsilano Secondary"
  feederElementary?: string;      // for annexes
  programs: ProgramTrack[];
  websiteUrl: string;
  lastUpdated: string;
  isStale: boolean;
}

export interface CatchmentLookupResult {
  queriedAddress: string;
  latitude: number;
  longitude: number;
  elementary: SchoolInfo;
  annex?: SchoolInfo;
  secondary: SchoolInfo;
  frenchImmersionEarly?: SchoolInfo;
  frenchImmersionLate?: SchoolInfo;
}

export interface ChildcareInspection {
  inspectionDate: string;         // ISO 8601
  status: 'compliant' | 'infractions_remedied' | 'follow_up_required';
  summary: string;
  reportUrl: string;
}

export interface LicensedChildcareCenter {
  id: string;                     // "kitsilano-daycare-centre"
  name: string;                   // "Kitsilano Daycare Centre"
  facilityType: 'infant_toddler' | 'group_3_5' | 'school_age' | 'preschool';
  address: string;
  neighbourhood: string;
  latitude: number;
  longitude: number;
  licensedCapacity: number;
  phone: string;
  lastInspection: ChildcareInspection;
  officialSourceUrl: string;
}
