/**
 * Universal Edge Fetch Client for Cloudflare Workers V8 Isolates
 * Enforces 1.2s Fast Dynamic Loader Protocol with graceful timeout recovery
 */

export interface EdgeFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function edgeFetch<T = any>(
  url: string,
  options: EdgeFetchOptions = {}
): Promise<{ data: T | null; status: number; durationMs: number }> {
  const timeoutMs = options.timeoutMs || 1200; // 1.2s default timeout SLA
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'User-Agent': 'VanHeartbeat/1.0 (https://vanheartbeat.com; contact@vanheartbeat.com)',
    'Accept': 'application/json, text/xml, application/xml, text/plain, */*',
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        data: null,
        status: response.status,
        durationMs,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    let parsedData: any = null;

    if (contentType.includes('application/json') || contentType.includes('+json')) {
      parsedData = await response.json();
    } else {
      parsedData = await response.text();
    }

    return {
      data: parsedData as T,
      status: response.status,
      durationMs,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    return {
      data: null,
      status: error.name === 'AbortError' ? 408 : 500,
      durationMs,
    };
  }
}
