export type WeatherCondition = 
  | 'sunny' 
  | 'mostly_sunny' 
  | 'partly_cloudy' 
  | 'overcast' 
  | 'fog' 
  | 'light_rain' 
  | 'moderate_rain' 
  | 'heavy_rain' 
  | 'thunderstorm' 
  | 'snow_flurries';

export type StationRegion = 'vancouver_core' | 'north_shore' | 'burnaby_east' | 'richmond_south';

export interface HourlyForecast {
  time: string;                  // e.g. "14:00"
  temperatureCelsius: number;
  precipitationMm: number;
  precipitationProbabilityPercent: number;
  condition: WeatherCondition;
}

export interface DailyForecast {
  date: string;                  // "2026-08-19"
  dayOfWeek: string;             // "Wednesday"
  tempHighCelsius: number;
  tempLowCelsius: number;
  totalPrecipitationMm: number;
  precipitationProbabilityPercent: number;
  condition: WeatherCondition;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherStation {
  id: string;                    // "kitsilano"
  name: string;                  // "Kitsilano Beach"
  shortName: string;             // "Kits Beach"
  region: StationRegion;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  current: {
    temperatureCelsius: number;
    feelsLikeCelsius: number;
    condition: WeatherCondition;
    humidityPercent: number;
    windSpeedKmh: number;
    windDirection: string;       // "SW", "WNW"
    windGustKmh?: number;
    pressureKpa: number;
    uvIndex: number;
    precipitation24hMm: number;
  };
  hourly: HourlyForecast[];      // Next 24 hours
  daily: DailyForecast[];        // 7-day forecast
  advisory?: {
    title: string;
    severity: 'warning' | 'watch' | 'statement';
    description: string;
    issuedAt: string;
  };
  officialStationCode?: string;  // e.g. "CWVR", "CWVF"
  lastUpdated: string;           // ISO 8601
}

export interface WeatherOverviewStats {
  avgTemperatureCelsius: number;
  maxTemperatureCelsius: number;
  minTemperatureCelsius: number;
  highestRainStation: string;
  activeAdvisoryCount: number;
}
