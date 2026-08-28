import { liveFail, liveOk, type LiveResult } from './liveResult';

/**
 * Runtime per-module caching for getLive<ToolData>() loaders, backed by the
 * Cloudflare Workers Cache API (`caches.default`) — available directly in
 * the Pages Functions edge runtime, no KV namespace to provision.
 *
 * A cache hit returns the last real upstream payload (source: 'cache'), so
 * we're not hammering upstream APIs every request. A cache miss must reach
 * a real upstream — on failure this returns `ok: false`, never a stale
 * baseline dressed up as current (see issue #35).
 */
export async function withEdgeCache<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetchLive: () => Promise<T | null>
): Promise<LiveResult<T>> {
  const cache: Cache | undefined = (globalThis as any).caches?.default;
  const requestKey = new Request(`https://edge-cache.vanheartbeat.internal/${cacheKey}`);

  if (cache) {
    const cached = await cache.match(requestKey);
    if (cached) {
      const envelope = (await cached.json()) as { data: T; fetchedAt: string };
      return liveOk(envelope.data, envelope.fetchedAt, 'cache');
    }
  }

  let data: T | null;
  try {
    data = await fetchLive();
  } catch (e: any) {
    return liveFail(e?.message || 'Live upstream fetch threw an error');
  }

  if (data === null || data === undefined) {
    return liveFail('Live upstream returned no usable data');
  }

  const fetchedAt = new Date().toISOString();

  if (cache) {
    const envelope = { data, fetchedAt };
    const cacheResponse = new Response(JSON.stringify(envelope), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${ttlSeconds}`,
      },
    });
    await cache.put(requestKey, cacheResponse);
  }

  return liveOk(data, fetchedAt, 'live');
}
