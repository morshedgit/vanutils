import type { APIRoute } from 'astro';
import { getLiveMarketHeartbeat, getSubmarketById } from '../../../tools/housing-market/services/marketService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const submarketId = url.searchParams.get('submarket') || url.searchParams.get('id');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    'Access-Control-Allow-Origin': '*',
  };

  const data = await getLiveMarketHeartbeat();

  if (submarketId) {
    const submarket = getSubmarketById(submarketId, [data.metroOverview, ...data.submarkets]);
    if (!submarket) {
      return new Response(JSON.stringify({ error: 'Submarket not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify(submarket), {
      status: 200,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      ...data,
      totalSubmarkets: data.submarkets.length + 1,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
