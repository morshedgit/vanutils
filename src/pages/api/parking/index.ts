import type { APIRoute } from 'astro';
import { getLiveNeighbourhoods, getNeighbourhoodBySlug, evaluateNeighbourhoodSpot } from '../../../tools/carshare-parking/services/parkingEvaluator';
import { getAllSatelliteLots } from '../../../tools/carshare-parking/services/satelliteService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const neighbourhoodSlug = url.searchParams.get('neighbourhood');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*',
  };

  const neighbourhoodsResult = await getLiveNeighbourhoods();

  if (!neighbourhoodsResult.ok) {
    return new Response(JSON.stringify({ error: neighbourhoodsResult.error }), {
      status: 503,
      headers,
    });
  }

  const allNeighbourhoods = neighbourhoodsResult.data;

  if (neighbourhoodSlug) {
    const neighbourhood = getNeighbourhoodBySlug(neighbourhoodSlug, allNeighbourhoods);
    if (!neighbourhood) {
      return new Response(JSON.stringify({ error: 'Neighbourhood not found' }), {
        status: 404,
        headers,
      });
    }

    const evaluation = evaluateNeighbourhoodSpot(neighbourhood);
    return new Response(JSON.stringify(evaluation), {
      status: 200,
      headers,
    });
  }

  const allLots = getAllSatelliteLots();
  const evaluations = allNeighbourhoods.map((n) => evaluateNeighbourhoodSpot(n));

  return new Response(
    JSON.stringify({
      neighbourhoods: evaluations,
      satelliteLots: allLots,
      totalZones: evaluations.length,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
