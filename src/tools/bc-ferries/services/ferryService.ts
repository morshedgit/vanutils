import type { FerryRoute, RouteCategory, SeaBusLiveStatus, MarineWeatherStatus } from '../types';
import routesData from '../data/routes.json';

export const BASELINE_ROUTES: FerryRoute[] = routesData as FerryRoute[];

const routeCodeMap: Record<string, string> = {
  TSASWB: 'TSA-SWB',
  HSBNAN: 'HSB-NAN',
  HSBLNG: 'HSB-LNG',
  TSADUK: 'TSA-DUK',
  HSBBOW: 'HSB-BOW',
  TSASGI: 'TSA-SGI',
  SWBTSA: 'SWB-TSA',
  NANHSB: 'NAN-HSB',
  LNGHSB: 'LNG-HSB',
  DUKTSA: 'DUK-TSA',
};

/**
 * Dynamically fetches live BC Ferries capacity at the edge with fallback to baseline
 */
export async function getLiveRoutes(): Promise<FerryRoute[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s fast edge timeout

    const res = await fetch('https://bcferriesapi.ca/v2/capacity/', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const liveRoutes = data.routes || [];

      return BASELINE_ROUTES.map((route) => {
        const matchingLive = liveRoutes.find((lr: any) => {
          const mappedId = routeCodeMap[lr.routeCode] || `${lr.fromTerminalCode}-${lr.toTerminalCode}`;
          return mappedId === route.id;
        });

        if (matchingLive && matchingLive.sailings && matchingLive.sailings.length > 0) {
          const activeSailings = matchingLive.sailings
            .filter((s: any) => s.sailingStatus !== 'past')
            .map((s: any) => {
              const fillPercent = typeof s.carFill === 'number' ? s.carFill : (typeof s.fill === 'number' ? s.fill : 0);
              const deckSpaceAvailable = Math.max(0, 100 - fillPercent);

              let standbyRisk: 'low' | 'moderate' | 'high' = 'low';
              if (deckSpaceAvailable < 15) standbyRisk = 'high';
              else if (deckSpaceAvailable <= 35) standbyRisk = 'moderate';

              return {
                departureTime: s.time,
                arrivalTime: s.arrivalTime || '',
                vesselName: s.vesselName || 'Scheduled Vessel',
                deckSpacePercent: deckSpaceAvailable,
                passengerSpaceAvailable: true,
                isCancelled: s.sailingStatus === 'cancelled',
                delayMinutes: 0,
                standbyRisk,
                weatherRisk: 'normal' as const,
                statusText: s.sailingStatus === 'cancelled' ? 'Cancelled' : `${deckSpaceAvailable}% Space Available`,
              };
            });

          if (activeSailings.length > 0) {
            return {
              ...route,
              nextSailings: activeSailings,
              lastUpdated: new Date().toISOString(),
              isStale: false,
            };
          }
        }

        return route;
      });
    }
  } catch (e) {
    // Fallback to verified baseline snapshot
  }

  return BASELINE_ROUTES;
}

export function getAllRoutes(): FerryRoute[] {
  return BASELINE_ROUTES;
}

export function getRouteById(id: string, routes: FerryRoute[] = BASELINE_ROUTES): FerryRoute | undefined {
  return routes.find((r) => r.id === id);
}

export function getRoutesByCategory(category: RouteCategory, routes: FerryRoute[] = BASELINE_ROUTES): FerryRoute[] {
  if (category === 'all') return routes;
  return routes.filter((r) => r.category === category);
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
    lastUpdated: new Date().toISOString(),
  };
}

export function getFerryStats(routes: FerryRoute[] = BASELINE_ROUTES) {
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
