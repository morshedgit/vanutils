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
  const vancouverTimeString = now.toLocaleString('en-US', { timeZone: 'America/Vancouver' });
  const vancouverDate = new Date(vancouverTimeString);
  const vancouverHour = vancouverDate.getHours();
  const vancouverMinute = vancouverDate.getMinutes();

  let headwayMinutes = 15;
  let peakStatus: 'peak_10min' | 'offpeak_15min' | 'night_30min' = 'offpeak_15min';

  if ((vancouverHour >= 7 && vancouverHour <= 9) || (vancouverHour >= 15 && vancouverHour <= 18)) {
    headwayMinutes = 10;
    peakStatus = 'peak_10min';
  } else if (vancouverHour >= 21 || vancouverHour < 6) {
    headwayMinutes = 30;
    peakStatus = 'night_30min';
  }

  const minsUntilNextWaterfront = headwayMinutes - (vancouverMinute % headwayMinutes);
  const nextWaterfrontDeparture = minsUntilNextWaterfront === headwayMinutes
    ? 'Departing now'
    : `In ${minsUntilNextWaterfront} min${minsUntilNextWaterfront > 1 ? 's' : ''}`;

  const lonsdaleMins = ((vancouverMinute + Math.floor(headwayMinutes / 2)) % headwayMinutes);
  const minsUntilNextLonsdale = headwayMinutes - lonsdaleMins;
  const nextLonsdaleDeparture = minsUntilNextLonsdale === headwayMinutes
    ? 'Departing now'
    : `In ${minsUntilNextLonsdale} min${minsUntilNextLonsdale > 1 ? 's' : ''}`;

  return {
    headwayMinutes,
    peakStatus,
    activeVessels: ['Burrard Otter II', 'Burrard Chinook'],
    disruptions: [],
    nextWaterfrontDeparture,
    nextLonsdaleDeparture,
    crossingDurationMinutes: 12,
  };
}

const BASELINE_MARINE_WEATHER: Omit<MarineWeatherStatus, 'isStale'> = {
  region: 'Strait of Georgia - South of Nanaimo',
  windSpeedKnots: 12,
  windDirection: 'NW',
  waveHeightMeters: 0.6,
  waterTempC: 14.5,
  advisoryLevel: 'normal' as WeatherRisk,
  warningText: 'Strait of Georgia: Calm waters. Good sailing conditions.',
  lastUpdated: '2026-08-25T12:00:00.000Z',
};

function degreesToCompass(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
}

/**
 * Dynamically fetches live Strait of Georgia marine conditions at the edge with fallback to baseline
 */
export async function getMarineWeatherStatus(): Promise<MarineWeatherStatus> {
  const lat = 49.05;
  const lng = -123.55;

  try {
    const [marineRes, windRes] = await Promise.all([
      edgeFetch<{ current: Record<string, any> }>(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,sea_surface_temperature&timezone=America%2FVancouver`,
        { timeoutMs: 1200 }
      ),
      edgeFetch<{ current: Record<string, any> }>(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&timezone=America%2FVancouver`,
        { timeoutMs: 1200 }
      ),
    ]);

    const marineCurrent = marineRes.data?.current;
    const windCurrent = windRes.data?.current;

    if (marineCurrent && windCurrent && typeof windCurrent.wind_speed_10m === 'number') {
      const windSpeedKnots = Math.round(windCurrent.wind_speed_10m);
      const windDirection = typeof windCurrent.wind_direction_10m === 'number'
        ? degreesToCompass(windCurrent.wind_direction_10m)
        : BASELINE_MARINE_WEATHER.windDirection;
      const waveHeightMeters = typeof marineCurrent.wave_height === 'number'
        ? marineCurrent.wave_height
        : BASELINE_MARINE_WEATHER.waveHeightMeters;
      const waterTempC = typeof marineCurrent.sea_surface_temperature === 'number'
        ? marineCurrent.sea_surface_temperature
        : BASELINE_MARINE_WEATHER.waterTempC;

      let advisoryLevel: WeatherRisk = 'normal';
      let warningText = 'Strait of Georgia: Calm waters. Good sailing conditions.';
      if (windSpeedKnots > 25) {
        advisoryLevel = 'high_wind_warning';
        warningText = `Strait of Georgia: High Wind Warning. Winds at ${windSpeedKnots} kts. Expect fast ferry cancellations.`;
      } else if (windSpeedKnots >= 15) {
        advisoryLevel = 'caution';
        warningText = `Strait of Georgia: Choppy seas. Winds at ${windSpeedKnots} kts. Minor crossing delays possible.`;
      }

      return {
        region: BASELINE_MARINE_WEATHER.region,
        windSpeedKnots,
        windDirection,
        waveHeightMeters,
        waterTempC,
        advisoryLevel,
        warningText,
        lastUpdated: new Date().toISOString(),
        isStale: false,
      };
    }
  } catch (e) {}

  return { ...BASELINE_MARINE_WEATHER, isStale: true };
}

export const getMarineWeather = getMarineWeatherStatus;
