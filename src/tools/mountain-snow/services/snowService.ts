import type {
  MountainResort,
  MountainRegion,
  PrecipitationType,
  RoadConditionStatus,
  AvalancheDanger,
} from '../types';
import mountainsData from '../data/mountains.json';

export const MOUNTAINS: MountainResort[] = mountainsData as MountainResort[];

export function getAllMountains(): MountainResort[] {
  return MOUNTAINS;
}

export function getMountainById(id: string): MountainResort | undefined {
  return MOUNTAINS.find((m) => m.id === id);
}

export function getMountainsByRegion(region: MountainRegion): MountainResort[] {
  if (region === 'all') return MOUNTAINS;
  return MOUNTAINS.filter((m) => m.region === region);
}

/**
 * Classifies precipitation type based on air temperature
 * ❄️ Snow: <= -1.5°C
 * 🌨️ Wet Snow / Mixed: -1.5°C to +1.5°C
 * 🌧️ Rain: > +1.5°C
 */
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

export function getSnowOverviewStats(mountains: MountainResort[] = MOUNTAINS) {
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
