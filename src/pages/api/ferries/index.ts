import type { APIRoute } from 'astro';
import { getLiveRoutes } from '../../../tools/bc-ferries/services/ferryService';
import type { RouteCategory, FerryProvider } from '../../../tools/bc-ferries/types';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') as FerryProvider | null;
  const category = url.searchParams.get('category') as RouteCategory | null;
  const search = url.searchParams.get('search')?.toLowerCase();

  let routes = await getLiveRoutes();

  if (provider) {
    routes = routes.filter((r) => r.provider === provider);
  }

  if (category && category !== 'all') {
    routes = routes.filter((r) => r.category === category);
  }

  if (search) {
    routes = routes.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.originTerminal.toLowerCase().includes(search) ||
        r.destinationTerminal.toLowerCase().includes(search)
    );
  }

  return new Response(
    JSON.stringify({
      total: routes.length,
      data: routes,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    }
  );
};
