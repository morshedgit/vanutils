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
  - Build shared components in `src/components/shared/` (Header, SearchInput, StatusBadge, TagFilter, GeoPicker).
  - Ensure strict semantic colour contrast for all status states (Emerald/Amber/Rose/Slate).
  - Optimize mobile layout and PWA touch interactions.

### Agent 4: Edge Infrastructure & QA Engineer (`Edge-QA-Agent`)
- **Mission**: Ensure zero-error Cloudflare Pages builds and peak edge performance.
- **Responsibilities**:
  - Validate `astro.config.mjs` and `public/_headers` caching policies.
  - Execute `npm run check` and verify that all code compiles without Node runtime dependencies.
  - Audit Lighthouse performance, accessibility, best practices, and SEO.

## 3. Multi-Tool Expansion Protocol
When expanding the platform with a new utility (e.g. BC Ferries Standby Radar):
1. **Module Scaffolding**: Create `src/tools/<tool-id>/` with types and services.
2. **Registry Declaration**: Register in `src/config/tools.ts` with icon and status.
3. **Route Implementation**: Create `src/pages/<tool-id>/index.astro` using `ToolLayout`.
4. **Validation**: Ensure zero cross-tool dependencies and verify `npm run build`.
