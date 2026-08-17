import type { APIRoute } from 'astro';
import { getLiveFacilities, getFacilityById } from '../../../tools/health-wait-times/services/healthService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const facilityId = url.searchParams.get('facility');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    'Access-Control-Allow-Origin': '*',
  };

  const facilities = await getLiveFacilities();

  if (facilityId) {
    const facility = getFacilityById(facilityId, facilities);
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

  return new Response(
    JSON.stringify({
      facilities,
      totalFacilities: facilities.length,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
