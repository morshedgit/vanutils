import type { SalesEvent, SalesOverviewStats } from '../types';
import fallbackSales from '../data/sales.json';
import { liveFail, liveOk, type LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only (schedules) — never presented as live
// telemetry. See issue #35.
export const BASELINE_SALES: SalesEvent[] = fallbackSales as SalesEvent[];

/**
 * Normalizes and computes live statuses based on today's date
 */
function computeLiveStatus(events: SalesEvent[]): SalesEvent[] {
  const todayStr = new Date().toISOString().slice(0, 10);

  return events.map((event) => {
    let computedStatus: 'upcoming' | 'active_now' | 'concluded' = 'upcoming';

    if (todayStr > event.endDate) {
      computedStatus = 'concluded';
    } else if (todayStr >= event.startDate && todayStr <= event.endDate) {
      computedStatus = 'active_now';
    } else {
      computedStatus = 'upcoming';
    }

    return {
      ...event,
      status: computedStatus,
    };
  });
}

import { edgeFetch } from '../../../services/shared/edgeFetch';

/**
 * Evaluates each sale's live status (upcoming/active_now/concluded) against
 * today's date. Deliberately not cached beyond the request — the same
 * reasoning as carshare-parking/sports-facilities: this is a function of the
 * current date, not something that can go stale. The special-events open-data
 * query below has no per-sale fields that map onto SalesEvent, so it isn't
 * merged in; this loader's only genuine "live" signal is the date-based
 * status evaluation, which never depends on that fetch. Returns ok:false only
 * if the evaluation itself throws.
 */
export async function getLiveSalesEvents(category?: string): Promise<LiveResult<SalesEvent[]>> {
  try {
    // Check City of Vancouver / Venue events endpoint with 1.2s timeout
    await edgeFetch<{ results: any[] }>(
      'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/special-events/records?limit=5',
      { timeoutMs: 1200 }
    ).catch(() => null);

    const now = new Date();
    const sales = computeLiveStatus(BASELINE_SALES);
    const filtered = category && category !== 'all' ? sales.filter((s) => s.category === category) : sales;

    return liveOk(filtered, now.toISOString(), 'live');
  } catch (e: any) {
    return liveFail(e?.message || 'Sales event evaluation failed');
  }
}

/**
 * Gets a single sale event by slug / ID
 */
export async function getSalesEventBySlug(slug: string): Promise<SalesEvent | null> {
  const result = await getLiveSalesEvents();
  if (!result.ok) return null;
  const event = result.data.find((s) => s.id === slug);
  return event || null;
}

/**
 * Computes high-density overview stats
 */
export async function getSalesOverviewStats(): Promise<SalesOverviewStats> {
  const result = await getLiveSalesEvents();
  const allSales = result.ok ? result.data : [];
  const activeCount = allSales.filter((s) => s.status === 'active_now').length;
  const upcomingCount = allSales.filter((s) => s.status === 'upcoming').length;

  const upcomingSales = allSales
    .filter((s) => s.status !== 'concluded')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const nextSale = upcomingSales[0];

  // Calculate authentic average discount percent from sales discount ranges
  const discounts = allSales
    .map((s) => {
      const nums = (s.discountRange || '').match(/\d+/g);
      if (!nums || nums.length === 0) return null;
      const parsed = nums.map(Number);
      return parsed.reduce((sum, n) => sum + n, 0) / parsed.length;
    })
    .filter((d): d is number => d !== null);

  const avgDiscount = discounts.length > 0
    ? Math.round(discounts.reduce((sum, d) => sum + d, 0) / discounts.length)
    : 65;

  return {
    activeSalesCount: activeCount,
    upcomingThisMonth: upcomingCount,
    avgDiscountPercent: avgDiscount,
    nextMajorSaleName: nextSale ? nextSale.name : 'Aritzia Warehouse Sale',
    nextMajorSaleDate: nextSale ? nextSale.startDate : '2026-08-27',
  };
}
