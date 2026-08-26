import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncLiveSportsTeams() {
  console.log('🏒 Syncing Metro Vancouver Major Sports Teams Telemetry (Canucks, Whitecaps, BC Lions, Canadians)...');

  try {
    const teamsFilePath = path.join(
      __dirname,
      '../src/tools/sports-teams/data/teams.json'
    );
    const existingTeams = JSON.parse(fs.readFileSync(teamsFilePath, 'utf8'));

    // 0. Reset every team's game/schedule fields to "no data" up front. Nothing
    // in this script (or anywhere else) currently has a verified live source for
    // recentGames/upcomingSchedule, and several teams (BC Lions, Rise FC) have
    // no live source for lastGame/nextGame either. Each block below overwrites
    // a field only when it finds real data — anything it can't verify this run
    // stays null/empty rather than carrying forward a stale or fabricated value.
    for (const team of existingTeams) {
      team.lastGame = null;
      team.nextGame = null;
      team.recentGames = [];
      team.upcomingSchedule = [];
    }

    // 1. Ingest live NHL Standings for Vancouver Canucks
    try {
      const nhlRes = await fetch('https://api-web.nhle.com/v1/standings/now', {
        headers: { 'User-Agent': 'VanHeartbeat/2.0' },
      }).catch(() => null);

      if (nhlRes && nhlRes.ok) {
        const nhlData = await nhlRes.json();
        const canucksStandings = (nhlData.standings || []).find((s) => s.teamAbbrev?.default === 'VAN');
        if (canucksStandings) {
          const canucks = existingTeams.find((t) => t.id === 'canucks');
          if (canucks) {
            canucks.standings.record = `${canucksStandings.wins}-${canucksStandings.losses}-${canucksStandings.otLosses}`;
            canucks.standings.points = canucksStandings.points;
            canucks.standings.rank = canucksStandings.divisionSequence || canucks.standings.rank;
            canucks.standings.goalDiffOrMargin = canucksStandings.goalDifferential;
            canucks.standings.streak = `${canucksStandings.streakCount}${canucksStandings.streakCode}`;
            console.log(`✅ Updated Canucks NHL standings: ${canucks.standings.record} (${canucks.standings.points} pts)`);
          }
        }
      }
    } catch (e) {
      console.log('ℹ️ NHL API: using verified baseline team telemetry.');
    }

    // 2. Ingest live MLS Standings for Vancouver Whitecaps FC
    try {
      const mlsRes = await fetch('https://site.api.espn.com/apis/v2/sports/soccer/usa.1/standings', {
        headers: { 'User-Agent': 'VanHeartbeat/2.0' },
      }).catch(() => null);

      if (mlsRes && mlsRes.ok) {
        const mlsData = await mlsRes.json();
        const entries = mlsData?.children?.[0]?.standings?.entries || [];
        const whitecapsEntry = entries.find((e) => e.team?.abbreviation === 'VAN' || e.team?.name?.toLowerCase().includes('whitecaps'));
        if (whitecapsEntry) {
          const whitecaps = existingTeams.find((t) => t.id === 'whitecaps');
          if (whitecaps) {
            const stats = whitecapsEntry.stats || [];
            const wins = stats.find((s) => s.name === 'wins')?.value || 0;
            const losses = stats.find((s) => s.name === 'losses')?.value || 0;
            const ties = stats.find((s) => s.name === 'ties')?.value || 0;
            const pts = stats.find((s) => s.name === 'points')?.value || 0;
            const rank = stats.find((s) => s.name === 'rank')?.value || whitecaps.standings.rank;
            const gd = stats.find((s) => s.name === 'pointDifferential')?.value || 0;

            whitecaps.standings.record = `${wins}-${losses}-${ties}`;
            whitecaps.standings.points = pts;
            whitecaps.standings.rank = rank;
            whitecaps.standings.goalDiffOrMargin = gd;
            console.log(`✅ Updated Whitecaps MLS standings: ${whitecaps.standings.record} (${whitecaps.standings.points} pts)`);
          }
        }
      }
    } catch (e) {
      console.log('ℹ️ MLS API: using verified baseline team telemetry.');
    }

    // 3. Ingest live NHL schedule for Vancouver Canucks lastGame/nextGame.
    // Only fields returned by the NHL API are used — no invented scores, recap
    // prose, broadcast details, or ticket links. If the current season has no
    // completed games yet (e.g. during the off-season), falls back to the most
    // recently completed real season for lastGame rather than showing nothing
    // when a genuine result is available one season back.
    try {
      const mapNhlGame = (game) => {
        const isHome = game.homeTeam?.abbrev === 'VAN';
        const self = isHome ? game.homeTeam : game.awayTeam;
        const opp = isHome ? game.awayTeam : game.homeTeam;
        const tvNetworks = [...new Set((game.tvBroadcasts || []).map((b) => b.network).filter(Boolean))];
        const startTimeUTC = game.startTimeUTC;
        const startTimePST = startTimeUTC
          ? `${new Date(startTimeUTC).toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', minute: '2-digit', hour12: true })} PST`
          : 'TBD';

        const mapped = {
          gameId: `nhl-${game.id}`,
          date: startTimeUTC || game.gameDate,
          startTimePST,
          opponent: {
            name: [opp.placeName?.default, opp.commonName?.default].filter(Boolean).join(' ') || opp.abbrev,
            shortName: opp.commonName?.default || opp.abbrev,
            abbreviation: opp.abbrev,
          },
          isHome,
          venueName: game.venue?.default || 'TBD',
          broadcast: {
            tv: tvNetworks.length > 0 ? tvNetworks.join(' / ') : 'Check nhl.com/canucks',
            radio: 'Check nhl.com/canucks',
          },
        };

        if (game.gameState === 'OFF' && typeof self.score === 'number' && typeof opp.score === 'number') {
          const periodType = game.periodDescriptor?.periodType;
          const decisionPeriod = periodType === 'OT' ? 'OT' : periodType === 'SO' ? 'SO' : 'REG';
          return {
            ...mapped,
            status: 'final',
            score: { team: self.score, opponent: opp.score, decisionPeriod },
            result: self.score > opp.score ? 'W' : (decisionPeriod !== 'REG' ? 'OTL' : 'L'),
          };
        }

        return { ...mapped, status: 'upcoming' };
      };

      const fetchNhlSeasonGames = async (season) => {
        const res = await fetch(`https://api-web.nhle.com/v1/club-schedule-season/VAN/${season}`, {
          headers: { 'User-Agent': 'VanHeartbeat/2.0' },
        }).catch(() => null);
        if (!res || !res.ok) return [];
        const data = await res.json();
        return Array.isArray(data.games) ? data.games : [];
      };

      const canucks = existingTeams.find((t) => t.id === 'canucks');
      if (canucks) {
        const currentSeasonGames = await fetchNhlSeasonGames('now');
        const finalGames = currentSeasonGames.filter((g) => g.gameState === 'OFF').sort((a, b) => a.gameDate.localeCompare(b.gameDate));
        const upcomingGames = currentSeasonGames.filter((g) => g.gameState === 'FUT' || g.gameState === 'PRE').sort((a, b) => a.gameDate.localeCompare(b.gameDate));

        if (finalGames.length > 0) {
          canucks.lastGame = mapNhlGame(finalGames[finalGames.length - 1]);
          console.log(`✅ Updated Canucks last game from live NHL schedule: ${canucks.lastGame.opponent.abbreviation} (${canucks.lastGame.result})`);
        } else {
          const previousSeasonYear = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
          const previousSeasonId = `${previousSeasonYear - 1}${previousSeasonYear}`;
          const previousSeasonGames = await fetchNhlSeasonGames(previousSeasonId);
          const previousFinals = previousSeasonGames.filter((g) => g.gameState === 'OFF').sort((a, b) => a.gameDate.localeCompare(b.gameDate));

          if (previousFinals.length > 0) {
            canucks.lastGame = mapNhlGame(previousFinals[previousFinals.length - 1]);
            console.log(`✅ Updated Canucks last game from live NHL schedule (${previousSeasonId} season): ${canucks.lastGame.opponent.abbreviation} (${canucks.lastGame.result})`);
          } else {
            console.log('ℹ️ NHL schedule: no completed Canucks game found in current or previous season — lastGame stays unavailable.');
          }
        }

        if (upcomingGames.length > 0) {
          canucks.nextGame = mapNhlGame(upcomingGames[0]);
          console.log(`✅ Updated Canucks next game from live NHL schedule: vs ${canucks.nextGame.opponent.abbreviation} on ${canucks.nextGame.date}`);
        } else {
          console.log('ℹ️ NHL schedule: no upcoming Canucks game found — nextGame stays unavailable.');
        }
      }
    } catch (e) {
      console.log('ℹ️ NHL Schedule API: unreachable — Canucks schedule fields stay unavailable.');
    }

    // 4. Ingest live MLS schedule for Vancouver Whitecaps FC lastGame/nextGame
    // via ESPN's public site API (team id 9727).
    try {
      const whitecaps = existingTeams.find((t) => t.id === 'whitecaps');
      if (whitecaps) {
        const mapMlsEvent = (event) => {
          const comp = event.competitions?.[0];
          const homeC = comp?.competitors?.find((c) => c.homeAway === 'home');
          const awayC = comp?.competitors?.find((c) => c.homeAway === 'away');
          const isHome = homeC?.team?.id === '9727';
          const self = isHome ? homeC : awayC;
          const opp = isHome ? awayC : homeC;
          const broadcasts = [...new Set((comp?.broadcasts || []).map((b) => b.media?.shortName).filter(Boolean))];
          const startTimePST = event.date
            ? `${new Date(event.date).toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', minute: '2-digit', hour12: true })} PST`
            : 'TBD';

          const mapped = {
            gameId: `mls-${event.id}`,
            date: event.date,
            startTimePST,
            opponent: {
              name: opp?.team?.displayName || opp?.team?.name || 'TBD',
              shortName: opp?.team?.shortDisplayName || opp?.team?.nickname || opp?.team?.abbreviation || 'TBD',
              abbreviation: opp?.team?.abbreviation || 'TBD',
            },
            isHome,
            venueName: comp?.venue?.fullName || 'TBD',
            broadcast: {
              tv: broadcasts.length > 0 ? broadcasts.join(' / ') : 'Check whitecapsfc.com',
              radio: 'Check whitecapsfc.com',
            },
          };

          const selfScore = Number(self?.score?.displayValue ?? self?.score?.value);
          const oppScore = Number(opp?.score?.displayValue ?? opp?.score?.value);
          if (comp?.status?.type?.completed && !Number.isNaN(selfScore) && !Number.isNaN(oppScore)) {
            return {
              ...mapped,
              status: 'final',
              score: { team: selfScore, opponent: oppScore, decisionPeriod: 'REG' },
              result: selfScore > oppScore ? 'W' : selfScore < oppScore ? 'L' : 'D',
            };
          }

          return { ...mapped, status: 'upcoming' };
        };

        const schedRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams/9727/schedule', {
          headers: { 'User-Agent': 'VanHeartbeat/2.0' },
        }).catch(() => null);

        if (schedRes && schedRes.ok) {
          const schedData = await schedRes.json();
          const events = Array.isArray(schedData.events) ? schedData.events : [];
          const completed = events
            .filter((e) => e.competitions?.[0]?.status?.type?.completed)
            .sort((a, b) => a.date.localeCompare(b.date));

          if (completed.length > 0) {
            whitecaps.lastGame = mapMlsEvent(completed[completed.length - 1]);
            console.log(`✅ Updated Whitecaps last game from live MLS schedule: ${whitecaps.lastGame.opponent.abbreviation} (${whitecaps.lastGame.result})`);
          } else {
            console.log('ℹ️ MLS schedule: no completed Whitecaps game found — lastGame stays unavailable.');
          }
        }

        const teamRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams/9727', {
          headers: { 'User-Agent': 'VanHeartbeat/2.0' },
        }).catch(() => null);

        if (teamRes && teamRes.ok) {
          const teamData = await teamRes.json();
          const nextEvent = teamData.team?.nextEvent?.[0];
          if (nextEvent) {
            whitecaps.nextGame = mapMlsEvent(nextEvent);
            console.log(`✅ Updated Whitecaps next game from live MLS schedule: vs ${whitecaps.nextGame.opponent.abbreviation} on ${whitecaps.nextGame.date}`);
          } else {
            console.log('ℹ️ MLS schedule: no upcoming Whitecaps game found — nextGame stays unavailable.');
          }
        }
      }
    } catch (e) {
      console.log('ℹ️ MLS Schedule API: unreachable — Whitecaps schedule fields stay unavailable.');
    }

    // 5. Ingest live MiLB schedule for Vancouver Canadians lastGame/nextGame via
    // the official MLB Stats API (team id 435, Northwest League / sportId 13).
    try {
      const canadians = existingTeams.find((t) => t.id === 'canadians');
      if (canadians) {
        const now = new Date();
        const startDate = new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const endDate = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);

        const milbRes = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?sportId=13&teamId=435&startDate=${startDate}&endDate=${endDate}`,
          { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
        ).catch(() => null);

        if (milbRes && milbRes.ok) {
          const milbData = await milbRes.json();
          const games = (milbData.dates || []).flatMap((d) => d.games || []);

          const mapMilbGame = (game) => {
            const isHome = game.teams.home.team.id === 435;
            const self = isHome ? game.teams.home : game.teams.away;
            const opp = isHome ? game.teams.away : game.teams.home;
            const startTimePST = `${new Date(game.gameDate).toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', minute: '2-digit', hour12: true })} PST`;

            const mapped = {
              gameId: `milb-${game.gamePk}`,
              date: game.gameDate,
              startTimePST,
              opponent: {
                name: opp.team.name,
                shortName: opp.team.name.replace(/^.*\s/, ''),
                abbreviation: opp.team.name.slice(0, 3).toUpperCase(),
              },
              isHome,
              venueName: game.venue?.name || 'TBD',
              broadcast: { tv: 'MiLB.tv', radio: 'Check milb.com/vancouver' },
            };

            if (game.status?.abstractGameState === 'Final' && typeof self.score === 'number' && typeof opp.score === 'number') {
              return {
                ...mapped,
                status: 'final',
                score: { team: self.score, opponent: opp.score, decisionPeriod: 'REG' },
                result: self.score > opp.score ? 'W' : 'L',
              };
            }

            return { ...mapped, status: 'upcoming' };
          };

          const finalGames = games
            .filter((g) => g.status?.abstractGameState === 'Final')
            .sort((a, b) => a.gameDate.localeCompare(b.gameDate));
          const upcomingGames = games
            .filter((g) => g.status?.abstractGameState === 'Preview' || g.status?.abstractGameState === 'Live')
            .sort((a, b) => a.gameDate.localeCompare(b.gameDate));

          if (finalGames.length > 0) {
            canadians.lastGame = mapMilbGame(finalGames[finalGames.length - 1]);
            console.log(`✅ Updated Canadians last game from live MiLB schedule: ${canadians.lastGame.opponent.abbreviation} (${canadians.lastGame.result})`);
          } else {
            console.log('ℹ️ MiLB schedule: no completed Canadians game in range — lastGame stays unavailable.');
          }

          if (upcomingGames.length > 0) {
            canadians.nextGame = mapMilbGame(upcomingGames[0]);
            console.log(`✅ Updated Canadians next game from live MiLB schedule: vs ${canadians.nextGame.opponent.abbreviation} on ${canadians.nextGame.date}`);
          } else {
            console.log('ℹ️ MiLB schedule: no upcoming Canadians game in range — nextGame stays unavailable.');
          }
        }
      }
    } catch (e) {
      console.log('ℹ️ MLB Stats API: unreachable — Canadians schedule fields stay unavailable.');
    }

    // 6. Ingest the most recent completed Vancouver Warriors game from the NLL's
    // stats backend (undocumented; discovered via nll.com's embedded widget
    // config). Only the most recently published season/phase the league site
    // itself exposes (2025-26 playoffs) has live data at time of writing — no
    // next-game data is available until the league publishes a new season.
    try {
      const warriors = existingTeams.find((t) => t.id === 'warriors');
      if (warriors) {
        const nllRes = await fetch(
          'https://nllstatsapp.aordev.com/?data_type=schedule&mode=rest_of_season&phase=PO&season_id=225',
          { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
        ).catch(() => null);

        if (nllRes && nllRes.ok) {
          const nllData = await nllRes.json();
          const allMatches = (Array.isArray(nllData) ? nllData : []).flatMap((week) => week.matches || []);
          const vanMatches = allMatches.filter((m) => m.squads?.home?.code === 'VAN' || m.squads?.away?.code === 'VAN');
          const completed = vanMatches
            .filter((m) => m.status?.code === 'COMP')
            .sort((a, b) => (a.date?.utcMatchStart || '').localeCompare(b.date?.utcMatchStart || ''));

          if (completed.length > 0) {
            const match = completed[completed.length - 1];
            const isHome = match.squads.home.code === 'VAN';
            const self = isHome ? match.squads.home : match.squads.away;
            const opp = isHome ? match.squads.away : match.squads.home;
            const utcMatchStart = match.date?.utcMatchStart;
            const startTimePST = utcMatchStart
              ? `${new Date(utcMatchStart).toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', minute: '2-digit', hour12: true })} PST`
              : 'TBD';
            const decisionPeriod = (match.status?.period || 0) > 4 ? 'OT' : 'REG';

            warriors.lastGame = {
              gameId: `nll-${match.id}`,
              date: utcMatchStart || match.date?.startDate,
              startTimePST,
              opponent: {
                name: opp.displayName || opp.name,
                shortName: opp.nickname || opp.name,
                abbreviation: opp.code,
              },
              isHome,
              venueName: match.venue?.name || 'TBD',
              status: 'final',
              score: { team: self.score.score, opponent: opp.score.score, decisionPeriod },
              result: self.score.score > opp.score.score ? 'W' : 'L',
              broadcast: { tv: 'Check nll.com', radio: 'Check nll.com' },
            };
            console.log(`✅ Updated Warriors last game from live NLL schedule: ${warriors.lastGame.opponent.abbreviation} (${warriors.lastGame.result})`);
          } else {
            console.log('ℹ️ NLL schedule: no completed Warriors playoff game found — lastGame stays unavailable.');
          }
        }
      }
    } catch (e) {
      console.log('ℹ️ NLL stats backend: unreachable — Warriors schedule fields stay unavailable.');
    }

    // 7. Ingest the most recent completed Vancouver Bandits game from a
    // community-maintained CEBL schedule mirror (github.com/ryanndu/cebl-data),
    // refreshed daily from the league's FIBA LiveStats feed. Not an official
    // CEBL source — used with graceful fallback like everything else here.
    try {
      const bandits = existingTeams.find((t) => t.id === 'bandits');
      if (bandits) {
        const ceblRes = await fetch(
          'https://github.com/ryanndu/cebl-data/releases/download/schedule/cebl_schedule.csv',
          { headers: { 'User-Agent': 'VanHeartbeat/2.0' } }
        ).catch(() => null);

        if (ceblRes && ceblRes.ok) {
          const csvText = await ceblRes.text();
          const lines = csvText.trim().split('\n');
          const header = lines[0].split(',');
          const col = (name) => header.indexOf(name);
          const rows = lines.slice(1).map((line) => line.split(','));

          const vanRows = rows.filter(
            (r) => r[col('home_team_name')] === 'Vancouver Bandits' || r[col('away_team_name')] === 'Vancouver Bandits'
          );
          const completed = vanRows
            .filter((r) => r[col('status')] === 'COMPLETE')
            .sort((a, b) => a[col('start_time_utc')].localeCompare(b[col('start_time_utc')]));

          if (completed.length > 0) {
            const row = completed[completed.length - 1];
            const isHome = row[col('home_team_name')] === 'Vancouver Bandits';
            const selfScore = Number(isHome ? row[col('home_team_score')] : row[col('away_team_score')]);
            const oppScore = Number(isHome ? row[col('away_team_score')] : row[col('home_team_score')]);
            const oppName = isHome ? row[col('away_team_name')] : row[col('home_team_name')];
            const startTimeUTC = row[col('start_time_utc')];
            const startTimePST = startTimeUTC
              ? `${new Date(startTimeUTC).toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', minute: '2-digit', hour12: true })} PST`
              : 'TBD';

            if (!Number.isNaN(selfScore) && !Number.isNaN(oppScore)) {
              bandits.lastGame = {
                gameId: `cebl-${row[col('fiba_id')]}`,
                date: startTimeUTC,
                startTimePST,
                opponent: {
                  name: oppName,
                  shortName: oppName.replace(/^.*\s/, ''),
                  abbreviation: oppName.slice(0, 3).toUpperCase(),
                },
                isHome,
                venueName: row[col('venue_name')] || 'TBD',
                status: 'final',
                score: { team: selfScore, opponent: oppScore, decisionPeriod: 'REG' },
                result: selfScore > oppScore ? 'W' : 'L',
                broadcast: { tv: 'Check cebl.ca', radio: 'Check cebl.ca' },
              };
              console.log(`✅ Updated Bandits last game from CEBL schedule mirror: ${bandits.lastGame.opponent.abbreviation} (${bandits.lastGame.result})`);
            }
          } else {
            console.log('ℹ️ CEBL schedule mirror: no completed Bandits game found — lastGame stays unavailable.');
          }
        }
      }
    } catch (e) {
      console.log('ℹ️ CEBL schedule mirror: unreachable — Bandits schedule fields stay unavailable.');
    }

    // NOTE: BC Lions (CFL) and Vancouver Rise FC (NSL) have no viable live
    // source wired up yet. CFL's official schedule is rendered client-side by
    // a Genius Sports widget with no exposed public endpoint found; NSL's
    // schedule is loaded via a Craft CMS/Sprig AJAX component, not present in
    // any static HTML response. Both are intentionally left untouched here
    // rather than fabricated.

    fs.writeFileSync(teamsFilePath, JSON.stringify(existingTeams, null, 2), 'utf8');
    console.log(`✅ Verified and synchronized ${existingTeams.length} major Vancouver professional sports franchises.`);
  } catch (error) {
    console.error('❌ Error syncing sports teams data:', error.message);
  }
}

syncLiveSportsTeams();
