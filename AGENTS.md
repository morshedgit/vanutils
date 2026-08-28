# Multi-Agent Development Configuration & Architecture Specification (AGENTS.md)

## 1. Platform Overview & System Architecture
VanHeartbeat (VanUtils) is a high-speed, zero-clutter civic telemetry platform for Metro Vancouver. Every micro-utility card must deliver sub-second, 100% authentic, real-time public telemetry rendered at the Cloudflare Edge.

```
+─────────────────────────────────────────────────────────────────────────────+
|                         PLATFORM ORCHESTRATOR                               |
|   (Manages tool registry, platform shell, core layout, architecture review) |
+─────────────────────────────────────────────────────────────────────────────+
        │                           │                                  │
        ▼                           ▼                                  ▼
+───────────────────+      +───────────────────+             +──────────────────+
| TOOL MODULE AGENT |      | UI & DESIGN AGENT |             | EDGE & QA AGENT  |
| - Edge Ingestion  |      | - Hub Directory   |             | - Cloudflare Edge|
| - Real Telemetry  |      | - High-Density UI |             | - Real-Data Audit|
| - Upstream Feeds  |      | - Mobile PWA UX   |             | - Build & Cache  |
+───────────────────+      +───────────────────+             +──────────────────+
```

---

## 2. The 100% Real-Data Mandate & Anti-Fake Protocols

VanHeartbeat operates under a strict **Zero-Fake / Zero-Stale Law**. AI agents and developers must strictly adhere to the following anti-fake architectural rules:

### 🚫 Prohibited Practices:
1. **Zero Mathematical Generators**: Never use mathematical formulas (`Math.sin`, `Math.random`, `idx * factor`) to synthesize trendlines, bacteria counts, wait times, or weather values.
2. **Zero Timestamp-Only Syncs**: Synchronization scripts in `scripts/` must never simply touch `lastUpdated = new Date().toISOString()` on static data. Every sync script must parse real data from an authentic public endpoint. These scripts are manual/one-time seed-refresh tools only — never part of `npm run build` or the request path.
3. **Zero Simulated Timeouts**: Never use `setTimeout()` or artificial promises to mimic network latency in `services/`.
4. **Zero Synthetic / Mock Baselines**: Baseline snapshots in `src/tools/*/data/*.json` must originate from verified historical open datasets or official public releases, never fabricated, and exist as **seed/reference metadata only** — never rendered to end users as if it were current live telemetry.
5. **Zero Silent Fallbacks**: If an upstream public API is unavailable, `getLive<ToolData>()` must return an explicit `{ ok: false, error }` (see `src/services/shared/liveResult.ts`) — never baseline data dressed up as current. Pages and cards must render a dedicated "Live data unavailable" state instead of numbers. Never invent fallback numbers, and never let a failure look like a live reading.

---

## 3. The 5-Pillar Runtime Edge Ingestion Practice

Every utility module on VanHeartbeat must follow this standardized runtime edge architecture:

```
                  USER REQUEST (Cloudflare Edge Worker)
                                 │
                                 ▼
             +───────────────────────────────────────+
             |       getLive<ToolData>() Loader      |
             +───────────────────────────────────────+
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
         [Upstream API Request]     [1.2s Timeout Timer]
           (edgeFetch / 100% Real)     (AbortSignal)
                    │                         │
                    └────────────┬────────────┘
                                 ▼
             +───────────────────────────────────────+
             |             RACE RESOLUTION           |
             +───────────────────────────────────────+
              /                                     \
    (Resolved < 1.2s)                         (Timed out / Errored)
            │                                           │
            ▼                                           ▼
+───────────────────────+                   +───────────────────────+
| Fresh Live Telemetry  |                   |   Explicit Failure    |
| - 100% Real Values    |                   |  - ok: false          |
| - ok: true            |                   |  - No numbers shown   |
+───────────────────────+                   +───────────────────────+
            │                                           │
            └────────────────────┬──────────────────────┘
                                 ▼
+───────────────────────────────────────────────────────────────────+
|               TIERED CLOUDFLARE EDGE CACHE-CONTROL                |
|       Cache-Control: public, s-maxage=..., stale-while-revalidate=...
+───────────────────────────────────────────────────────────────────+
```

### Pillar Specifications:
1. **Dynamic Edge Loader (`getLive<ToolData>()`)**: Every tool must export an async loader executed dynamically on each Server-Side Rendered (SSR) Edge request (`output: "server"`), returning `Promise<LiveResult<ToolData>>` (`src/services/shared/liveResult.ts`). This is the sole source of live values — data is never baked in at build/deploy time.
2. **Aggressive 1.2s Timeout SLA (`edgeFetch`)**: All upstream HTTP requests must be wrapped with `AbortSignal.timeout(1200)` using `services/shared/edgeFetch.ts` to ensure edge responses render in $< 1.2\text{s}$ without blocking the user.
3. **100% Real Upstream Public Feeds**: Upstream data must originate from official public APIs, REST feeds, or XML/RSS feeds (e.g. DriveBC Open511, BC Ferries, Open-Meteo, Vancouver Coastal Health, Bank of Canada, City Open Data).
4. **Explicit Failure, No Fallback**: If the upstream API times out ($> 1200\text{ms}$) or errors, the loader returns `{ ok: false, error }` — never baseline data. `scripts/sync-live-*.js` are manual/one-time baseline-seeding tools only, run by hand, never part of the build or request path.
5. **Per-Module Edge Caching + Tiered Cache-Control Headers**: Wrap the upstream fetch with `withEdgeCache()` (`src/services/shared/edgeCache.ts`, Cloudflare Workers Cache API) using a TTL matched to real-world change frequency, and set `s-maxage`/`stale-while-revalidate` accordingly:
   - *Rapid Transit & Ferries* (`/ferries`, `/bridges`): `public, s-maxage=60, stale-while-revalidate=120`
   - *Emergency & Weather* (`/health`, `/weather`, `/air`, `/snow`): `public, s-maxage=300, stale-while-revalidate=600`
   - *Sports & News* (`/sports-teams`, `/news`): `public, s-maxage=600, stale-while-revalidate=1200`
   - *Civic, Housing & Events* (`/market`, `/civic`, `/sales`, `/events`, `/parking`, `/schools`, `/sports`): `public, s-maxage=3600, stale-while-revalidate=86400`

---

## 4. Specialized Agent Roles

### Agent 1: Platform & Hub Architect (`Platform-Agent`)
- **Mission**: Maintain the overarching VanHeartbeat layout, shared tool registry (`src/config/tools.ts`), and global routing.
- **Responsibilities**:
  - Maintain `src/layouts/PlatformLayout.astro` and `src/layouts/ToolLayout.astro`.
  - Enforce domain consistency (`https://vanheartbeat.ca`), `llms.txt` standards, and global SEO/GEO schemas.
  - Enforce the modular tool directory structure and prevent cross-tool dependency pollution.

### Agent 2: Telemetry & Ingestion Specialist (`Telemetry-Agent`)
- **Mission**: Develop and maintain authentic data ingestion pipelines, sync scripts in `scripts/`, and edge services in `src/tools/<tool-id>/services/`.
- **Responsibilities**:
  - Connect to official municipal, provincial, and federal open APIs.
  - Implement edge parsers (`xmlParser.ts`, `geoJsonNormalizer.ts`) with zero Node runtime dependencies.
  - Enforce the 1.2s timeout SLA and zero-synthetic data mandate across all tools.

### Agent 3: UI/UX & Design System Specialist (`Design-Agent`)
- **Mission**: Implement clean, ultra-responsive Tailwind UI components across the platform.
- **Responsibilities**:
  - Enforce the **Zero-Fluff, High-Density Card Law**: Whole card is clickable (`<a>`), 80%+ space dedicated to direct live data, zero decorative icons/categories/nested buttons.
  - Maintain client-side pinning synchronization (`vanutils_pinned_<tool-id>`).
  - Optimize mobile layout, micro-sparklines, and PWA touch interactions.

### Agent 4: Edge Infrastructure & QA Engineer (`Edge-QA-Agent`)
- **Mission**: Ensure zero-error Cloudflare Pages Server-Side Edge Rendering (`output: "server"`) builds and peak edge performance.
- **Responsibilities**:
  - Validate `astro.config.mjs`, `wrangler.json`, and dynamic `Cache-Control` header policies.
  - Audit codebase for any synthetic math or timestamp-only sync scripts (`grep -rn "Math.sin"` / `grep -rn "Math.random"`).
  - Execute `npm run check` and `npm run build` to verify Cloudflare Edge compatibility.

---

## 5. Multi-Tool Expansion & Verification Protocol

When creating or modifying a utility module:
1. **Module Scaffolding**: Create `src/tools/<tool-id>/` with `types.ts`, `data/`, `services/`, and `components/`.
2. **Authentic Upstream Ingestion**: Implement `getLive<ToolData>()` using `edgeFetch()` (1.2s SLA) connected to a verified public endpoint.
3. **Verified Baseline Snapshot**: Store authentic baseline records in `src/tools/<tool-id>/data/` and provide a corresponding `scripts/sync-live-<tool-id>.js`.
4. **Registry Declaration**: Register tool metadata in `src/config/tools.ts`.
5. **High-Density Card Implementation**: Implement in `src/components/shared/ToolCard.astro` following the Zero-Fluff, High-Density Card standard.
6. **Route Implementation**: Create `src/pages/<tool-id>/index.astro` and `src/pages/<tool-id>/[slug].astro` in Edge SSR mode with tiered `Cache-Control` headers and Wikidata `sameAs` entity links.
7. **Verification**: Run `npm run check` and `npm run build` (`data:sync:all` is a manual seed-refresh command, not part of build verification).
