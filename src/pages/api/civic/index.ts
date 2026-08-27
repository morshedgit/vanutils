import type { APIRoute } from 'astro';
import { getLiveProposals, getProposalById, getCivicOverviewStats } from '../../../tools/civic-development/services/civicService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*',
  };

  const proposalsResult = await getLiveProposals();

  if (!proposalsResult.ok) {
    return new Response(JSON.stringify({ error: proposalsResult.error }), {
      status: 503,
      headers,
    });
  }

  const proposals = proposalsResult.data;

  if (id) {
    const proposal = getProposalById(id, proposals);
    if (!proposal) {
      return new Response(JSON.stringify({ error: 'Proposal not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify(proposal), {
      status: 200,
      headers,
    });
  }

  const stats = getCivicOverviewStats(proposals);

  return new Response(
    JSON.stringify({
      proposals,
      stats,
      totalProposals: proposals.length,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
