import type { SportsTeam, SportsTeamsHeartbeat, MatchResult } from '../types';
import teamsData from '../data/teams.json';

export const BASELINE_TEAMS: SportsTeam[] = teamsData as SportsTeam[];

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

  // If no game today, fallback to the closest upcoming game across all teams
  if (!imminentGame && teams.length > 0) {
    const sorted = [...teams].sort((a, b) => {
      const dateA = new Date(a.nextGame.date).getTime();
      const dateB = new Date(b.nextGame.date).getTime();
      return dateA - dateB;
    });

    const next = sorted[0];
    imminentGame = {
      teamName: next.name,
      opponentName: next.nextGame.opponent.name,
      startTimePST: next.nextGame.startTimePST,
      venueName: next.nextGame.venueName,
      broadcastTV: next.nextGame.broadcast.tv,
      isHome: next.nextGame.isHome,
    };
  }

  return {
    gamesTodayCount,
    imminentGame,
  };
}

/**
 * Dynamic live loader for Cloudflare Pages SSR with 1.2s fast timeout fallback
 */
export async function getLiveSportsTeams(): Promise<SportsTeamsHeartbeat> {
  const teams = [...BASELINE_TEAMS];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s edge timeout

    // Attempt live NHL standings query for Canucks
    try {
      const nhlRes = await fetch('https://api-web.nhle.com/v1/standings/now', {
        signal: controller.signal,
        headers: { 'User-Agent': 'VanHeartbeat/2.0' },
      });

      if (nhlRes.ok) {
        const nhlData = await nhlRes.json();
        const canucksStandings = (nhlData.standings || []).find((s: any) => s.teamAbbrev?.default === 'VAN');
        if (canucksStandings) {
          const canucks = teams.find((t) => t.id === 'canucks');
          if (canucks) {
            canucks.standings.record = `${canucksStandings.wins}-${canucksStandings.losses}-${canucksStandings.otLosses}`;
            canucks.standings.points = canucksStandings.points;
            canucks.standings.rank = canucksStandings.divisionSequence || canucks.standings.rank;
            canucks.standings.goalDiffOrMargin = canucksStandings.goalDifferential;
            canucks.standings.streak = `${canucksStandings.streakCount}${canucksStandings.streakCode}`;
          }
        }
      }
    } catch {
      // Graceful fallback to verified baseline data
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    // Edge timeout triggered, proceed with baseline telemetry
  }

  const gameDaySummary = getGameDaySummary(teams);

  return {
    timestamp: new Date().toISOString(),
    teams,
    gameDaySummary,
  };
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
