import type { DevelopmentProposal, ApplicationStatus } from '../types';
import proposalsData from '../data/proposals.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';
import { withEdgeCache } from '../../../services/shared/edgeCache';
import type { LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only — never presented as live telemetry. See issue #35.
export const BASELINE_PROPOSALS: DevelopmentProposal[] = proposalsData as DevelopmentProposal[];

const CACHE_TTL_SECONDS = 86400; // planning applications don't change intraday

/**
 * Dynamically loads live development proposals at the edge.
 * Returns ok:false when there is no genuine live reading (no baseline masquerading as live — issue #35).
 */
export async function getLiveProposals(): Promise<LiveResult<DevelopmentProposal[]>> {
  return withEdgeCache<DevelopmentProposal[]>('civic-development-proposals', CACHE_TTL_SECONDS, async () => {
    const endpoint = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/development-cost-levy-dcl-areas/records?limit=10';
    await edgeFetch<{ results: any[] }>(endpoint, { timeoutMs: 1200 });

    // This open-data dataset has no per-proposal fields that map onto
    // DevelopmentProposal (see scripts/sync-live-civic.js) — there is no
    // real live merge implemented yet, so this module has no live source.
    return null;
  });
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
    case 'under_review':
    default:
      return {
        label: 'Under City Review',
        badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
        dotColor: 'bg-slate-500',
        textColor: 'text-slate-600 dark:text-slate-400',
      };
  }
}

export function getCivicOverviewStats(proposals: DevelopmentProposal[] = BASELINE_PROPOSALS) {
  const totalUnits = proposals.reduce((acc, p) => acc + p.units.totalUnits, 0);
  const belowMarketUnits = proposals.reduce((acc, p) => acc + p.units.belowMarketRental + p.units.socialHousing, 0);
  const rentalUnits = proposals.reduce((acc, p) => acc + p.units.marketRental + p.units.belowMarketRental, 0);
  const socialUnits = proposals.reduce((acc, p) => acc + p.units.socialHousing, 0);
  const highestStoreys = Math.max(...proposals.map((p) => p.storeys));
  const towersAbove20 = proposals.filter((p) => p.storeys >= 20).length;

  return {
    totalProposals: proposals.length,
    totalApplications: proposals.length,
    totalUnits,
    belowMarketUnits,
    rentalUnits,
    socialUnits,
    highestStoreys,
    towersAbove20,
  };
}
