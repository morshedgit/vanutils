import type { APIRoute } from 'astro';
import { getLiveMountains } from '../../../tools/mountain-snow/services/snowService';
import type { MountainRegion } from '../../../tools/mountain-snow/types';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const region = url.searchParams.get('region') as MountainRegion | null;
  const search = url.searchParams.get('search')?.toLowerCase();

  let mountains = await getLiveMountains();

  if (region && region !== 'all') {
    mountains = mountains.filter((m) => m.region === region);
  }

  if (search) {
    mountains = mountains.filter(
      (m) =>
        m.name.toLowerCase().includes(search) ||
        m.id.toLowerCase().includes(search)
    );
  }

  return new Response(
    JSON.stringify({
      total: mountains.length,
      data: mountains,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
};
