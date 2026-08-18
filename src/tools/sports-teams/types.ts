export type SportsLeague = 'NHL' | 'MLS' | 'CFL' | 'MiLB' | 'NLL' | 'NSL' | 'CEBL';
export type GameStatus = 'upcoming' | 'live' | 'final' | 'postponed' | 'cancelled';
export type MatchResult = 'W' | 'L' | 'D' | 'OTL' | 'SOL';

export interface OpponentInfo {
  name: string;
  shortName: string;
  abbreviation: string;
  logoEmoji?: string;
  record?: string;
}

export interface GameScore {
  team: number;
  opponent: number;
  decisionPeriod?: 'REG' | 'OT' | 'SO' | 'ET' | 'PK';
  livePeriodText?: string;
}

export interface GameBroadcast {
  tv: string;
  radio: string;
  streaming?: string;
}

export interface TeamGame {
  gameId: string;
  date: string; // ISO 8601
  startTimePST: string; // e.g. '7:00 PM PST'
  opponent: OpponentInfo;
  isHome: boolean;
  venueName: string;
  status: GameStatus;
  score?: GameScore;
  result?: MatchResult;
  broadcast: GameBroadcast;
  ticketLink?: string;
  rivalryMatchup?: boolean;
  recapHeadline?: string;
}

export interface TeamLeader {
  category: string;
  playerName: string;
  statValue: string;
}

export interface TeamStandings {
  divisionOrConf: string;
  rank: number;
  record: string;
  points: number;
  goalDiffOrMargin?: number;
  streak: string;
  formLast5: MatchResult[];
}

export interface TeamVenue {
  name: string;
  address: string;
  skytrainStation: string;
  transitTip: string;
  capacity: number;
}

export interface SportsTeam {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  sport: string;
  emoji: string;
  league: SportsLeague;
  leagueFullName: string;
  seasonYear: string;
  venue: TeamVenue;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  standings: TeamStandings;
  lastGame: TeamGame;
  nextGame: TeamGame;
  recentGames: TeamGame[];
  upcomingSchedule: TeamGame[];
  leaders: TeamLeader[];
}

export interface SportsTeamsHeartbeat {
  timestamp: string;
  teams: SportsTeam[];
  gameDaySummary: {
    gamesTodayCount: number;
    imminentGame: {
      teamName: string;
      opponentName: string;
      startTimePST: string;
      venueName: string;
      broadcastTV: string;
      isHome: boolean;
    } | null;
  };
}
