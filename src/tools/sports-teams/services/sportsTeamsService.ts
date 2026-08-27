import type { SportsTeam, SportsTeamsHeartbeat, MatchResult, TeamGame } from '../types';
import teamsData from '../data/teams.json';
import { withEdgeCache } from '../../../services/shared/edgeCache';
import type { LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only (schedule/venue/broadcast) — never presented
// as live standings. See issue #35.
export const BASELINE_TEAMS: SportsTeam[] = teamsData as SportsTeam[];

const CACHE_TTL_SECONDS = 60; // live game scores change quickly

/**
 * Returns all registered major Vancouver sports franchises
 */
export function getAllTeams(): SportsTeam[] {
  return BASELINE_TEAMS;
}

/**
 * Retrieves a single franchise by its unique ID (e.g. 'canucks', 'whitecaps')
 */
export function getTeamById(id: string, list: SportsTeam[] = BASELINE_TEAMS): SportsTeam | undefined {
  return list.find((t) => t.id === id);
}

/**
 * Computes game day highlights, today's match count, and the imminent game
 */
export function getGameDaySummary(teams: SportsTeam[]) {
  const now = new Date();
  const vancouverTodayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });

  let gamesTodayCount = 0;
  let imminentGame: {
    teamName: string;
    opponentName: string;
    startTimePST: string;
    venueName: string;
    broadcastTV: string;
    isHome: boolean;
  } | null = null;

  for (const team of teams) {
    if (team.nextGame) {
      const nextGameDate = new Date(team.nextGame.date).toLocaleDateString('en-CA', {
        timeZone: 'America/Vancouver',
      });
      if (nextGameDate === vancouverTodayStr) {
        gamesTodayCount++;
        if (!imminentGame) {
          imminentGame = {
            teamName: team.name,
            opponentName: team.nextGame.opponent.name,
            startTimePST: team.nextGame.startTimePST,
            venueName: team.nextGame.venueName,
            broadcastTV: team.nextGame.broadcast.tv,
            isHome: team.nextGame.isHome,
          };
        }
      }
    }
  }

  // If no game today, fallback to the closest upcoming game in the future across all teams
  if (!imminentGame && teams.length > 0) {
    const futureUpcoming = teams
      .filter((t): t is SportsTeam & { nextGame: TeamGame } =>
        t.nextGame !== null && new Date(t.nextGame.date).getTime() >= now.getTime() - 4 * 3600 * 1000
      )
      .sort((a, b) => new Date(a.nextGame.date).getTime() - new Date(b.nextGame.date).getTime());

    if (futureUpcoming.length > 0) {
      const next = futureUpcoming[0];
      imminentGame = {
        teamName: next.name,
        opponentName: next.nextGame.opponent.name,
        startTimePST: next.nextGame.startTimePST,
        venueName: next.nextGame.venueName,
        broadcastTV: next.nextGame.broadcast.tv,
        isHome: next.nextGame.isHome,
      };
    }
  }

  return {
    gamesTodayCount,
    imminentGame,
  };
}

/**
 * Dynamic live loader for Cloudflare Pages SSR with 1.2s fast timeout.
 * Returns ok:false (no baseline standings masquerading as live) if neither
 * upstream league feed responds this request — BC Lions (CFL) and the
 * Canadians (baseball) have no live standings source integrated yet, so
 * their schedule/venue metadata is seed/reference data regardless.
 */
export async function getLiveSportsTeams(): Promise<LiveResult<SportsTeamsHeartbeat>> {
  return withEdgeCache<SportsTeamsHeartbeat>('sports-teams-heartbeat', CACHE_TTL_SECONDS, async () => {
    const teams = BASELINE_TEAMS.map((t) => ({ ...t, standings: { ...t.standings } }));
    let anyLiveSignal = false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s edge timeout

    try {
      const nhlPromise = fetch('https://api-web.nhle.com/v1/standings/now', {
        signal: controller.signal,
        headers: { 'User-Agent': 'VanHeartbeat/2.0' },
      }).then(async (res) => {
        if (res.ok) {
          const nhlData = await res.json();
          const canucksStandings = (nhlData.standings || []).find((s: any) => s.teamAbbrev?.default === 'VAN');
          if (canucksStandings) {
            const canucks = teams.find((t) => t.id === 'canucks');
            if (canucks) {
              canucks.standings.record = `${canucksStandings.wins}-${canucksStandings.losses}-${canucksStandings.otLosses}`;
              canucks.standings.points = canucksStandings.points;
              canucks.standings.rank = canucksStandings.divisionSequence || canucks.standings.rank;
              canucks.standings.goalDiffOrMargin = canucksStandings.goalDifferential;
              canucks.standings.streak = `${canucksStandings.streakCount}${canucksStandings.streakCode}`;
              anyLiveSignal = true;
            }
          }
        }
      }).catch(() => {});

      const mlsPromise = fetch('https://site.api.espn.com/apis/v2/sports/soccer/usa.1/standings', {
        signal: controller.signal,
        headers: { 'User-Agent': 'VanHeartbeat/2.0' },
      }).then(async (res) => {
        if (res.ok) {
          const mlsData = await res.json();
          const entries = mlsData?.children?.[0]?.standings?.entries || [];
          const whitecapsEntry = entries.find((e: any) => e.team?.abbreviation === 'VAN' || e.team?.name?.toLowerCase().includes('whitecaps'));
          if (whitecapsEntry) {
            const whitecaps = teams.find((t) => t.id === 'whitecaps');
            if (whitecaps) {
              const stats = whitecapsEntry.stats || [];
              const wins = stats.find((s: any) => s.name === 'wins')?.value || 0;
              const losses = stats.find((s: any) => s.name === 'losses')?.value || 0;
              const ties = stats.find((s: any) => s.name === 'ties')?.value || 0;
              const pts = stats.find((s: any) => s.name === 'points')?.value || 0;
              const rank = stats.find((s: any) => s.name === 'rank')?.value || whitecaps.standings.rank;
              const gd = stats.find((s: any) => s.name === 'pointDifferential')?.value || 0;

              whitecaps.standings.record = `${wins}-${losses}-${ties}`;
              whitecaps.standings.points = pts;
              whitecaps.standings.rank = rank;
              whitecaps.standings.goalDiffOrMargin = gd;
              anyLiveSignal = true;
            }
          }
        }
      }).catch(() => {});

      await Promise.allSettled([nhlPromise, mlsPromise]);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!anyLiveSignal) return null;

    const gameDaySummary = getGameDaySummary(teams);

    return {
      timestamp: new Date().toISOString(),
      teams,
      gameDaySummary,
    };
  });
}

/**
 * Returns UI badge styling based on match outcome
 */
export function getFormBadgeStyle(result: MatchResult): {
  bgColor: string;
  textColor: string;
  borderColor: string;
  label: string;
} {
  switch (result) {
    case 'W':
      return {
        bgColor: 'bg-emerald-500/15 dark:bg-emerald-500/25',
        textColor: 'text-emerald-700 dark:text-emerald-300',
        borderColor: 'border-emerald-500/30',
        label: 'W',
      };
    case 'L':
      return {
        bgColor: 'bg-rose-500/15 dark:bg-rose-500/25',
        textColor: 'text-rose-700 dark:text-rose-300',
        borderColor: 'border-rose-500/30',
        label: 'L',
      };
    case 'D':
    case 'OTL':
    case 'SOL':
    default:
      return {
        bgColor: 'bg-amber-500/15 dark:bg-amber-500/25',
        textColor: 'text-amber-700 dark:text-amber-300',
        borderColor: 'border-amber-500/30',
        label: result,
      };
  }
}
