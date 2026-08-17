import type { BridgeCrossing, CrossingRegion, TrafficStatus, CrossingIncident, CounterflowState } from '../types';
import crossingsData from '../data/crossings.json';

export const BASELINE_CROSSINGS: BridgeCrossing[] = crossingsData as BridgeCrossing[];

/**
 * Calculates current Vancouver local time counterflow state
 */
function getDynamicCounterflowState(crossingId: string): { activeConfiguration: string; state: CounterflowState } {
  // Get Vancouver local time (America/Vancouver)
  const now = new Date();
  const vancouverTimeString = now.toLocaleString('en-US', { timeZone: 'America/Vancouver' });
  const vancouverDate = new Date(vancouverTimeString);
  const day = vancouverDate.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const isWeekend = day === 0 || day === 6;
  const hour = vancouverDate.getHours();
  const minute = vancouverDate.getMinutes();
  const timeDec = hour + minute / 60;

  if (crossingId === 'lions-gate') {
    if (!isWeekend && timeDec >= 6.0 && timeDec < 9.5) {
      return {
        activeConfiguration: '2 Lanes Southbound, 1 Lane Northbound (Morning Inbound Peak)',
        state: 'inbound_priority',
      };
    } else if (!isWeekend && timeDec >= 15.0 && timeDec < 19.0) {
      return {
        activeConfiguration: '2 Lanes Northbound, 1 Lane Southbound (Afternoon Outbound Peak)',
        state: 'outbound_priority',
      };
    } else {
      return {
        activeConfiguration: '1 Lane Southbound, 1 Center Lane, 1 Lane Northbound (Standard)',
        state: 'standard',
      };
    }
  }

  if (crossingId === 'massey-tunnel') {
    if (!isWeekend && timeDec >= 5.75 && timeDec < 9.0) {
      return {
        activeConfiguration: '3 Lanes Northbound, 1 Lane Southbound (Morning Inbound Peak)',
        state: 'inbound_priority',
      };
    } else if (!isWeekend && timeDec >= 15.0 && timeDec < 18.5) {
      return {
        activeConfiguration: '3 Lanes Southbound, 1 Lane Northbound (Afternoon Outbound Peak)',
        state: 'outbound_priority',
      };
    } else {
      return {
        activeConfiguration: '2 Lanes Southbound, 2 Lanes Northbound (Standard)',
        state: 'standard',
      };
    }
  }

  if (crossingId === 'alex-fraser') {
    if (!isWeekend && timeDec >= 4.5 && timeDec < 11.5) {
      return {
        activeConfiguration: '4 Lanes Northbound, 3 Lanes Southbound (Road Zipper Inbound)',
        state: 'inbound_priority',
      };
    } else {
      return {
        activeConfiguration: '4 Lanes Southbound, 3 Lanes Northbound (Road Zipper Outbound)',
        state: 'outbound_priority',
      };
    }
  }

  return {
    activeConfiguration: 'Standard Lane Allocation',
    state: 'not_applicable',
  };
}

/**
 * Dynamically fetches live bridge delays and DriveBC Open511 events at the edge
 */
export async function getLiveCrossings(): Promise<BridgeCrossing[]> {
  const nowIso = new Date().toISOString();
  let liveIncidentsByCrossing: Record<string, CrossingIncident[]> = {};

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s fast edge timeout

    const open511Res = await fetch(
      'https://api.open511.gov.bc.ca/events?bbox=-123.35,49.0,-122.6,49.4&status=ACTIVE&format=json',
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'VanUtils/1.0' },
      }
    );

    clearTimeout(timeoutId);

    if (open511Res.ok) {
      const data = await open511Res.json();
      const events: any[] = data.events || [];

      for (const ev of events) {
        const text = `${ev.headline || ''} ${ev.description || ''}`.toLowerCase();
        let targetId = '';
        if (text.includes('lions gate')) targetId = 'lions-gate';
        else if (text.includes('second narrows') || text.includes('ironworkers')) targetId = 'ironworkers';
        else if (text.includes('massey')) targetId = 'massey-tunnel';
        else if (text.includes('alex fraser')) targetId = 'alex-fraser';
        else if (text.includes('oak st') || text.includes('oak street')) targetId = 'oak-street';
        else if (text.includes('knight st') || text.includes('knight street')) targetId = 'knight-street';
        else if (text.includes('port mann')) targetId = 'port-mann';
        else if (text.includes('pattullo')) targetId = 'pattullo';

        if (targetId) {
          if (!liveIncidentsByCrossing[targetId]) liveIncidentsByCrossing[targetId] = [];
          liveIncidentsByCrossing[targetId].push({
            id: ev.id || `inc-${Date.now()}`,
            severity: ev.severity === 'MAJOR' ? 'major' : 'minor',
            description: ev.headline || ev.description || 'Active traffic incident',
            lanesAffected: ev.roads?.[0]?.name || 'Traffic affected',
            reportedTime: ev.updated || nowIso,
          });
        }
      }
    }
  } catch (e) {
    // Network timeout or offline, proceed with baseline
  }

  return BASELINE_CROSSINGS.map((c) => {
    const counterflow = c.counterflow.hasCounterflow
      ? {
          ...c.counterflow,
          ...getDynamicCounterflowState(c.id),
          lastChangedTimestamp: nowIso,
        }
      : c.counterflow;

    const incidents = liveIncidentsByCrossing[c.id] || c.activeIncidents || [];

    return {
      ...c,
      counterflow,
      activeIncidents: incidents,
      lastUpdated: nowIso,
    };
  });
}

export function getAllCrossings(): BridgeCrossing[] {
  return BASELINE_CROSSINGS;
}

export function getCrossingById(id: string, list: BridgeCrossing[] = BASELINE_CROSSINGS): BridgeCrossing | undefined {
  return list.find((c) => c.id === id);
}

export function getCrossingsByRegion(region: CrossingRegion | 'all', list: BridgeCrossing[] = BASELINE_CROSSINGS): BridgeCrossing[] {
  if (region === 'all') return list;
  return list.filter((c) => c.region === region);
}

export function getStatusMeta(status: TrafficStatus) {
  switch (status) {
    case 'flowing':
      return {
        label: 'Flowing Fast',
        badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'moderate':
      return {
        label: 'Moderate Delay',
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400',
      };
    case 'heavy':
      return {
        label: 'Heavy Congestion',
        badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        dotColor: 'bg-rose-500',
        textColor: 'text-rose-600 dark:text-rose-400',
      };
    case 'closed':
    default:
      return {
        label: 'Closed / Blocked',
        badgeBg: 'bg-rose-950 text-rose-200 border-rose-600',
        dotColor: 'bg-rose-600',
        textColor: 'text-rose-600 dark:text-rose-400',
      };
  }
}

export function getBridgeOverviewStats(crossings: BridgeCrossing[] = BASELINE_CROSSINGS) {
  const activeCounterflows = crossings.filter((c) => c.counterflow.hasCounterflow);
  const totalIncidents = crossings.reduce((acc, c) => acc + c.activeIncidents.length, 0);

  const highestDelayCrossing = crossings.reduce((max, c) => {
    const maxDelayForCrossing = Math.max(c.directions.primary.delayMinutes, c.directions.reverse.delayMinutes);
    const prevMax = Math.max(max.directions.primary.delayMinutes, max.directions.reverse.delayMinutes);
    return maxDelayForCrossing > prevMax ? c : max;
  }, crossings[0]);

  return {
    totalCrossings: crossings.length,
    activeCounterflowsCount: activeCounterflows.length,
    totalIncidents,
    highestDelayCrossingName: highestDelayCrossing ? highestDelayCrossing.shortName : 'Lions Gate',
    highestDelayMinutes: highestDelayCrossing ? Math.max(highestDelayCrossing.directions.primary.delayMinutes, highestDelayCrossing.directions.reverse.delayMinutes) : 10,
  };
}
