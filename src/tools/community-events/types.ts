export type EventCategory = 
  | 'street_festival' 
  | 'park_outdoor' 
  | 'library_talk' 
  | 'farmers_market' 
  | 'community_arts';

export interface TransitAccessInfo {
  nearestSkyTrainStation?: string; // e.g. "Main Street-Science World"
  busRoutes: string[];             // ["#99 B-Line", "#9", "#4"]
  mobiBikeStationNearby: boolean;
}

export interface CommunityEvent {
  id: string;                      // "khatsahlano-street-party-2026"
  title: string;                   // "Khatsahlano Street Party"
  shortDescription: string;
  category: EventCategory;
  organization: string;            // "Kitsilano 4th Avenue BIA"
  venueName: string;               // "West 4th Avenue (Burrard to Macdonald)"
  address: string;
  neighbourhood: string;
  latitude: number;
  longitude: number;
  startDateTime: string;           // ISO 8601
  endDateTime: string;             // ISO 8601
  isFreeAdmission: boolean;
  isAllAges: boolean;
  isOutdoor: boolean;
  rainOrShine: boolean;
  transitAccess: TransitAccessInfo;
  officialSourceUrl: string;
  lastUpdated: string;             // ISO 8601
}
