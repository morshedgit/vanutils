import type { APIRoute } from 'astro';
import { TOOLS_REGISTRY } from '../config/tools';

export const GET: APIRoute = async ({ request }) => {
  const reqUrl = new URL(request.url);
  const host = reqUrl.host;
  const protocol = reqUrl.protocol;
  const baseUrl = host ? `${protocol}//${host}` : 'https://vanheartbeat.ca';

  const markdown = `# VanHeartbeat — Metro Vancouver Live Civic Telemetry & Open Data

> Sub-second, zero-clutter, single-purpose live civic telemetry, municipal vital signs, and public utility radars for Metro Vancouver, British Columbia, Canada.

## Overview
VanHeartbeat is a high-density, real-time civic pulse platform for Metro Vancouver residents, commuters, and visitors. All data originates from official public authorities including Environment and Climate Change Canada, Vancouver Coastal Health, TransLink, BC Ferries, DriveBC, Vancouver School Board, Greater Vancouver REALTORS®, and the City of Vancouver Open Data Portal.

- **Primary Website**: ${baseUrl}
- **Geographic Coverage**: Metro Vancouver (Vancouver, Burnaby, Richmond, North Vancouver, West Vancouver, Surrey, Delta, Coquitlam, New Westminster, Sea-to-Sky)
- **Timezone**: America/Vancouver (PST/PDT)
- **Full Live Telemetry Feed**: ${baseUrl}/llms-full.txt

## Live Utility Radars & Hubs

${TOOLS_REGISTRY.map(
  (tool, idx) => `### ${idx + 1}. ${tool.name}
- **URL**: ${baseUrl}${tool.path}
- **Description**: ${tool.shortDescription}
- **Category**: ${tool.category}
- **Badge**: ${tool.badgeText}
`
).join('\n')}

## Public REST Endpoints & Feeds
- **Sitemap XML**: ${baseUrl}/sitemap.xml
- **Full LLM Telemetry (Aggregated Markdown)**: ${baseUrl}/llms-full.txt
- **Housing Market JSON API**: ${baseUrl}/api/market
- **Sports Teams JSON API**: ${baseUrl}/api/sports-teams

## Contact & Attributions
- **Contact**: contact@vanheartbeat.ca
- **Attributions**: City of Vancouver Open Data, Environment Canada, Vancouver Coastal Health, DriveBC, BC Ferries, BC Ministry of Environment, Bank of Canada.
`;

  return new Response(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
