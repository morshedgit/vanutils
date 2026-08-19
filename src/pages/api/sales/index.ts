import type { APIRoute } from 'astro';
import { getLiveSalesEvents, getSalesOverviewStats } from '../../../tools/sales-events/services/salesService';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') || undefined;

  const sales = await getLiveSalesEvents(category);
  const stats = await getSalesOverviewStats();

  return new Response(
    JSON.stringify({
      meta: {
        total: sales.length,
        category: category || 'all',
        stats,
        lastSync: new Date().toISOString(),
      },
      data: sales,
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
