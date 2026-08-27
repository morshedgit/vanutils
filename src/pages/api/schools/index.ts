import type { APIRoute } from 'astro';
import { getLiveSchools, getSchoolById, getAllChildcares, getSchoolsOverviewStats } from '../../../tools/school-catchment/services/catchmentService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    'Access-Control-Allow-Origin': '*',
  };

  const schoolsResult = await getLiveSchools();
  const childcares = getAllChildcares();

  if (!schoolsResult.ok) {
    return new Response(JSON.stringify({ error: schoolsResult.error }), {
      status: 503,
      headers,
    });
  }

  const schools = schoolsResult.data;

  if (id) {
    const school = getSchoolById(id, schools);
    if (!school) {
      return new Response(JSON.stringify({ error: 'School not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify(school), {
      status: 200,
      headers,
    });
  }

  const stats = getSchoolsOverviewStats(schools, childcares);

  return new Response(
    JSON.stringify({
      schools,
      childcares,
      stats,
      totalSchools: schools.length,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
