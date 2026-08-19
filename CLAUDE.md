# Claude & AI Assistant Guidelines (CLAUDE.md) — VanHeartbeat

## 1. Project Overview
- **Repository**: `vanutils` (VanHeartbeat — Vancouver Live Civic Telemetry Hub)
- **Domain**: `https://vanheartbeat.ca`
- **Stack**: Astro (Hybrid/Cloudflare Pages Adapter, `output: "server"`), TypeScript, Tailwind CSS.
- **Deployment**: Automated builds on Cloudflare Pages via GitHub push.

## 2. Developer Commands
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run full official public data synchronization
npm run data:sync:all

# Run type check
npm run check

# Build production bundle for Cloudflare Pages Edge SSR
npm run build

# Preview build locally
npm run preview
```

## 3. Core Architectural Rules & Mandates

### 🚫 Rule 1: The 100% Real-Data Mandate & Anti-Fake Law
- **Zero Synthetic Math**: Never use `Math.sin`, `Math.random`, `idx * factor`, or synthetic curves to invent data points, historical sparklines, bacteria counts, or wait times.
- **Zero Timestamp-Only Syncs**: `scripts/sync-live-*.js` must never just touch `lastUpdated` without parsing authentic upstream data.
- **Zero Simulated Latency**: Never use fake `setTimeout()` promises in `services/`.
- **Zero Fabricated Baselines**: Static baseline JSON in `src/tools/*/data/` must be snapshots from official government/open data sources.
- **Explicit Stale Failover**: If an upstream API fails, transparently return `isStale: true` with the last authentic timestamp. Never invent numbers.

### ⚡ Rule 2: The 5-Pillar Runtime Edge Ingestion Practice
1. **Dynamic Edge Loader**: Every tool must implement `getLive<ToolData>()` called in Edge SSR (`output: "server"`).
2. **1.2s Timeout SLA**: Wrap all network calls in `edgeFetch()` (`AbortSignal.timeout(1200)`).
3. **100% Real Upstream Endpoints**: Query official public REST, XML, or GeoJSON APIs directly.
4. **Resilient Failover**: Fall back to verified baseline with `isStale: true` on timeout/error.
5. **Tiered Edge Caching**: Set appropriate `Cache-Control: public, s-maxage=..., stale-while-revalidate=...` response headers.

### 🎨 Rule 3: Zero-Fluff, High-Density Card Standard
- Main dashboard cards (`src/components/shared/ToolCard.astro`) must be 100% clickable containers (`<a>`).
- 80%+ of card space must display direct live telemetry (e.g. 6–12+ live data points or routes).
- Zero decorative icon boxes, category pills, verbose subheaders, or nested buttons.
- Support ⭐ pinning synchronized via `localStorage` (`vanutils_pinned_<tool-id>`).

### 🌐 Rule 4: Generative Engine Optimization (GEO) & Knowledge Graph
- Maintain canonical domain `https://vanheartbeat.ca`.
- Update `/llms.txt` and `/llms-full.txt` when adding utilities.
- Link subpage JSON-LD schemas to Wikidata `sameAs` entity IDs.
- Include `<RelatedTelemetry />` cross-utility linking mesh on dynamic subpages.

### 📦 Rule 5: Cloudflare Edge Compatibility & JS Budget
- Keep client JS strictly < 25KB.
- Do NOT import Node.js native libraries (`fs`, `path`, `child_process`) in runtime edge code (`src/`).
- Use Web Standard APIs (`fetch`, `Request`, `Response`, `URLSearchParams`).

## 4. Multi-Tool Expansion Protocol
1. **Module Scaffolding**: Create `src/tools/<tool-id>/` with `types.ts`, `data/`, `services/`, and `components/`.
2. **Implement Async Edge Loader**: Create `getLive<ToolData>()` with `edgeFetch()` (1.2s timeout).
3. **Add Sync Script**: Add `scripts/sync-live-<tool-id>.js` and wire into `npm run data:sync:all`.
4. **Register Tool**: Add metadata entry in `src/config/tools.ts`.
5. **Build Card**: Implement high-density presentation in `src/components/shared/ToolCard.astro`.
6. **Add SSR Routes**: Create `src/pages/<tool-id>/index.astro` and `src/pages/<tool-id>/[slug].astro` with `Cache-Control` headers.
7. **Verify**: Run `npm run data:sync:all`, `npm run check`, and `npm run build`.
