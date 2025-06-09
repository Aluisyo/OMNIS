import { ArNSRecord, ArNSStats, RegistrationTrend, TopHolder } from '../types';
import { getCache, setCache } from './cacheService';
import { fetchAllRecords } from './dataService';

// Cache keys
const CACHE_KEYS = {
  LATEST_REGISTRATIONS: 'latest-registrations',
  ALL_NAMES: 'all-names',
  STATS: 'arns-stats',
  TOP_HOLDERS: 'top-holders',
  TRENDS: 'registration-trends'
};

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000 // 30 minutes
};

// Fetch latest registrations
export async function getLatestRegistrations(limit = 20): Promise<ArNSRecord[]> {
  const all = await getAllArnsFromDB();
  const sorted = [...all].sort((a, b) => (b.startTimestamp || 0) - (a.startTimestamp || 0));
  return sorted.slice(0, limit);
}

// Fetch all names
export async function getAllArNSNames(
  page = 1,
  perPage = 20,
  search = '',
  sortBy = 'startTimestamp',
  sortDir = 'desc'
): Promise<{ data: ArNSRecord[]; total: number }> {
  const allRecords = await getAllArnsFromDB();
  let filtered = allRecords;
  if (search) {
    filtered = filtered.filter(r => r.name.includes(search) || (r.owner || '').includes(search));
  }
  const sorted = filtered.sort((a, b) => {
    const aVal = a[sortBy as keyof ArNSRecord];
    const bVal = b[sortBy as keyof ArNSRecord];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? (aVal - bVal) : (bVal - aVal);
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });
  const total = sorted.length;
  const start = (page - 1) * perPage;
  const data = sorted.slice(start, start + perPage);
  return { data, total };
}

// Fetch stats
export async function getArNSStats(): Promise<ArNSStats> {
  try {
    const cachedData = await getCache<ArNSStats>(CACHE_KEYS.STATS);
    if (cachedData) return cachedData;

    // The SDK doesn't directly provide stats, so we need to calculate them
    const allRecords = await getAllArnsFromDB();
    const stats: ArNSStats = {
      totalRegistrations: allRecords.length,
      dailyRegistrations: 0, // Would need additional data
      monthlyRegistrations: 0, // Would need additional data
      yearlyRegistrations: 0, // Would need additional data
      averagePrice: 0 // Would need additional data
    };

    await setCache(CACHE_KEYS.STATS, stats, CACHE_EXPIRY.MEDIUM);
    return stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw new Error('Failed to fetch stats.');
  }
}

// Fetch top holders - Note: SDK doesn't directly provide this
export async function getTopHolders(): Promise<TopHolder[]> {
  try {
    const allRecords = await getAllArnsFromDB();
    if (!allRecords || allRecords.length === 0) return [];

    // Group by owner
    const holderMap: Record<string, { count: number; value: number }> = {};
    let totalNames = 0;
    for (const record of allRecords) {
      const owner = record.owner || 'unknown';
      const price = typeof record.purchasePrice === 'string' ? parseFloat(record.purchasePrice) : (record.purchasePrice || 0);
      if (!holderMap[owner]) {
        holderMap[owner] = { count: 0, value: 0 };
      }
      holderMap[owner].count += 1;
      holderMap[owner].value += price || 0;
      totalNames += 1;
    }

    // Convert to array and sort
    const holders: TopHolder[] = Object.entries(holderMap)
      .map(([address, { count, value }]) => ({
        address,
        count,
        value,
        percentage: (count / totalNames) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return holders;
  } catch (error) {
    console.error('Error fetching top holders:', error);
    throw new Error('Failed to fetch top holders.');
  }
}

// Fetch registration trends - Note: SDK doesn't directly provide this
export async function getRegistrationTrends(): Promise<RegistrationTrend[]> {
  try {
    const cachedData = await getCache<RegistrationTrend[]>(CACHE_KEYS.TRENDS);
    if (cachedData) return cachedData;

    // This would require additional implementation to track trends
    // For now, return mock or empty data
    const data: RegistrationTrend[] = [];

    await setCache(CACHE_KEYS.TRENDS, data, CACHE_EXPIRY.LONG);
    return data;
  } catch (error) {
    console.error('Error fetching trends:', error);
    throw new Error('Failed to fetch trends.');
  }
}

// Fetch details for a specific name (from local IndexedDB)
export async function getArNSDetails(name: string): Promise<ArNSRecord | null> {
  const all = await getAllArnsFromDB();
  return all.find(r => r.name === name) || null;
}

export async function getArnsByOwner(): Promise<Record<string, any[]>> {
  const all = await getAllArnsFromDB();
  const grouped: Record<string, any[]> = {};
  for (const record of all) {
    if (!record.owner) continue;
    if (!grouped[record.owner]) grouped[record.owner] = [];
    grouped[record.owner].push(record);
  }
  return grouped;
}

export async function fetchAndStoreAllArNS() {
  const records = await fetchAllRecords();
  await saveRecordsSmart(records);
  return records;
}

import { saveRecordsSmart, getAllRecords } from '../utils/db'; // getAllRecords now used in getAllArnsFromDB

export async function getAllArnsFromDB(): Promise<any[]> {
  const all = await getAllRecords();
  console.log('Loaded records from IndexedDB:', all);
  return all;
}
