import type { APIRoute } from 'astro';
import { getLiveNews, getLiveBreakingAlerts, getArticleById, getNewsOverviewStats } from '../../../tools/local-news/services/newsService';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    'Access-Control-Allow-Origin': '*',
  };

  const articlesResult = await getLiveNews();
  const alertsResult = await getLiveBreakingAlerts();

  if (!articlesResult.ok) {
    return new Response(JSON.stringify({ error: articlesResult.error }), {
      status: 503,
      headers,
    });
  }

  const articles = articlesResult.data;
  const alerts = alertsResult.ok ? alertsResult.data : [];

  if (id) {
    const article = getArticleById(id, articles);
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify(article), {
      status: 200,
      headers,
    });
  }

  const stats = getNewsOverviewStats(articles, alerts);

  return new Response(
    JSON.stringify({
      articles,
      alerts,
      stats,
      totalArticles: articles.length,
      evaluatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers,
    }
  );
};
