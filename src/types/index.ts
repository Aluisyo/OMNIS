export interface ArNSRecord {
  id: string;
  name: string;
  owner?: string;
  registeredAt?: number | null;
  processId?: string;
  purchasePrice?: string | number;
  startTimestamp?: number;
  type?: string;
  undernames?: number;
  // Array of undername details
  underNames?: { name: string; tx: string }[];
  expiresAt?: number | null;
  price?: string;
  contractTxId?: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  active?: boolean;
  error?: string;
  /** Primary name if this record is an undername pointing to another record */
  primaryName?: string;
}

export interface ArNSStats {
  totalRegistrations: number;
  dailyRegistrations: number;
  weeklyRegistrations?: number;
  monthlyRegistrations: number;
  yearlyRegistrations: number;
  activePermabuys: number;
  activeLeases: number;
  uniqueOwners: number;
  averagePrice: number;
  growthRate: number;
}

export interface TopHolder {
  address: string;
  count: number;
  percentage: number;
  value: number;
}

export interface RegistrationTrend {
  date: string;
  count: number;
}

export type ThemeMode = 'light' | 'dark';

export interface FilterOptions {
  searchTerm: string;
  startDate: Date | null;
  endDate: Date | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  perPage: number;
}