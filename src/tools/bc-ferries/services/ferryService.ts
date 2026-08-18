import type { FerryRoute, RouteCategory, SeaBusLiveStatus, MarineWeatherStatus, WeatherRisk } from '../types';
import routesData from '../data/routes.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';

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
    const res = await edgeFetch<{ routes: any[] }>('https://bcferriesapi.ca/v2/capacity/', {
      timeoutMs: 1200,
    });

    if (res.data && Array.isArray(res.data.routes) && res.data.routes.length > 0) {
      const liveRoutes = res.data.routes;

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
              };
            });

          return {
            ...route,
            nextSailings: activeSailings.length > 0 ? activeSailings : route.nextSailings,
            isStale: false,
          };
        }

        return route;
      });
    }
  } catch (e) {}

  return BASELINE_ROUTES.map((r) => ({ ...r, isStale: true }));
}

export function getAllRoutes(): FerryRoute[] {
  return BASELINE_ROUTES;
}

export function getRouteById(id: string, list: FerryRoute[] = BASELINE_ROUTES): FerryRoute | undefined {
  return list.find((r) => r.id === id);
}

export function getRoutesByCategory(category: RouteCategory, list: FerryRoute[] = BASELINE_ROUTES): FerryRoute[] {
  if (category === 'all') return list;
  return list.filter((r) => r.category === category);
}

export function getSeaBusLiveStatus(): SeaBusLiveStatus {
  const now = new Date();
  const vancouverHour = (now.getUTCHours() - 7 + 24) % 24; // PDT (UTC-7)

  let headwayMinutes = 15;
  let peakStatus: 'peak_10min' | 'offpeak_15min' | 'night_30min' = 'offpeak_15min';

  if ((vancouverHour >= 7 && vancouverHour <= 9) || (vancouverHour >= 15 && vancouverHour <= 18)) {
    headwayMinutes = 10;
    peakStatus = 'peak_10min';
  } else if (vancouverHour >= 21 || vancouverHour < 6) {
    headwayMinutes = 30;
    peakStatus = 'night_30min';
  }

  return {
    headwayMinutes,
    peakStatus,
    activeVessels: ['Burrard Otter II', 'Burrard Chinook'],
    disruptions: [],
    nextWaterfrontDeparture: 'In 6 mins',
    nextLonsdaleDeparture: 'In 4 mins',
    crossingDurationMinutes: 12,
  };
}

export function getMarineWeatherStatus(): MarineWeatherStatus {
  return {
    region: 'Strait of Georgia - South of Nanaimo',
    windSpeedKnots: 12,
    windDirection: 'NW',
    waveHeightMeters: 0.6,
    waterTempC: 13.5,
    advisoryLevel: 'normal' as WeatherRisk,
    warningText: 'Strait of Georgia: Calm waters. Good sailing conditions.',
    lastUpdated: new Date().toISOString(),
  };
}

export const getMarineWeather = getMarineWeatherStatus;
