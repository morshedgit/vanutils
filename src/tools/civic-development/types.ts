export type ApplicationType = 'rezoning' | 'development_permit' | 'building_permit';

export type ApplicationStatus = 
  | 'under_review' 
  | 'open_house' 
  | 'public_hearing_scheduled' 
  | 'approved' 
  | 'refused' 
  | 'under_construction';

export interface UnitMix {
  marketRental: number;
  belowMarketRental: number;
  socialHousing: number;
  strataCondo: number;
  totalUnits: number;
}

export interface PublicHearingDetails {
  hearingDate?: string;          // ISO 8601
  councilMeetingUrl?: string;
  publicCommentDeadline?: string;// ISO 8601
  submitCommentUrl: string;
}

export interface DevelopmentProposal {
  id: string;                    // "RZ-2026-00018"
  type: ApplicationType;
  address: string;
  neighbourhood: string;
  latitude: number;
  longitude: number;
  storeys: number;
  heightMeters: number;
  proposedFSR: number;
  existingFSR?: number;
  units: UnitMix;
  commercialAreaSqFt: number;
  status: ApplicationStatus;
  statusDescription: string;
  publicHearing?: PublicHearingDetails;
  applicantName: string;
  architecturalDrawingsUrl: string;
  officialCityUrl: string;
  lastUpdated: string;           // ISO 8601
  isStale: boolean;
}
