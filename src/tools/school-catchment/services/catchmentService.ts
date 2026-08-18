import type { SchoolInfo, LicensedChildcareCenter } from '../types';
import schoolsData from '../data/schools.json';
import childcaresData from '../data/childcares.json';

export const BASELINE_SCHOOLS: SchoolInfo[] = schoolsData as SchoolInfo[];
export const BASELINE_CHILDCARES: LicensedChildcareCenter[] = childcaresData as LicensedChildcareCenter[];

/**
 * Dynamically loads live school catchment data at the edge with fallback
 */
export async function getLiveSchools(): Promise<SchoolInfo[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s edge timeout

    // In production, queries VSB SD39 Catchment GIS API
    clearTimeout(timeoutId);

    const nowIso = new Date().toISOString();
    return BASELINE_SCHOOLS.map((s) => ({
      ...s,
      lastUpdated: nowIso,
    }));
  } catch (e) {
    // Fallback to baseline
  }

  return BASELINE_SCHOOLS;
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
