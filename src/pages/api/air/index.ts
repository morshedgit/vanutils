import type { APIRoute } from 'astro';
import { getLiveStations, getStationById, getAllShelters } from '../../../tools/air-quality/services/airQualityService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const stationId = url.searchParams.get('station');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
    'Access-Control-Allow-Origin': '*',
  };

  const stations = await getLiveStations();
  const shelters = getAllShelters();

  if (stationId) {
    const station = getStationById(stationId, stations);
    if (!station) {
      return new Response(JSON.stringify({ error: 'Station not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify(station), {
      status: 200,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      stations,
      shelters,
      totalStations: stations.length,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
