export type PropertyType = 'condo' | 'townhouse' | 'detached' | 'all';
export type MarketCondition = 'buyers' | 'balanced' | 'sellers';

export type SubmarketId = 
  | 'metro_vancouver'
  | 'vancouver_eastside'
  | 'vancouver_westside'
  | 'vancouver_downtown'
  | 'north_shore'
  | 'burnaby'
  | 'richmond'
  | 'tri_cities'
  | 'surrey_langley';

export interface HpiBenchmark {
  propertyType: PropertyType;
  benchmarkPrice: number;
  change1MonthPercent: number;
  change6MonthPercent: number;
  change1YearPercent: number;
  change3YearPercent: number;
}

export interface RentalMetrics {
  medianRent1Bed: number;
  medianRent2Bed: number;
  medianRent3Bed: number;
  avgRentPerSqFt: number;
  vacancyRatePercent: number;
  annualRentChangePercent: number;
}

export interface MortgageBenchmark {
  bocOvernightRate: number;
  primeRate: number;
  fixed5YearBenchmark: number;
  variable5YearBenchmark: number;
  stressTestQualifyingRate: number;
  bondYield5Year: number;
  lastUpdated: string;
}

export interface SubmarketPulse {
  id: SubmarketId;
  name: string;
  region: string;
  salesToActiveRatio: number;
  marketCondition: MarketCondition;
  totalSales: number;
  totalActiveListings: number;
  medianDaysOnMarket: number;
  benchmarks: HpiBenchmark[];
  rental: RentalMetrics;
  lastUpdated: string; // ISO 8601
  isStale: boolean;
}

export interface MarketHeartbeatData {
  metroOverview: SubmarketPulse;
  submarkets: SubmarketPulse[];
  mortgage: MortgageBenchmark;
  lastUpdated: string;
  isStale: boolean;
}
