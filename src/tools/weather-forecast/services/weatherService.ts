import type { WeatherStation, WeatherOverviewStats, WeatherCondition, StationRegion } from '../types';
import stationsData from '../data/stations.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';
import { withEdgeCache } from '../../../services/shared/edgeCache';
import type { LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only — never presented as live telemetry. See issue #35.
export const BASELINE_STATIONS: WeatherStation[] = stationsData as WeatherStation[];

const CACHE_TTL_SECONDS = 300; // 5 minutes

function mapWmoCodeToCondition(code: number): WeatherCondition {
  if (code === 0) return 'sunny';
  if (code === 1) return 'mostly_sunny';
  if (code === 2) return 'partly_cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 55) return 'light_rain';
  if (code >= 61 && code <= 63) return 'moderate_rain';
  if (code >= 65 && code <= 67) return 'heavy_rain';
  if (code >= 71 && code <= 77) return 'snow_flurries';
  if (code >= 80 && code <= 82) return 'light_rain';
  if (code >= 95) return 'thunderstorm';
  return 'partly_cloudy';
}

/**
 * Dynamically fetches live microclimate weather telemetry at the edge.
 * Returns ok:false (no baseline masquerading as live) when the upstream fetch fails.
 */
export async function getLiveWeather(): Promise<LiveResult<WeatherStation[]>> {
  return withEdgeCache<WeatherStation[]>('weather-forecast-stations', CACHE_TTL_SECONDS, async () => {
    // Parallel queries to Open-Meteo HRDPS Canadian Model
    const fetchPromises = BASELINE_STATIONS.map(async (st): Promise<WeatherStation | null> => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${st.latitude}&longitude=${st.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=America%2FVancouver&forecast_days=7`;

      const res = await edgeFetch<any>(url, { timeoutMs: 1200 });

      if (res.data && res.data.current) {
        const curr = res.data.current;
        const hourlyData = res.data.hourly || {};
        const dailyData = res.data.daily || {};

        // Parse Next 8 hours
        const hourly: any[] = [];
        const times: string[] = hourlyData.time || [];
        const temps: number[] = hourlyData.temperature_2m || [];
        const precips: number[] = hourlyData.precipitation || [];
        const probs: number[] = hourlyData.precipitation_probability || [];
        const codes: number[] = hourlyData.weather_code || [];

        const nowHourIndex = Math.max(0, times.findIndex((t) => new Date(t) >= new Date()) || 0);

        for (let i = nowHourIndex; i < Math.min(nowHourIndex + 8, times.length); i++) {
          const tDate = new Date(times[i]);
          const hourStr = tDate.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Vancouver' });
          hourly.push({
            time: hourStr,
            temperatureCelsius: Math.round((temps[i] || 0) * 10) / 10,
            precipitationMm: precips[i] || 0,
            precipitationProbabilityPercent: probs[i] || 0,
            condition: mapWmoCodeToCondition(codes[i] || 0),
          });
        }

        // Parse Daily Forecast
        const daily: any[] = [];
        const dDates: string[] = dailyData.time || [];
        const dMax: number[] = dailyData.temperature_2m_max || [];
        const dMin: number[] = dailyData.temperature_2m_min || [];
        const dPrecip: number[] = dailyData.precipitation_sum || [];
        const dProbs: number[] = dailyData.precipitation_probability_max || [];
        const dCodes: number[] = dailyData.weather_code || [];
        const dUv: number[] = dailyData.uv_index_max || [];
        const dSunrise: string[] = dailyData.sunrise || [];
        const dSunset: string[] = dailyData.sunset || [];

        for (let i = 0; i < Math.min(5, dDates.length); i++) {
          const dObj = new Date(dDates[i] + 'T12:00:00Z');
          const dayOfWeek = dObj.toLocaleDateString('en-CA', { weekday: 'long' });
          daily.push({
            date: dDates[i],
            dayOfWeek,
            tempHighCelsius: Math.round(dMax[i] || 0),
            tempLowCelsius: Math.round(dMin[i] || 0),
            totalPrecipitationMm: Math.round((dPrecip[i] || 0) * 10) / 10,
            precipitationProbabilityPercent: dProbs[i] || 0,
            condition: mapWmoCodeToCondition(dCodes[i] || 0),
            uvIndexMax: Math.round(dUv[i] || 0),
            sunrise: dSunrise[i] ? dSunrise[i].split('T')[1]?.slice(0, 5) : '06:15',
            sunset: dSunset[i] ? dSunset[i].split('T')[1]?.slice(0, 5) : '20:20',
          });
        }

        const windDirDeg = curr.wind_direction_10m || 0;
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const windDirection = directions[Math.round(windDirDeg / 22.5) % 16];

        return {
          ...st,
          current: {
            temperatureCelsius: Math.round((curr.temperature_2m || 0) * 10) / 10,
            feelsLikeCelsius: Math.round((curr.apparent_temperature || curr.temperature_2m || 0) * 10) / 10,
            condition: mapWmoCodeToCondition(curr.weather_code || 0),
            humidityPercent: Math.round(curr.relative_humidity_2m || 60),
            windSpeedKmh: Math.round(curr.wind_speed_10m || 0),
            windDirection,
            windGustKmh: Math.round(curr.wind_gusts_10m || curr.wind_speed_10m || 0),
            pressureKpa: Math.round(((curr.surface_pressure || 1013) / 10) * 10) / 10,
            uvIndex: Math.round(curr.uv_index || 5),
            precipitation24hMm: Math.round((curr.precipitation || 0) * 10) / 10,
          },
          hourly,
          daily,
          lastUpdated: new Date().toISOString(),
        };
      }

      // No genuine live reading for this station — omitted rather than
      // falling back to a baseline snapshot dressed up as current.
      return null;
    });

    const liveStations = (await Promise.all(fetchPromises)).filter((s): s is WeatherStation => s !== null);
    return liveStations.length > 0 ? liveStations : null;
  });
}

export function getAllStations(): WeatherStation[] {
  return BASELINE_STATIONS;
}

export function getStationById(id: string, list: WeatherStation[] = BASELINE_STATIONS): WeatherStation | undefined {
  return list.find((s) => s.id.toLowerCase() === id.toLowerCase());
}

export function getStationsByRegion(region: StationRegion | 'all', list: WeatherStation[] = BASELINE_STATIONS): WeatherStation[] {
  if (region === 'all') return list;
  return list.filter((s) => s.region === region);
}

export function getWeatherConditionMeta(condition: WeatherCondition) {
  switch (condition) {
    case 'sunny':
      return { label: 'Sunny & Clear', icon: '☀️', badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
    case 'mostly_sunny':
      return { label: 'Mostly Sunny', icon: '🌤️', badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
    case 'partly_cloudy':
      return { label: 'Partly Cloudy', icon: '⛅', badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' };
    case 'overcast':
      return { label: 'Overcast Cloud', icon: '☁️', badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' };
    case 'fog':
      return { label: 'Coastal Fog', icon: '🌫️', badgeBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30' };
    case 'light_rain':
      return { label: 'Light Showers', icon: '🌦️', badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' };
    case 'moderate_rain':
      return { label: 'Rain', icon: '🌧️', badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' };
    case 'heavy_rain':
      return { label: 'Heavy Rain / Downpour', icon: '🌧️', badgeBg: 'bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-600/30' };
    case 'thunderstorm':
      return { label: 'Thunderstorm', icon: '⛈️', badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' };
    case 'snow_flurries':
      return { label: 'Snow / Flurries', icon: '🌨️', badgeBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30' };
    default:
      return { label: 'Fair', icon: '🌤️', badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' };
  }
}

export function getWeatherOverviewStats(stations: WeatherStation[] = BASELINE_STATIONS): WeatherOverviewStats {
  const temps = stations.map((s) => s.current.temperatureCelsius);
  const avgTemp = Math.round((temps.reduce((acc, t) => acc + t, 0) / stations.length) * 10) / 10;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);

  const sortedByRain = [...stations].sort((a, b) => b.current.precipitation24hMm - a.current.precipitation24hMm);
  const highestRainStation = sortedByRain[0] ? `${sortedByRain[0].shortName} (${sortedByRain[0].current.precipitation24hMm}mm)` : 'None';

  const activeAdvisories = stations.filter((s) => s.advisory).length;

  return {
    avgTemperatureCelsius: avgTemp,
    maxTemperatureCelsius: maxTemp,
    minTemperatureCelsius: minTemp,
    highestRainStation,
    activeAdvisoryCount: activeAdvisories,
  };
}
