import type { FerryRoute, RouteCategory, SeaBusLiveStatus, MarineWeatherStatus } from '../types';
import routesData from '../data/routes.json';

export const ROUTES: FerryRoute[] = routesData as FerryRoute[];

export function getAllRoutes(): FerryRoute[] {
  return ROUTES;
}

export function getRouteById(id: string): FerryRoute | undefined {
  return ROUTES.find((r) => r.id === id);
}

export function getRoutesByCategory(category: RouteCategory): FerryRoute[] {
  if (category === 'all') return ROUTES;
  return ROUTES.filter((r) => r.category === category);
}

export function getSeaBusLiveStatus(): SeaBusLiveStatus {
  return {
    headwayMinutes: 10,
    peakStatus: 'peak_10min',
    activeVessels: ['Burrard Otter II', 'Burrard Chinook'],
    disruptions: [],
    nextWaterfrontDeparture: '13:45',
    nextLonsdaleDeparture: '13:45',
    crossingDurationMinutes: 12,
  };
}

export function getMarineWeather(): MarineWeatherStatus {
  return {
    region: 'Strait of Georgia - South of Nanaimo',
    windSpeedKnots: 12,
    windDirection: 'NW',
    waveHeightMeters: 0.6,
    waterTempC: 17.5,
    advisoryLevel: 'normal',
    warningText: 'Winds 10-15 knots. Good visibility.',
    lastUpdated: '2026-08-17T13:30:00Z',
  };
}

export function getFerryStats(routes: FerryRoute[] = ROUTES) {
  const vehicleRoutes = routes.filter((r) => r.category === 'vehicle');
  const activeNotices = routes.flatMap((r) => r.activeNotices);
  const nextDepartures = routes.flatMap((r) => r.nextSailings);
  const onTimeDepartures = nextDepartures.filter((s) => s.delayMinutes === 0 && !s.isCancelled);

  return {
    totalRoutes: routes.length,
    vehicleRoutesCount: vehicleRoutes.length,
    passengerRoutesCount: routes.filter((r) => r.category === 'passenger').length,
    localRoutesCount: routes.filter((r) => r.category === 'local').length,
    activeNoticesCount: activeNotices.length,
    onTimePercentage: nextDepartures.length > 0 ? Math.round((onTimeDepartures.length / nextDepartures.length) * 100) : 100,
  };
}
