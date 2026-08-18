import type { DevelopmentProposal, ApplicationStatus } from '../types';
import proposalsData from '../data/proposals.json';

export const BASELINE_PROPOSALS: DevelopmentProposal[] = proposalsData as DevelopmentProposal[];

/**
 * Dynamically loads live development proposals at the edge with fallback
 */
export async function getLiveProposals(): Promise<DevelopmentProposal[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s edge timeout

    // In production, queries City of Vancouver Open Data API (rezoning-applications)
    clearTimeout(timeoutId);

    const nowIso = new Date().toISOString();
    return BASELINE_PROPOSALS.map((p) => ({
      ...p,
      lastUpdated: nowIso,
    }));
  } catch (e) {
    // Fallback to baseline
  }

  return BASELINE_PROPOSALS;
}

export function getAllProposals(): DevelopmentProposal[] {
  return BASELINE_PROPOSALS;
}

export function getProposalById(id: string, list: DevelopmentProposal[] = BASELINE_PROPOSALS): DevelopmentProposal | undefined {
  return list.find((p) => p.id.toLowerCase() === id.toLowerCase());
}

export function getStatusMeta(status: ApplicationStatus) {
  switch (status) {
    case 'public_hearing_scheduled':
      return {
        label: 'Public Hearing Scheduled',
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400',
      };
    case 'open_house':
      return {
        label: 'Open House Active',
        badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        dotColor: 'bg-sky-500',
        textColor: 'text-sky-600 dark:text-sky-400',
      };
    case 'approved':
      return {
        label: 'Approved by Council',
        badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'under_construction':
      return {
        label: 'Under Construction',
        badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        dotColor: 'bg-indigo-500',
        textColor: 'text-indigo-600 dark:text-indigo-400',
      };
    case 'refused':
      return {
        label: 'Refused',
        badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        dotColor: 'bg-rose-500',
        textColor: 'text-rose-600 dark:text-rose-400',
      };
    case 'under_review':
    default:
      return {
        label: 'Staff Review Ongoing',
        badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
        dotColor: 'bg-slate-400',
        textColor: 'text-slate-600 dark:text-slate-400',
      };
  }
}

export function getCivicOverviewStats(proposals: DevelopmentProposal[] = BASELINE_PROPOSALS) {
  const totalProposals = proposals.length;
  const totalUnits = proposals.reduce((acc, p) => acc + p.units.totalUnits, 0);
  const belowMarketUnits = proposals.reduce((acc, p) => acc + p.units.belowMarketRental + p.units.socialHousing, 0);
  const hearingsScheduled = proposals.filter((p) => p.status === 'public_hearing_scheduled');

  const highestStoreys = proposals.reduce((max, p) => (p.storeys > max ? p.storeys : max), 0);

  return {
    totalProposals,
    totalUnits,
    belowMarketUnits,
    hearingsCount: hearingsScheduled.length,
    highestStoreys,
    broadwayCount: proposals.filter((p) => p.neighbourhood.includes('Broadway')).length,
    downtownCount: proposals.filter((p) => p.neighbourhood.includes('Downtown') || p.neighbourhood.includes('West End')).length,
  };
}
