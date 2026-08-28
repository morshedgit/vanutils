import type { APIRoute } from 'astro';
import { getLiveCrossings, getCrossingById } from '../../../tools/bridge-traffic/services/bridgeService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const crossingId = url.searchParams.get('crossing');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    'Access-Control-Allow-Origin': '*',
  };

  const crossingsResult = await getLiveCrossings();

  if (!crossingsResult.ok) {
    return new Response(JSON.stringify({ error: crossingsResult.error }), {
      status: 503,
      headers,
    });
  }

  const crossings = crossingsResult.data;

  if (crossingId) {
    const crossing = getCrossingById(crossingId, crossings);
    if (!crossing) {
      return new Response(JSON.stringify({ error: 'Crossing not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify(crossing), {
      status: 200,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      crossings,
      totalCrossings: crossings.length,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
