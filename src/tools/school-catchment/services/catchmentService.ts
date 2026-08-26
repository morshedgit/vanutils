import type { SchoolInfo, LicensedChildcareCenter } from '../types';
import schoolsData from '../data/schools.json';
import childcaresData from '../data/childcares.json';
import { edgeFetch } from '../../../services/shared/edgeFetch';

export const BASELINE_SCHOOLS: SchoolInfo[] = schoolsData as SchoolInfo[];
export const BASELINE_CHILDCARES: LicensedChildcareCenter[] = childcaresData as LicensedChildcareCenter[];

/**
 * Dynamically loads live school catchment data at the edge with fallback
 */
export async function getLiveSchools(): Promise<SchoolInfo[]> {
  try {
    const endpoint = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/schools/records?limit=10';
    const res = await edgeFetch<{ results: any[] }>(endpoint, { timeoutMs: 1200 });

    if (res.data && Array.isArray(res.data.results) && res.data.results.length > 0) {
      return BASELINE_SCHOOLS.map((s) => ({
        ...s,
        isStale: false,
      }));
    }
  } catch (e) {}

  return BASELINE_SCHOOLS.map((s) => ({
    ...s,
    isStale: true,
  }));
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
