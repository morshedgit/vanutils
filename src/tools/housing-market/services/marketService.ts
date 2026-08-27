import type { SubmarketPulse, MortgageBenchmark, MarketHeartbeatData, MarketCondition } from '../types';
import marketData from '../data/market.json';
import mortgageData from '../data/mortgage.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';
import { withEdgeCache } from '../../../services/shared/edgeCache';
import type { LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only (REBGV benchmark snapshots, refreshed by the
// manual sync script) — never presented as live telemetry. See issue #35.
export const BASELINE_MARKET: { metroOverview: SubmarketPulse; submarkets: SubmarketPulse[] } = marketData as any;
export const BASELINE_MORTGAGE: MortgageBenchmark = mortgageData as MortgageBenchmark;

const CACHE_TTL_SECONDS = 86400; // Bank of Canada rate/REBGV stats are daily at most

/**
 * Dynamically loads live Bank of Canada interest rates at the edge.
 * Returns ok:false (no baseline mortgage rates masquerading as live) when
 * the upstream fetch fails — this is the only genuinely live-fetched piece
 * of this module today; submarket benchmark prices are seed/reference data
 * only until a live REBGV feed is integrated.
 */
export async function getLiveMarketHeartbeat(): Promise<LiveResult<MarketHeartbeatData>> {
  return withEdgeCache<MarketHeartbeatData>('housing-market-heartbeat', CACHE_TTL_SECONDS, async () => {
    const now = new Date();
    const endpoint = 'https://www.bankofcanada.ca/valet/observations/V39079/json?recent=1';
    const res = await edgeFetch<{ observations: Array<Record<string, any>> }>(endpoint, { timeoutMs: 1200 });

    if (!res.data || !Array.isArray(res.data.observations) || res.data.observations.length === 0) return null;

    const latestObs = res.data.observations[res.data.observations.length - 1];
    const rateStr = latestObs?.V39079?.v ?? latestObs?.v ?? latestObs?.V39079;
    const targetRate = typeof rateStr === 'number' ? rateStr : parseFloat(rateStr);
    if (isNaN(targetRate) || targetRate <= 0) return null;

    const prime = targetRate + 2.2;
    const variableRate = prime - 0.75;
    const stressRate = Math.max(5.25, prime + 1.0);
    const liveMortgage: MortgageBenchmark = {
      ...BASELINE_MORTGAGE,
      bocOvernightRate: targetRate,
      primeRate: parseFloat(prime.toFixed(2)),
      variable5YearBenchmark: parseFloat(variableRate.toFixed(2)),
      stressTestQualifyingRate: parseFloat(stressRate.toFixed(2)),
      lastUpdated: latestObs.d || now.toISOString(),
    };

    return {
      metroOverview: BASELINE_MARKET.metroOverview,
      submarkets: BASELINE_MARKET.submarkets,
      mortgage: liveMortgage,
      lastUpdated: now.toISOString(),
    };
  });
}

export function getAllSubmarkets(): SubmarketPulse[] {
  return [BASELINE_MARKET.metroOverview, ...BASELINE_MARKET.submarkets];
}

export function getSubmarketById(id: string, list: SubmarketPulse[] = getAllSubmarkets()): SubmarketPulse | undefined {
  return list.find((s) => s.id.toLowerCase() === id.toLowerCase() || s.id.replace(/_/g, '-').toLowerCase() === id.toLowerCase());
}

export function getMortgageBenchmarks(): MortgageBenchmark {
  return BASELINE_MORTGAGE;
}

export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatPercent(val: number, includeSign: boolean = true): string {
  const sign = includeSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

export function getConditionLabel(condition: MarketCondition): string {
  switch (condition) {
    case 'buyers':
      return "Buyer's Market";
    case 'balanced':
      return 'Balanced Market';
    case 'sellers':
    default:
      return "Seller's Market";
  }
}

export function getConditionBadgeStyle(condition: MarketCondition): { bg: string; text: string; dot: string } {
  switch (condition) {
    case 'buyers':
      return {
        bg: 'bg-emerald-500/15 border-emerald-500/30',
        text: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-500',
      };
    case 'balanced':
      return {
        bg: 'bg-amber-500/15 border-amber-500/30',
        text: 'text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
      };
    case 'sellers':
    default:
      return {
        bg: 'bg-rose-500/15 border-rose-500/30',
        text: 'text-rose-700 dark:text-rose-300',
        dot: 'bg-rose-500',
      };
  }
}
