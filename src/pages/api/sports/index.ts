import type { APIRoute } from 'astro';
import { getLiveSportsFacilities, getFacilityById, getSportsOverviewStats } from '../../../tools/sports-facilities/services/sportsService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
    'Access-Control-Allow-Origin': '*',
  };

  const facilities = await getLiveSportsFacilities();

  if (id) {
    const facility = getFacilityById(id, facilities);
    if (!facility) {
      return new Response(JSON.stringify({ error: 'Facility not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify(facility), {
      status: 200,
      headers,
    });
  }

  const stats = getSportsOverviewStats(facilities);

  return new Response(
    JSON.stringify({
      facilities,
      stats,
      totalFacilities: facilities.length,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
