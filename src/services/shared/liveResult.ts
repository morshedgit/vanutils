/**
 * Explicit-failure contract for every getLive<ToolData>() edge loader.
 * Replaces the old pattern of returning baseline data with an `isStale: true`
 * flag — that data was rendered to users as if it were current. A failed
 * live fetch must produce `ok: false` so callers render a dedicated error
 * state instead of numbers.
 */
export type LiveResult<T> =
  | { ok: true; data: T; fetchedAt: string; source: 'live' | 'cache' }
  | { ok: false; error: string; failedAt: string };

export function liveOk<T>(data: T, fetchedAt: string, source: 'live' | 'cache'): LiveResult<T> {
  return { ok: true, data, fetchedAt, source };
}

export function liveFail<T>(error: string): LiveResult<T> {
  return { ok: false, error, failedAt: new Date().toISOString() };
}
