import type { NewsArticle, BreakingAlert, NewsCategory } from '../types';
import articlesData from '../data/articles.json';
import alertsData from '../data/alerts.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';
import { parseRssXml } from '../../../services/shared/xmlParser';
import { withEdgeCache } from '../../../services/shared/edgeCache';
import type { LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only — never presented as live telemetry values. See issue #35.
export const BASELINE_ARTICLES: NewsArticle[] = articlesData as NewsArticle[];
export const BASELINE_ALERTS: BreakingAlert[] = alertsData as BreakingAlert[];

const ALERTS_CACHE_TTL_SECONDS = 300; // ECCC warning feed polling interval
const ARTICLES_CACHE_TTL_SECONDS = 300; // CBC wire refresh interval

/**
 * Dynamically fetches live ECCC breaking weather alerts at the edge.
 * Returns ok:false (no baseline masquerading as live) when the upstream fetch fails.
 */
export async function getLiveBreakingAlerts(): Promise<LiveResult<BreakingAlert[]>> {
  return withEdgeCache('local-news-breaking-alerts', ALERTS_CACHE_TTL_SECONDS, async () => {
    const endpoint = 'https://weather.gc.ca/rss/warning/bc-74_e.xml';
    const res = await edgeFetch<string>(endpoint, { timeoutMs: 1200 });

    if (!res.data || typeof res.data !== 'string') return null;

    const items = parseRssXml(res.data);
    // An empty array here is a legitimate live result (no active watches/warnings),
    // not a failure — it must not fall back to baseline/stale alerts.
    const activeAlerts = items.filter((it) => !it.title.toLowerCase().includes('no watches or warnings in effect'));

    return activeAlerts.map((it, idx) => ({
      id: `eccc-alert-${idx}`,
      title: it.title,
      source: 'eccc_weather' as const,
      outletName: 'Environment Canada',
      severity: 'warning' as const,
      timestamp: it.pubDate || new Date().toISOString(),
      summary: it.description || it.title,
      actionUrl: it.link,
    }));
  });
}

/**
 * Dynamically fetches live CBC news wire articles at the edge.
 * Returns ok:false (no baseline masquerading as live) when the upstream fetch fails.
 */
export async function getLiveNews(): Promise<LiveResult<NewsArticle[]>> {
  return withEdgeCache('local-news-articles', ARTICLES_CACHE_TTL_SECONDS, async () => {
    const endpoint = 'https://www.cbc.ca/cmlink/rss-canada-britishcolumbia';
    const res = await edgeFetch<string>(endpoint, { timeoutMs: 1200 });

    if (!res.data || typeof res.data !== 'string') return null;

    const items = parseRssXml(res.data);
    if (items.length === 0) return null;

    return items.slice(0, 8).map((it, idx) => {
      const lower = `${it.title} ${it.description}`.toLowerCase();
      let category: NewsCategory = 'civic_politics';
      if (lower.includes('transit') || lower.includes('skytrain') || lower.includes('bus') || lower.includes('bridge') || lower.includes('ferry')) {
        category = 'transit_infrastructure';
      } else if (lower.includes('housing') || lower.includes('rent') || lower.includes('real estate') || lower.includes('rezoning')) {
        category = 'housing_development';
      } else if (lower.includes('weather') || lower.includes('smoke') || lower.includes('snow') || lower.includes('heat') || lower.includes('rain')) {
        category = 'weather_hazards';
      } else if (lower.includes('park') || lower.includes('swim') || lower.includes('event') || lower.includes('festival')) {
        category = 'parks_community';
      }

      return {
        id: `cbc-live-${idx}`,
        title: it.title,
        summary: it.description || it.title,
        source: 'cbc_vancouver' as const,
        outletName: 'CBC News',
        category,
        publishedAt: it.pubDate || new Date().toISOString(),
        url: it.link,
        isBreaking: idx === 0,
      };
    });
  });
}

export function getAllArticles(): NewsArticle[] {
  return BASELINE_ARTICLES;
}

export function getArticleById(id: string, list: NewsArticle[] = BASELINE_ARTICLES): NewsArticle | undefined {
  return list.find((a) => a.id.toLowerCase() === id.toLowerCase());
}

export function getCategoryMeta(category: NewsCategory) {
  switch (category) {
    case 'civic_politics':
      return {
        label: 'Civic & Politics',
        icon: '🏛️',
        badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
      };
    case 'transit_infrastructure':
      return {
        label: 'Transit & Roads',
        icon: '🚆',
        badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      };
    case 'housing_development':
      return {
        label: 'Housing & Development',
        icon: '🏗️',
        badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      };
    case 'weather_hazards':
      return {
        label: 'Weather & Hazards',
        icon: '🌦️',
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      };
    case 'parks_community':
    default:
      return {
        label: 'Parks & Community',
        icon: '🌳',
        badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      };
  }
}

export function getNewsOverviewStats(articles: NewsArticle[] = BASELINE_ARTICLES, alerts: BreakingAlert[] = BASELINE_ALERTS) {
  const activeAlertsCount = alerts.length;
  const transitReportsCount = articles.filter((a) => a.category === 'transit_infrastructure').length;
  const civicReportsCount = articles.filter((a) => a.category === 'civic_politics').length;

  return {
    totalArticles: articles.length,
    activeAlertsCount,
    transitReportsCount,
    civicReportsCount,
  };
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}
