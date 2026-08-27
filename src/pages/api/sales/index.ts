import type { APIRoute } from 'astro';
import { getLiveSalesEvents, getSalesOverviewStats } from '../../../tools/sales-events/services/salesService';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') || undefined;

  const salesResult = await getLiveSalesEvents(category);

  if (!salesResult.ok) {
    return new Response(JSON.stringify({ error: salesResult.error }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
      },
    });
  }

  const stats = await getSalesOverviewStats();

  return new Response(
    JSON.stringify({
      meta: {
        total: salesResult.data.length,
        category: category || 'all',
        stats,
        lastSync: new Date().toISOString(),
      },
      data: salesResult.data,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
      },
    }
  );
};
