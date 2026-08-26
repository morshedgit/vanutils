import type { Beach, SamplingRecord } from '../types';
import { calculateStatus, calculateGeometricMean } from './healthCalc';
import { BEACHES } from './vchScraper';

/**
 * Public Data Endpoints & Health Authority URLs
 */
export const DATA_SOURCES = {
  vch: {
    name: 'Vancouver Coastal Health (VCH)',
    url: 'https://www.vch.ca/en/health-topics/public-health/environmental-health/beach-water-quality',
    regionsCovered: ['Vancouver', 'West Vancouver', 'North Vancouver', 'Richmond', 'Bowen Island', 'Lions Bay'],
  },
  fraserHealth: {
    name: 'Fraser Health Authority',
    url: 'https://www.fraserhealth.ca/health-topics-a-to-z/recreational-water/beach-water-quality',
    regionsCovered: ['Burnaby', 'Belcarra', 'White Rock'],
  },
  swimGuide: {
    name: 'Swim Guide / Swim Drink Fish Open Data API',
    url: 'https://www.theswimguide.org/api/v1/beaches/',
    notes: 'Aggregated citizen-science and health authority feed for North American waters',
  },
  cityOfVancouver: {
    name: 'City of Vancouver Open Data Portal',
    url: 'https://opendata.vancouver.ca/explore/dataset/beaches/information/',
    notes: 'Coordinates, amenities, lifeguard towers and park boundary polygons',
  },
};

export interface RawScrapeResult {
  beachName: string;
  sampleDate: string;
  eColiSingle: number;
  notes?: string;
}

/**
 * Simulates / Executes HTML table extraction from Vancouver Coastal Health surveillance pages
 */
export async function scrapeVCHWaterQuality(): Promise<RawScrapeResult[]> {
  try {
    return BEACHES.map((b) => ({
      beachName: b.name,
      sampleDate: b.latestSample.date,
      eColiSingle: b.latestSample.singleSampleCount ?? b.latestSample.eColiCount ?? 0,
      notes: b.latestSample.notes,
    }));
  } catch (error) {
    console.error('Error extracting water quality:', error);
    return [];
  }
}

/**
 * Ingestion Pipeline: Takes raw laboratory samples and updates beach records
 * with new 30-day geometric means and calculated traffic-light statuses.
 */
export function ingestNewSamples(
  existingBeaches: Beach[] = BEACHES,
  newSamples: RawScrapeResult[]
): { updatedBeaches: Beach[]; changedCount: number } {
  let changedCount = 0;

  const updatedBeaches = existingBeaches.map((beach) => {
    // Find matching sample by normalized name matching
    const match = newSamples.find((s) =>
      beach.name.toLowerCase().includes(s.beachName.toLowerCase()) ||
      s.beachName.toLowerCase().includes(beach.name.toLowerCase())
    );

    if (!match) return beach;

    // Check if sample is already recorded
    const alreadyExists = beach.historicalSamples.some((h) => h.date === match.sampleDate);
    if (alreadyExists) return beach;

    // Append new sample
    const newSingle = match.eColiSingle;
    const recentValues = [...beach.historicalSamples.slice(-4).map((s) => s.singleSampleCount || s.eColiCount), newSingle];
    const newGeoMean = calculateGeometricMean(recentValues);
    const newStatus = calculateStatus(newGeoMean, newSingle, false, match.sampleDate);

    const newRecord: SamplingRecord = {
      date: match.sampleDate,
      eColiCount: newGeoMean,
      singleSampleCount: newSingle,
      status: newStatus,
      notes: match.notes,
    };

    changedCount++;

    return {
      ...beach,
      currentStatus: newStatus,
      latestSample: newRecord,
      historicalSamples: [...beach.historicalSamples.slice(-5), newRecord],
    };
  });

  return { updatedBeaches, changedCount };
}
