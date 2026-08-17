# Multi-Agent Development Configuration (AGENTS.md)

## 1. Overview & Architecture
This file defines specialized AI agent roles for developing, scaling, and maintaining the VanUtils platform and its micro-utility modules.

```
+─────────────────────────────────────────────────────────────+
|                    PLATFORM ORCHESTRATOR                    |
| (Manages tool registry, platform shell, core layout, review) |
+─────────────────────────────────────────────────────────────+
        │                           │                        │
        ▼                           ▼                        ▼
+───────────────────+      +───────────────────+    +──────────────────+
| TOOL MODULE AGENT |      | UI & DESIGN AGENT |    | EDGE & QA AGENT   |
| (Can I Swim MVP / |      | - Hub Directory   |    | - Cloudflare Edge |
| Data Ingestion)   |      | - Shared UI System|    | - Lighthouse 95+  |
| - Scrapers/Models |      | - Mobile PWA UX   |    | - Build Integrity |
+───────────────────+      +───────────────────+    +───────────────────+
```

## 2. Specialized Agent Roles

### Agent 1: Platform & Hub Architect (`Platform-Agent`)
- **Mission**: Maintain the overarching VanUtils hub layout, shared tool registry (`src/config/tools.ts`), and global routing.
- **Responsibilities**:
  - Maintain `src/layouts/PlatformLayout.astro` and `src/layouts/ToolLayout.astro`.
  - Implement the Hub homepage (`src/pages/index.astro`) with tool discovery, filtering, and status badges.
  - Enforce the modular tool directory structure for all new utilities.

### Agent 2: "Can I Swim" Module Specialist (`Swim-Tool-Agent`)
- **Mission**: Develop and maintain Tool #1 (`/swim`), handling Vancouver Coastal Health ingestion, bacterial thresholds, and beach views.
- **Responsibilities**:
  - Maintain seed data in `src/tools/can-i-swim/data/beaches.json`.
  - Implement health calculation logic (30-day geometric mean vs single-sample action limits).
  - Build `/swim/index.astro` and `/swim/[slug].astro` with responsive status badges and sparklines.

### Agent 3: UI/UX & Design System Specialist (`Design-Agent`)
- **Mission**: Implement clean, ultra-responsive Tailwind UI components across the platform.
- **Responsibilities**:
  - Build shared components in `src/components/shared/` (Header, ToolCard, StatusBadge, GeoPicker).
  - Enforce the **Zero-Fluff, High-Density Card Law**: Whole card is clickable (`<a>`), 80%+ space dedicated to direct live data, zero decorative icons/categories/nested buttons.
  - Maintain client-side pinning synchronization (`vanutils_pinned_<tool-id>`).
  - Optimize mobile layout and PWA touch interactions.

### Agent 4: Edge Infrastructure & QA Engineer (`Edge-QA-Agent`)
- **Mission**: Ensure zero-error Cloudflare Pages Server-Side Edge Rendering (`output: "server"`) builds and peak edge performance.
- **Responsibilities**:
  - Validate `astro.config.mjs`, `wrangler.json`, and dynamic `Cache-Control` header policies (`s-maxage` with `stale-while-revalidate`).
  - Execute `npm run check` and verify that all code compiles without Node runtime dependencies.
  - Enforce the **100% Real-Data Mandate**: Zero synthetic, mock, or fake data. All data must originate from official public APIs or verified live telemetry feeds.
  - Audit Lighthouse performance (95+ score target), accessibility, and SEO crawlability.

## 3. Multi-Tool Expansion Protocol
When expanding the platform with a new utility (e.g. BC Ferries Standby Radar):
1. **Module Scaffolding**: Create `src/tools/<tool-id>/` with types, data, services, and components.
2. **Dynamic Live Loader**: Implement `getLive<ToolData>()` querying authentic upstream APIs with a 1.2s timeout fallback.
3. **Registry Declaration**: Register in `src/config/tools.ts`.
4. **High-Density Card Implementation**: Implement in `src/components/shared/ToolCard.astro` ensuring:
   - The entire card is a clickable `<a>` container.
   - Maximize live data capacity (e.g. show 6-10+ live data points or routes).
   - Zero decorative fluff, category badges, or nested buttons.
   - Support ⭐ pinning synchronization via `localStorage`.
5. **Route Implementation**: Create `src/pages/<tool-id>/index.astro` and `src/pages/<tool-id>/[slug].astro` in Edge SSR mode with appropriate `Astro.response.headers.set('Cache-Control', 'public, s-maxage=..., stale-while-revalidate=...')`.
6. **Validation**: Ensure zero cross-tool dependencies and verify `npm run check` & `npm run build`.
