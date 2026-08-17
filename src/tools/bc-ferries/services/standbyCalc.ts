import type { StandbyRiskLevel, WeatherRisk } from '../types';

export interface StandbyMeta {
  level: StandbyRiskLevel;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  recommendation: string;
  gaugeColor: string;
}

export interface WeatherRiskMeta {
  risk: WeatherRisk;
  label: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

/**
 * Evaluates standby risk level based on available vehicle deck space percentage
 */
export function calculateStandbyRisk(deckSpacePercent?: number): StandbyRiskLevel {
  if (deckSpacePercent === undefined || deckSpacePercent === null) {
    return 'not_applicable';
  }
  if (deckSpacePercent > 35) return 'low';
  if (deckSpacePercent >= 15) return 'moderate';
  if (deckSpacePercent > 0) return 'high';
  return 'full';
}

/**
 * Returns styling metadata and user advice for a given standby risk level
 */
export function getStandbyMeta(level: StandbyRiskLevel): StandbyMeta {
  switch (level) {
    case 'low':
      return {
        level: 'low',
        label: 'Low Risk',
        badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        badgeText: 'text-emerald-700 dark:text-emerald-300',
        badgeBorder: 'border-emerald-500/20',
        dotColor: 'bg-emerald-500',
        recommendation: 'Good standby clearance. Arrive 45–60 min prior.',
        gaugeColor: '#10b981',
      };
    case 'moderate':
      return {
        level: 'moderate',
        label: 'Moderate Risk',
        badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
        badgeText: 'text-amber-700 dark:text-amber-300',
        badgeBorder: 'border-amber-500/20',
        dotColor: 'bg-amber-500',
        recommendation: 'Standby filling. Arrive 60–90 min prior; 1-sailing wait possible.',
        gaugeColor: '#f59e0b',
      };
    case 'high':
      return {
        level: 'high',
        label: 'High Risk',
        badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
        badgeText: 'text-rose-700 dark:text-rose-300',
        badgeBorder: 'border-rose-500/20',
        dotColor: 'bg-rose-500',
        recommendation: 'Standby cutoff likely. Plan for subsequent sailing.',
        gaugeColor: '#ef4444',
      };
    case 'full':
      return {
        level: 'full',
        label: 'Sailing Full',
        badgeBg: 'bg-rose-950/40 text-rose-300',
        badgeText: 'text-rose-400',
        badgeBorder: 'border-rose-800',
        dotColor: 'bg-rose-600',
        recommendation: 'No vehicle space available. Next sailing queue active.',
        gaugeColor: '#dc2626',
      };
    case 'not_applicable':
    default:
      return {
        level: 'not_applicable',
        label: 'Passenger Only',
        badgeBg: 'bg-sky-500/10 dark:bg-sky-500/20',
        badgeText: 'text-sky-700 dark:text-sky-300',
        badgeBorder: 'border-sky-500/20',
        dotColor: 'bg-sky-500',
        recommendation: 'Walk-on passenger or high-frequency transit.',
        gaugeColor: '#0284c7',
      };
  }
}

/**
 * Returns weather risk metadata from Georgia Strait wind telemetry
 */
export function getWeatherRiskMeta(risk: WeatherRisk = 'normal'): WeatherRiskMeta {
  switch (risk) {
    case 'high_wind_warning':
      return {
        risk: 'high_wind_warning',
        label: 'High Wind Warning',
        badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
        badgeText: 'text-rose-600',
        description: 'Winds >25 knots in Georgia Strait. High cancellation risk for fast ferries.',
      };
    case 'caution':
      return {
        risk: 'caution',
        label: 'Weather Caution',
        badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        badgeText: 'text-amber-600',
        description: 'Choppy seas. Minor crossing delays possible.',
      };
    case 'normal':
    default:
      return {
        risk: 'normal',
        label: 'Calm Seas',
        badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        badgeText: 'text-emerald-600',
        description: 'Normal sailing conditions across Strait of Georgia.',
      };
  }
}
