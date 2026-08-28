export type SaleCategory =
  | 'fashion_apparel'
  | 'outdoor_gear'
  | 'home_garden'
  | 'indie_artisan'
  | 'kids_family';

export type EntryType =
  | 'free_walkin'
  | 'timed_ticket'
  | 'paid_vip';

export type PaymentMethod =
  | 'credit_debit_only'
  | 'cash_card'
  | 'all_payments';

export interface SaleDateSchedule {
  date: string;               // "2026-08-27"
  dayOfWeek: string;          // "Thursday"
  openTime: string;           // "07:00"
  closeTime: string;          // "21:00"
  notes?: string;             // "Opening day - doors open 7 AM"
}

export interface SalesEvent {
  id: string;                 // "aritzia-warehouse-sale-2026"
  name: string;               // "Aritzia Annual Warehouse Sale"
  brand: string;              // "Aritzia"
  category: SaleCategory;
  startDate: string;          // "2026-08-27"
  endDate: string;            // "2026-09-01"
  status: 'upcoming' | 'active_now' | 'concluded';
  discountRange: string;      // "50% - 70% Off"
  entryType: EntryType;
  ticketUrl?: string;
  venueName: string;          // "Vancouver Convention Centre (West Building)"
  venueAddress: string;       // "1055 Canada Place, Vancouver, BC"
  hallDetails?: string;       // "Exhibition Halls A & B"
  municipality: string;       // "Vancouver"
  latitude: number;
  longitude: number;
  transitAccess: string;      // "3 min walk from Waterfront SkyTrain (Expo & Canada Line)"
  parkingInfo: string;        // "VCC West Parkade ($24 daily max)"
  schedule: SaleDateSchedule[];
  lineupAdvice: string;       // "Expect 1-2h queue before 9 AM on Thu/Fri. Evening hours have minimal wait."
  bagPolicy: string;          // "No backpacks, large totes, or strollers inside. Mandatory free coat check."
  paymentPolicy: PaymentMethod;
  fittingRoomInfo: string;    // "Communal fitting rooms only. Wear comfortable base layers."
  returnPolicy: string;       // "Final sale on all items. No refunds or exchanges."
  officialSourceUrl: string;
  featuredItems: string[];
  lastUpdated: string;        // ISO 8601
}

export interface SalesOverviewStats {
  activeSalesCount: number;
  upcomingThisMonth: number;
  avgDiscountPercent: number;
  nextMajorSaleName: string | null;
  nextMajorSaleDate: string | null;
}
