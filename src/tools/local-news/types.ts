export type NewsOutlet = 
  | 'cbc_vancouver' 
  | 'city_of_vancouver' 
  | 'metro_vancouver' 
  | 'eccc_weather' 
  | 'translink' 
  | 'emergency_info_bc';

export type NewsCategory = 
  | 'civic_politics' 
  | 'transit_infrastructure' 
  | 'weather_hazards' 
  | 'housing_development' 
  | 'parks_community';

export type AlertSeverity = 'critical' | 'warning' | 'advisory' | 'info';

export interface BreakingAlert {
  id: string;                      // "eccc-wind-warning-2026-08"
  title: string;                   // "Special Weather Statement: Coastal Gale Warning"
  source: NewsOutlet;
  outletName: string;              // "Environment Canada"
  severity: AlertSeverity;
  timestamp: string;               // ISO 8601
  summary: string;
  actionUrl?: string;
}

export interface NewsArticle {
  id: string;                      // "cbc-broadway-subway-update-2026"
  title: string;                   // "Broadway Subway Project Stations Enter Final Testing"
  summary: string;
  source: NewsOutlet;
  outletName: string;              // "CBC News"
  category: NewsCategory;
  publishedAt: string;             // ISO 8601
  url: string;                     // Direct canonical source URL
  isBreaking: boolean;
}
