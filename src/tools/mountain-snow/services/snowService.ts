import type {
  MountainResort,
  MountainRegion,
  PrecipitationType,
  RoadConditionStatus,
  AvalancheDanger,
} from '../types';
import mountainsData from '../data/mountains.json';

export const BASELINE_MOUNTAINS: MountainResort[] = mountainsData as MountainResort[];

const mountainLocations = [
  {
    id: 'cypress',
    lat: 49.396,
    lng: -123.204,
    bands: [
      { label: 'Base (Downhill Lodge)', elevationMeters: 910 },
      { label: 'Mid-Mountain', elevationMeters: 1100 },
      { label: 'Mt. Strachan Summit', elevationMeters: 1440 },
    ],
  },
  {
    id: 'grouse',
    lat: 49.379,
    lng: -123.083,
    bands: [
      { label: 'Valley / Skyride Base', elevationMeters: 274 },
      { label: 'Chalet Plateau', elevationMeters: 1128 },
      { label: 'The Peak', elevationMeters: 1250 },
    ],
  },
  {
    id: 'seymour',
    lat: 49.367,
    lng: -122.949,
    bands: [
      { label: 'Base Area', elevationMeters: 930 },
      { label: 'Mystery Peak', elevationMeters: 1230 },
      { label: 'Mt. Seymour Summit', elevationMeters: 1449 },
    ],
  },
  {
    id: 'whistler',
    lat: 50.116,
    lng: -122.957,
    bands: [
      { label: 'Whistler Village', elevationMeters: 675 },
      { label: 'Mid-Mountain (Roundhouse)', elevationMeters: 1850 },
      { label: 'Whistler Peak', elevationMeters: 2284 },
    ],
  },
];

/**
 * Dynamically fetches live mountain atmospheric soundings at the edge
 */
export async function getLiveMountains(): Promise<MountainResort[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s fast edge timeout

    const updated = await Promise.all(
      BASELINE_MOUNTAINS.map(async (mountain) => {
        const loc = mountainLocations.find((l) => l.id === mountain.id);
        if (!loc) return mountain;

        const topElevation = loc.bands[loc.bands.length - 1].elevationMeters;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&elevation=${topElevation}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,freezing_level_height,snowfall&daily=snowfall_sum&timezone=America/Vancouver`;

        try {
          const res = await fetch(url, { signal: controller.signal });
          if (res.ok) {
            const data = await res.json();
            const current = data.current;
            const daily = data.daily;

            const freezingLevel = Math.round(current.freezing_level_height || 3500);
            const peakTemp = current.temperature_2m;
            const fresh24h = (daily && daily.snowfall_sum && daily.snowfall_sum[0]) ? Math.round(daily.snowfall_sum[0]) : (current.snowfall ? Math.round(current.snowfall) : 0);

            const elevationBands = loc.bands.map((b) => {
              const diffFromTopMeters = topElevation - b.elevationMeters;
              const bandTemp = parseFloat((peakTemp + (diffFromTopMeters * 0.0065)).toFixed(1));
              
              let precip: PrecipitationType = 'clear';
              if (current.precipitation > 0) {
                if (bandTemp <= -1.5) precip = 'snow';
                else if (bandTemp <= 1.5) precip = 'wet_snow';
                else precip = 'rain';
              } else if (current.weather_code >= 1 && current.weather_code <= 3) {
                precip = 'clear';
              } else if (current.weather_code >= 45 && current.weather_code <= 48) {
                precip = 'fog';
              }

              return {
                label: b.label,
                elevationMeters: b.elevationMeters,
                temperatureCelsius: bandTemp,
                precipitation: precip,
              };
            });

            return {
              ...mountain,
              currentFreezingLevelMeters: freezingLevel,
              snowfall: {
                ...mountain.snowfall,
                last24HoursCm: fresh24h,
              },
              elevationBands,
              lastUpdated: new Date().toISOString(),
            };
          }
        } catch (e) {
          // Fallback to baseline
        }
        return mountain;
      })
    );
    clearTimeout(timeoutId);
    return updated;
  } catch (e) {
    // Return baseline
  }

  return BASELINE_MOUNTAINS;
}

export function getAllMountains(): MountainResort[] {
  return BASELINE_MOUNTAINS;
}

export function getMountainById(id: string, list: MountainResort[] = BASELINE_MOUNTAINS): MountainResort | undefined {
  return list.find((m) => m.id === id);
}

export function getMountainsByRegion(region: MountainRegion, list: MountainResort[] = BASELINE_MOUNTAINS): MountainResort[] {
  if (region === 'all') return list;
  return list.filter((m) => m.region === region);
}

export function classifyPrecipitation(temperatureCelsius: number): PrecipitationType {
  if (temperatureCelsius <= -1.5) return 'snow';
  if (temperatureCelsius <= 1.5) return 'wet_snow';
  return 'rain';
}

export function getPrecipitationMeta(type: PrecipitationType) {
  switch (type) {
    case 'snow':
      return {
        label: 'Dry Snow',
        icon: '❄️',
        badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        textColor: 'text-sky-500',
      };
    case 'wet_snow':
      return {
        label: 'Wet Snow / Mixed',
        icon: '🌨️',
        badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        textColor: 'text-indigo-500',
      };
    case 'rain':
      return {
        label: 'Rain',
        icon: '🌧️',
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        textColor: 'text-amber-500',
      };
    case 'fog':
      return {
        label: 'Fog / Low Cloud',
        icon: '🌫️',
        badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
        textColor: 'text-slate-500',
      };
    case 'clear':
    default:
      return {
        label: 'Clear',
        icon: '☀️',
        badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        textColor: 'text-emerald-500',
      };
  }
}

export function getRoadConditionMeta(status: RoadConditionStatus) {
  switch (status) {
    case 'chains_required':
      return {
        label: 'Chains Required',
        badgeBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
        dotColor: 'bg-rose-600',
        description: 'Tire chains strictly enforced by RCMP/DriveBC.',
      };
    case 'compact_snow':
      return {
        label: 'Compact Snow',
        badgeBg: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
        dotColor: 'bg-amber-500',
        description: 'Winter tires (M+S / 3PMSF) required. Slippery sections.',
      };
    case 'slush':
      return {
        label: 'Slushy',
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        dotColor: 'bg-amber-500',
        description: 'Plows active. Reduce speed.',
      };
    case 'ice':
      return {
        label: 'Icy Patches',
        badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        dotColor: 'bg-rose-500',
        description: 'Black ice risk in shaded areas.',
      };
    case 'bare_wet':
      return {
        label: 'Bare & Wet',
        badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        dotColor: 'bg-slate-400',
        description: 'Standard wet road conditions.',
      };
    case 'bare_dry':
    default:
      return {
        label: 'Bare & Dry',
        badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        dotColor: 'bg-emerald-500',
        description: 'Good driving conditions.',
      };
  }
}

export function getAvalancheMeta(danger: AvalancheDanger) {
  switch (danger) {
    case 'extreme':
      return { label: 'Extreme (5/5)', color: 'bg-black text-white' };
    case 'high':
      return { label: 'High (4/5)', color: 'bg-rose-600 text-white' };
    case 'considerable':
      return { label: 'Considerable (3/5)', color: 'bg-amber-600 text-white' };
    case 'moderate':
      return { label: 'Moderate (2/5)', color: 'bg-yellow-500 text-slate-900' };
    case 'low':
      return { label: 'Low (1/5)', color: 'bg-emerald-600 text-white' };
    case 'no_rating':
    default:
      return { label: 'No Rating', color: 'bg-slate-500 text-white' };
  }
}

export function getSnowOverviewStats(mountains: MountainResort[] = BASELINE_MOUNTAINS) {
  const avgFreezingLevel = Math.round(
    mountains.reduce((acc, m) => acc + m.currentFreezingLevelMeters, 0) / mountains.length
  );
  const totalFresh24h = Math.round(
    mountains.reduce((acc, m) => acc + m.snowfall.last24HoursCm, 0) / mountains.length
  );
  const totalOpenLifts = mountains.reduce((acc, m) => acc + m.snowfall.openLifts, 0);
  const totalLifts = mountains.reduce((acc, m) => acc + m.snowfall.totalLifts, 0);

  return {
    avgFreezingLevel,
    avgFresh24hCm: totalFresh24h,
    totalOpenLifts,
    totalLifts,
  };
}
