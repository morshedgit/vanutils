import type { APIRoute } from 'astro';
import { getLiveBeaches, filterBeaches, getBeachStats } from '../../../tools/can-i-swim/services/vchScraper';
import type { BeachFilterOptions } from '../../../tools/can-i-swim/types';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const params = url.searchParams;

  const query = params.get('q') || undefined;
  const municipality = params.get('municipality') || undefined;
  const status = params.get('status') || undefined;
  const waterType = params.get('waterType') || undefined;
  const dogFriendly = params.get('dogFriendly') === 'true' ? true : undefined;
  const lifeguards = params.get('lifeguards') === 'true' ? true : undefined;
  const wheelchairAccessible = params.get('wheelchairAccessible') === 'true' ? true : undefined;
  const washrooms = params.get('washrooms') === 'true' ? true : undefined;
  const sortBy = (params.get('sortBy') as BeachFilterOptions['sortBy']) || 'cleanest';

  const latParam = params.get('lat');
  const lngParam = params.get('lng');
  const userLat = latParam ? parseFloat(latParam) : undefined;
  const userLng = lngParam ? parseFloat(lngParam) : undefined;

  const filterOptions: BeachFilterOptions = {
    query,
    municipality,
    status,
    waterType,
    dogFriendly,
    lifeguards,
    wheelchairAccessible,
    washrooms,
    sortBy,
    userLat,
    userLng,
  };

  const allBeaches = await getLiveBeaches();
  const filtered = filterBeaches(allBeaches, filterOptions);
  const stats = getBeachStats(allBeaches);

  return new Response(
    JSON.stringify({
      success: true,
      meta: {
        totalBeaches: stats.total,
        safeBeaches: stats.safe,
        cautionBeaches: stats.caution,
        advisoryBeaches: stats.advisory,
        cleanPercentage: stats.cleanPercentage,
        lastUpdated: new Date().toISOString(),
        dataSource: 'Vancouver Coastal Health & Fraser Health Authority Recreational Water Surveillance',
      },
      count: filtered.length,
      beaches: filtered,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
