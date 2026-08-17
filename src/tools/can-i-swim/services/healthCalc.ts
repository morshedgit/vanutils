import type { WaterQualityStatus } from '../types';

/**
 * Evaluates water safety status according to Canadian Recreational Water Quality Guidelines
 * and Vancouver Coastal Health (VCH) / Fraser Health protocols.
 *
 * Rules:
 * - Safe (Green): 30-day geometric mean <= 200 E. coli / 100 mL AND single sample <= 235 E. coli / 100 mL.
 * - Caution (Yellow): Single sample between 235 and 400 E. coli / 100 mL (Beach Action Value triggered).
 * - Advisory (Red): Geometric mean > 200 E. coli / 100 mL OR single sample > 400 E. coli / 100 mL OR active closure.
 * - Unmonitored (Gray): No sample within 14 days or off-season.
 */
export function calculateStatus(
  geometricMean: number,
  singleSample?: number,
  isClosed = false,
  sampleDate?: string
): WaterQualityStatus {
  if (isClosed) {
    return 'advisory';
  }

  if (sampleDate) {
    const date = new Date(sampleDate);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 21) {
      return 'unmonitored';
    }
  }

  const single = singleSample ?? geometricMean;

  if (geometricMean > 200 || single > 400) {
    return 'advisory';
  }

  if (single > 235 && single <= 400) {
    return 'caution';
  }

  return 'safe';
}

/**
 * Computes geometric mean of an array of numeric E. coli test readings.
 */
export function calculateGeometricMean(values: number[]): number {
  if (!values.length) return 0;
  // Use log transform to avoid overflow with large products
  const sumOfLogs = values.reduce((acc, val) => acc + Math.log(Math.max(val, 1)), 0);
  return Math.round(Math.exp(sumOfLogs / values.length));
}

export interface StatusMeta {
  status: WaterQualityStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBorder: string;
  dotColor: string;
  glowColor: string;
  headline: string;
  summary: string;
  recommendation: string;
  bannerBg: string;
}

export function getStatusMeta(status: WaterQualityStatus): StatusMeta {
  switch (status) {
    case 'safe':
      return {
        status: 'safe',
        label: 'Safe to Swim',
        badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        badgeText: 'text-emerald-700 dark:text-emerald-400',
        badgeBorder: 'border-emerald-300 dark:border-emerald-700/50',
        cardBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
        dotColor: 'bg-emerald-500',
        glowColor: 'shadow-emerald-500/20',
        headline: 'Water Quality is Clean & Safe',
        summary: 'Bacterial levels are well below federal health guidelines.',
        recommendation: 'Ideal conditions for swimming, paddleboarding, and water recreation.',
        bannerBg: 'bg-gradient-to-r from-emerald-900/30 via-emerald-800/15 to-transparent border-emerald-500/30',
      };
    case 'caution':
      return {
        status: 'caution',
        label: 'Caution Advised',
        badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
        badgeText: 'text-amber-700 dark:text-amber-400',
        badgeBorder: 'border-amber-300 dark:border-amber-700/50',
        cardBorder: 'border-amber-500/30 hover:border-amber-500/60',
        dotColor: 'bg-amber-500',
        glowColor: 'shadow-amber-500/20',
        headline: 'Elevated Bacterial Count (Resampling)',
        summary: 'Single sample between 235 and 400 E. coli / 100 mL. Beach Action Value triggered.',
        recommendation: 'Higher risk for infants, elderly, and those with open wounds or sensitive skin.',
        bannerBg: 'bg-gradient-to-r from-amber-900/30 via-amber-800/15 to-transparent border-amber-500/30',
      };
    case 'advisory':
      return {
        status: 'advisory',
        label: 'No Swimming Advisory',
        badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
        badgeText: 'text-rose-700 dark:text-rose-400',
        badgeBorder: 'border-rose-300 dark:border-rose-700/50',
        cardBorder: 'border-rose-500/30 hover:border-rose-500/60',
        dotColor: 'bg-rose-500',
        glowColor: 'shadow-rose-500/20',
        headline: 'Active Water Quality Advisory',
        summary: 'Geometric mean > 200 or single sample > 400 E. coli / 100 mL.',
        recommendation: 'Swimming and in-water recreation are not recommended due to increased illness risk.',
        bannerBg: 'bg-gradient-to-r from-rose-900/30 via-rose-800/15 to-transparent border-rose-500/30',
      };
    case 'unmonitored':
    default:
      return {
        status: 'unmonitored',
        label: 'Unmonitored',
        badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20',
        badgeText: 'text-slate-600 dark:text-slate-400',
        badgeBorder: 'border-slate-300 dark:border-slate-700/50',
        cardBorder: 'border-slate-300/40 dark:border-slate-700/40 hover:border-slate-500/60',
        dotColor: 'bg-slate-400',
        glowColor: 'shadow-slate-500/10',
        headline: 'Off-Season / Not Monitored',
        summary: 'Sampling occurs weekly from May through September. No recent test available.',
        recommendation: 'Swim at your own discretion. Avoid swimming within 48 hours after heavy rainfall.',
        bannerBg: 'bg-gradient-to-r from-slate-800/30 via-slate-700/15 to-transparent border-slate-600/30',
      };
  }
}
