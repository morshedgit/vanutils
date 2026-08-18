import type { APIRoute } from 'astro';
import { getLiveEvents, getEventById, getEventsOverviewStats } from '../../../tools/community-events/services/eventService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
    'Access-Control-Allow-Origin': '*',
  };

  const events = await getLiveEvents();

  if (id) {
    const event = getEventById(id, events);
    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify(event), {
      status: 200,
      headers,
    });
  }

  const stats = getEventsOverviewStats(events);

  return new Response(
    JSON.stringify({
      events,
      stats,
      totalEvents: events.length,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
