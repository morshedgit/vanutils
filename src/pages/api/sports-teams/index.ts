import type { APIRoute } from 'astro';
import { getLiveSportsTeams, getTeamById } from '../../../tools/sports-teams/services/sportsTeamsService';

export const GET: APIRoute = async ({ url }) => {
  const teamId = url.searchParams.get('team');

  if (teamId) {
    const team = getTeamById(teamId);
    if (!team) {
      return new Response(JSON.stringify({ error: `Team '${teamId}' not found.` }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    return new Response(JSON.stringify(team), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  }

  const heartbeat = await getLiveSportsTeams();

  return new Response(JSON.stringify(heartbeat), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
};
