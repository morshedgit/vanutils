# Claude & AI Assistant Guidelines (CLAUDE.md) — VanUtils

## 1. Project Overview
- **Repository**: `vanutils` (Vancouver Micro-Utilities Hub)
- **Goal**: A high-speed, modular suite of hyper-local micro-tools for Metro Vancouver residents, starting with **Can I Swim?** (`/swim`) as the MVP flagship utility.
- **Stack**: Astro (Hybrid/Cloudflare Pages Adapter), TypeScript, Tailwind CSS.
- **Deployment**: Automated builds directly on Cloudflare Pages via GitHub push.

## 2. Developer Commands
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run type check
npm run check

# Build production bundle for Cloudflare Pages
npm run build

# Preview build locally
npm run preview
```

## 3. Modular Development Rules & Conventions
- **Rule 1: Tool Module Isolation**: Every new micro-utility is housed in `src/tools/<tool-name>/`. Tools must remain self-contained with their own types, services, and components. Register new tools in `src/config/tools.ts` to automatically expose them on the Hub (`/`).
- **Rule 2: Shared UI & Layout Usage**: Pages must wrap inside `src/layouts/PlatformLayout.astro` (for Hub) or `src/layouts/ToolLayout.astro` (for specific utilities) to ensure unified navigation, geolocation context, and branding.
- **Rule 3: Client JavaScript Budget**: Keep total client JS bundle strictly < 25KB. Use server-rendered Astro components by default. Use client islands only when real-time client state (filtering, geolocation distance sorting) is required.
- **Rule 4: Cloudflare Edge Compatibility**: Do NOT import Node.js native libraries (`fs`, `path`, `child_process`) in runtime edge code. Use Web Standard APIs (`fetch`, `Request`, `Response`, `URLSearchParams`).
- **Rule 5: Zero-Fluff, High-Density Dashboard Card Standard**: Main dashboard utility cards must be 100% clickable containers (`<a>`), allocate 80%+ of card space to direct live data points (e.g. 8-12+ live beaches or routes), and eliminate decorative icon boxes, category pills, verbose subheaders, and redundant buttons. Support ⭐ pinning synced via `localStorage`.
- **Rule 6: 100% Real-Data Mandate**: Zero synthetic, mock, or fake data permitted in any tool or card. If data is unmonitored or awaiting lab testing, present this status transparently.
- **Rule 7: Server-Side Edge Rendering (SSR) & Dynamic Caching**: Use `output: 'server'` on Cloudflare Edge with async loaders (`getLive*()`) and declare tiered caching headers (`Cache-Control: public, s-maxage=..., stale-while-revalidate=...`).

## 4. How to Add a New Micro-Utility
1. **Create Module**: Add `src/tools/<new-tool>/` with `types.ts`, `data/`, `services/`, and `components/`.
2. **Implement Async Edge Loader**: Create `getLive<ToolData>()` in `services/` with a 1.2s timeout fallback.
3. **Register Tool**: Add metadata entry to `src/config/tools.ts`.
4. **Build High-Density Card**: Implement in `src/components/shared/ToolCard.astro` following Rule 5.
5. **Add Pages**: Create `src/pages/<new-tool>/index.astro` and `src/pages/<new-tool>/[slug].astro` in Edge SSR mode with `Cache-Control` response headers.
6. **Test & Verify**: Run `npm run check` and `npm run build` to verify Cloudflare output.
