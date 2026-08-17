import type { APIRoute } from 'astro';
import { getAllNeighbourhoods, getNeighbourhoodBySlug, evaluateNeighbourhoodSpot } from '../../../tools/carshare-parking/services/parkingEvaluator';
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

  if (neighbourhoodSlug) {
    const neighbourhood = getNeighbourhoodBySlug(neighbourhoodSlug);
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

  const allNeighbourhoods = getAllNeighbourhoods();
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
