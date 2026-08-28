import type { APIRoute } from 'astro';
import { TOOLS_REGISTRY } from '../config/tools';
import { getAllBeaches } from '../tools/can-i-swim/services/vchScraper';
import { getLiveRoutes } from '../tools/bc-ferries/services/ferryService';
import { getLiveMountains } from '../tools/mountain-snow/services/snowService';
import { getAllNeighbourhoods } from '../tools/carshare-parking/services/parkingEvaluator';
import { getLiveFacilities } from '../tools/health-wait-times/services/healthService';
import { getLiveCrossings } from '../tools/bridge-traffic/services/bridgeService';
import { getLiveStations } from '../tools/air-quality/services/airQualityService';
import { getLiveNews } from '../tools/local-news/services/newsService';
import { getLiveMarketHeartbeat } from '../tools/housing-market/services/marketService';
import { getLiveSportsFacilities } from '../tools/sports-facilities/services/sportsService';
import { getLiveWeather } from '../tools/weather-forecast/services/weatherService';
import { getAllTeams } from '../tools/sports-teams/services/sportsTeamsService';
import { getLiveSalesEvents } from '../tools/sales-events/services/salesService';

export const GET: APIRoute = async ({ request }) => {
  const reqUrl = new URL(request.url);
  const host = reqUrl.host;
  const protocol = reqUrl.protocol;
  const baseUrl = host ? `${protocol}//${host}` : 'https://vanheartbeat.ca';
  const now = new Date().toISOString();

  // 1. Static Root & Tool Hub Routes
  const staticRoutes = [
    { url: `${baseUrl}/`, priority: '1.0', changefreq: 'hourly' },
    ...TOOLS_REGISTRY.map((t) => ({
      url: `${baseUrl}${t.path}`,
      priority: '0.9',
      changefreq: 'hourly',
    })),
    { url: `${baseUrl}/about`, priority: '0.6', changefreq: 'monthly' },
    { url: `${baseUrl}/contact`, priority: '0.6', changefreq: 'monthly' },
    { url: `${baseUrl}/terms`, priority: '0.5', changefreq: 'monthly' },
    { url: `${baseUrl}/privacy`, priority: '0.5', changefreq: 'monthly' },
    { url: `${baseUrl}/cookies`, priority: '0.5', changefreq: 'monthly' },
  ];

  // 2. Dynamic Detail Slugs
  const dynamicRoutes: Array<{ url: string; priority: string; changefreq: string }> = [];

  // Can I Swim Beaches
  try {
    const beaches = getAllBeaches();
    beaches.forEach((b) => {
      dynamicRoutes.push({ url: `${baseUrl}/swim/${b.id}`, priority: '0.8', changefreq: 'daily' });
    });
  } catch (e) {}

  // BC Ferries
  try {
    const ferryRoutesResult = await getLiveRoutes();
    if (ferryRoutesResult.ok) {
      ferryRoutesResult.data.forEach((r) => {
        dynamicRoutes.push({ url: `${baseUrl}/ferries/${r.id}`, priority: '0.8', changefreq: 'always' });
      });
    }
  } catch (e) {}

  // Mountain Snow
  try {
    const mountainsResult = await getLiveMountains();
    if (mountainsResult.ok) {
      mountainsResult.data.forEach((m) => {
        dynamicRoutes.push({ url: `${baseUrl}/snow/${m.id}`, priority: '0.8', changefreq: 'hourly' });
      });
    }
  } catch (e) {}

  // Carshare Parking
  try {
    const neighbourhoods = getAllNeighbourhoods();
    neighbourhoods.forEach((n) => {
      dynamicRoutes.push({ url: `${baseUrl}/parking/${n.slug}`, priority: '0.8', changefreq: 'daily' });
    });
  } catch (e) {}

  // Health / ER
  try {
    const facilitiesResult = await getLiveFacilities();
    if (facilitiesResult.ok) {
      facilitiesResult.data.forEach((f) => {
        dynamicRoutes.push({ url: `${baseUrl}/health/${f.id}`, priority: '0.8', changefreq: 'always' });
      });
    }
  } catch (e) {}

  // Bridges & Tunnels
  try {
    const crossingsResult = await getLiveCrossings();
    if (crossingsResult.ok) {
      crossingsResult.data.forEach((c) => {
        dynamicRoutes.push({ url: `${baseUrl}/bridges/${c.id}`, priority: '0.8', changefreq: 'always' });
      });
    }
  } catch (e) {}

  // Air Quality
  try {
    const stationsResult = await getLiveStations();
    if (stationsResult.ok) {
      stationsResult.data.forEach((s) => {
        dynamicRoutes.push({ url: `${baseUrl}/air/${s.id}`, priority: '0.8', changefreq: 'hourly' });
      });
    }
  } catch (e) {}

  // Local News Articles
  try {
    const articlesResult = await getLiveNews();
    if (articlesResult.ok) {
      articlesResult.data.forEach((a) => {
        dynamicRoutes.push({ url: `${baseUrl}/news/${a.id}`, priority: '0.8', changefreq: 'hourly' });
      });
    }
  } catch (e) {}

  // Real Estate Submarkets
  try {
    const marketResult = await getLiveMarketHeartbeat();
    if (marketResult.ok) {
      marketResult.data.submarkets.forEach((sm) => {
        dynamicRoutes.push({ url: `${baseUrl}/market/${sm.id}`, priority: '0.7', changefreq: 'daily' });
      });
    }
  } catch (e) {}

  // Sports Facilities
  try {
    const sportsResult = await getLiveSportsFacilities();
    if (sportsResult.ok) {
      sportsResult.data.forEach((sp) => {
        dynamicRoutes.push({ url: `${baseUrl}/sports/${sp.id}`, priority: '0.7', changefreq: 'daily' });
      });
    }
  } catch (e) {}

  // Weather Microclimates
  try {
    const weatherResult = await getLiveWeather();
    if (weatherResult.ok) {
      weatherResult.data.forEach((ws) => {
        dynamicRoutes.push({ url: `${baseUrl}/weather/${ws.id}`, priority: '0.8', changefreq: 'hourly' });
      });
    }
  } catch (e) {}

  // Major Sports Teams
  try {
    getAllTeams().forEach((tm) => {
      dynamicRoutes.push({ url: `${baseUrl}/sports-teams/${tm.id}`, priority: '0.8', changefreq: 'daily' });
    });
  } catch (e) {}

  // Warehouse & Sample Sales
  try {
    const salesResult = await getLiveSalesEvents();
    if (salesResult.ok) {
      salesResult.data.forEach((sl) => {
        dynamicRoutes.push({ url: `${baseUrl}/sales/${sl.id}`, priority: '0.8', changefreq: 'daily' });
      });
    }
  } catch (e) {}

  const allUrls = [...staticRoutes, ...dynamicRoutes];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (item) => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
