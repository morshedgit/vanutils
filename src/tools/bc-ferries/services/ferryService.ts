import type { FerryRoute, RouteCategory, SeaBusLiveStatus, MarineWeatherStatus, WeatherRisk } from '../types';
import routesData from '../data/routes.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';
import { withEdgeCache } from '../../../services/shared/edgeCache';
import type { LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only — never presented as live telemetry. See issue #35.
export const BASELINE_ROUTES: FerryRoute[] = routesData as FerryRoute[];

const ROUTES_CACHE_TTL_SECONDS = 60; // ferry deck space/sailings change roughly every minute
const MARINE_CACHE_TTL_SECONDS = 900; // 15 min — marine conditions change slowly

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
 * Dynamically fetches live BC Ferries capacity at the edge.
 * Returns ok:false (no baseline masquerading as live) when the upstream fetch fails.
 */
export async function getLiveRoutes(): Promise<LiveResult<FerryRoute[]>> {
  return withEdgeCache<FerryRoute[]>('bc-ferries-routes', ROUTES_CACHE_TTL_SECONDS, async () => {
    const res = await edgeFetch<{ routes: any[] }>('https://bcferriesapi.ca/v2/capacity/', {
      timeoutMs: 1200,
    });

    if (!res.data || !Array.isArray(res.data.routes) || res.data.routes.length === 0) return null;

    const liveRoutes = res.data.routes;
    const liveMappedRoutes: FerryRoute[] = [];

    BASELINE_ROUTES.forEach((route) => {
      const matchingLive = liveRoutes.find((lr: any) => {
        const mappedId = routeCodeMap[lr.routeCode] || `${lr.fromTerminalCode}-${lr.toTerminalCode}`;
        return mappedId === route.id;
      });

      // No live entry for this route at all — we have no genuine live
      // reading, so it's excluded rather than shown with baseline sailings.
      if (!matchingLive) return;

      const activeSailings = (matchingLive.sailings || [])
        // A sailing without a real departure time or an assigned vessel
        // isn't actionable info — show it once BC Ferries actually
        // publishes it rather than inventing a placeholder for it.
        .filter((s: any) => s.sailingStatus !== 'past' && s.time && s.vesselName)
        .map((s: any) => {
          const fillPercent = typeof s.carFill === 'number' ? s.carFill : (typeof s.fill === 'number' ? s.fill : 0);
          const deckSpaceAvailable = Math.max(0, 100 - fillPercent);

          let standbyRisk: 'low' | 'moderate' | 'high' = 'low';
          if (deckSpaceAvailable < 15) standbyRisk = 'high';
          else if (deckSpaceAvailable <= 35) standbyRisk = 'moderate';

          return {
            departureTime: s.time,
            arrivalTime: s.arrivalTime || '',
            vesselName: s.vesselName,
            deckSpacePercent: deckSpaceAvailable,
            passengerSpaceAvailable: true,
            isCancelled: s.sailingStatus === 'cancelled',
            delayMinutes: 0,
            standbyRisk,
          };
        });

      // An empty result here is a legitimate live reading (no more sailings
      // scheduled today), not a failure — it must not fall back to baseline.
      liveMappedRoutes.push({ ...route, nextSailings: activeSailings });
    });

    return liveMappedRoutes.length > 0 ? liveMappedRoutes : null;
  });
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

/**
 * Projects the next SeaBus departures from TransLink's published fixed headway
 * schedule (10/15/30 min depending on time of day). This is NOT a real-time
 * vessel feed — TransLink's GTFS-realtime API requires an API key we don't
 * have — so it assumes on-time service and can't reflect an actual delay or
 * cancellation. isStale is always true to make that explicit.
 */
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
    isStale: true,
  };
}

function degreesToCompass(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
}

/**
 * Dynamically fetches live Strait of Georgia marine conditions at the edge.
 * Returns ok:false (no baseline masquerading as live) when the upstream fetch fails.
 */
export async function getMarineWeatherStatus(): Promise<LiveResult<MarineWeatherStatus>> {
  return withEdgeCache<MarineWeatherStatus>('bc-ferries-marine-weather', MARINE_CACHE_TTL_SECONDS, async () => {
    const lat = 49.05;
    const lng = -123.55;

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

    if (!marineCurrent || !windCurrent || typeof windCurrent.wind_speed_10m !== 'number' || typeof marineCurrent.wave_height !== 'number' || typeof marineCurrent.sea_surface_temperature !== 'number') {
      return null;
    }

    const windSpeedKnots = Math.round(windCurrent.wind_speed_10m);
    const windDirection = typeof windCurrent.wind_direction_10m === 'number'
      ? degreesToCompass(windCurrent.wind_direction_10m)
      : 'N';
    const waveHeightMeters = marineCurrent.wave_height;
    const waterTempC = marineCurrent.sea_surface_temperature;

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
      region: 'Strait of Georgia - South of Nanaimo',
      windSpeedKnots,
      windDirection,
      waveHeightMeters,
      waterTempC,
      advisoryLevel,
      warningText,
      lastUpdated: new Date().toISOString(),
    };
  });
}

export const getMarineWeather = getMarineWeatherStatus;
