import type { SchoolInfo, LicensedChildcareCenter } from '../types';
import schoolsData from '../data/schools.json';
import childcaresData from '../data/childcares.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';
import { withEdgeCache } from '../../../services/shared/edgeCache';
import type { LiveResult } from '../../../services/shared/liveResult';

// Seed/reference metadata only — never presented as live telemetry. See issue #35.
export const BASELINE_SCHOOLS: SchoolInfo[] = schoolsData as SchoolInfo[];
export const BASELINE_CHILDCARES: LicensedChildcareCenter[] = childcaresData as LicensedChildcareCenter[];

const CACHE_TTL_SECONDS = 86400; // catchment boundaries rarely change

/**
 * Dynamically loads live school catchment data at the edge.
 * Returns ok:false when there is no genuine live reading (no baseline masquerading as live — issue #35).
 */
export async function getLiveSchools(): Promise<LiveResult<SchoolInfo[]>> {
  return withEdgeCache<SchoolInfo[]>('school-catchment-schools', CACHE_TTL_SECONDS, async () => {
    const endpoint = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/schools/records?limit=10';
    await edgeFetch<{ results: any[] }>(endpoint, { timeoutMs: 1200 });

    // This open-data dataset has no per-catchment fields that map onto
    // SchoolInfo (see scripts/sync-live-schools.js) — there is no real
    // live merge implemented yet, so this module has no live source.
    return null;
  });
}

export function getAllSchools(): SchoolInfo[] {
  return BASELINE_SCHOOLS;
}

export function getSchoolById(id: string, list: SchoolInfo[] = BASELINE_SCHOOLS): SchoolInfo | undefined {
  return list.find((s) => s.id.toLowerCase() === id.toLowerCase());
}

export function getAllChildcares(): LicensedChildcareCenter[] {
  return BASELINE_CHILDCARES;
}

export function getSchoolsOverviewStats(schools: SchoolInfo[] = BASELINE_SCHOOLS, childcares: LicensedChildcareCenter[] = BASELINE_CHILDCARES) {
  const secondaryCount = schools.filter((s) => s.category === 'secondary').length;
  const elementaryCount = schools.filter((s) => s.category === 'elementary').length;
  const annexCount = schools.filter((s) => s.category === 'elementary_annex').length;
  const totalChildcareSpots = childcares.reduce((acc, c) => acc + c.licensedCapacity, 0);

  return {
    totalSchools: schools.length,
    secondaryCount,
    elementaryCount,
    annexCount,
    childcaresCount: childcares.length,
    totalChildcareSpots,
  };
}
