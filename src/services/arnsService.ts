import Arweave from 'arweave';
import { ARIO } from '@ar.io/sdk';
import { ArNSRecord, ArNSStats, RegistrationTrend, TopHolder } from '../types';
import { getCache, setCache } from './cacheService';
import { openDB, IDBPDatabase } from 'idb';

// Initialize Arweave
const arweave = new Arweave({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

// Initialize ARIO client for ArNS functionality
const ario = ARIO.mainnet();

// Global request queue to manage API calls and prevent rate limiting
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private minDelay = 2000; // 2 seconds minimum between API calls
  private lastRequestTime = 0;

  async add<T>(apiCall: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          
          // If less than minDelay has passed since the last request, wait
          if (timeSinceLastRequest < this.minDelay && this.lastRequestTime !== 0) {
            const waitTime = this.minDelay - timeSinceLastRequest;
            console.log(`Waiting ${waitTime}ms before next API call to avoid rate limiting`);
            await new Promise(r => setTimeout(r, waitTime));
          }
          
          // Make the API call
          this.lastRequestTime = Date.now();
          const result = await apiCall();
          resolve(result);
          return result;
        } catch (error) {
          console.error('API call error:', error);
          reject(error);
          return null;
        }
      });
      
      // Start processing the queue if it's not already in progress
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (e) {
          console.error('Error processing queue task:', e);
        }
      }
    }
    
    this.processing = false;
  }
}

// Create a single global request queue instance
const requestQueue = new RequestQueue();

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

// Helper to fetch metadata from Arweave
async function fetchArweaveMetadata(txId: string): Promise<{ title?: string; description?: string; category?: string; tags?: string[] }> {
  try {
    const tx = await arweave.transactions.get(txId);
    let title = '', description = '', category = '';
    const tags: string[] = [];
    if (tx && tx.tags) {
      tx.tags.forEach((tag: any) => {
        const name = tag.get('name', { decode: true, string: true });
        const value = tag.get('value', { decode: true, string: true });
        if (name === 'Title') title = value;
        if (name === 'Description') description = value;
        if (name === 'Category') category = value;
        if (name === 'Tag' || name === 'Tags') {
          // Support comma-separated tags or multiple Tag fields
          value.split(',').forEach((t: string) => {
            const trimmed = t.trim();
            if (trimmed) tags.push(trimmed);
          });
        }
      });
    }
    return { title, description, category, tags };
  } catch (e) {
    return {};
  }
}





// Throttle utility: limit concurrent promises (set to 1 for serial)
async function throttleAll<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  const execute = async () => {
    while (i < items.length) {
      const current = i++;
      results[current] = await fn(items[current]);
    }
  };
  const runners = Array.from({ length: Math.min(limit, items.length) }, execute);
  await Promise.all(runners);
  return results;
}


// Fetch latest registrations
export async function getLatestRegistrations(limit = 20): Promise<ArNSRecord[]> {
  try {
    const cachedData = await getCache<ArNSRecord[]>(CACHE_KEYS.LATEST_REGISTRATIONS);
    if (cachedData) return cachedData;

    const response = await ario.getArNSRecords({
      limit,
      sortBy: 'startTimestamp',
      sortOrder: 'desc'
    });
    
    // Fetch metadata for each record, throttle owner fetches (concurrency = 1)
const data = await throttleAll(response.items, 5, async item => {
  let meta = {};
  if (item.processId) {
    meta = await fetchArweaveMetadata(item.processId);
  }
  let record;
  try {
    record = await ario.resolveArNSName({ name: item.name });
  } catch (e) {
    console.warn(`Failed to resolve ArNS name for ${item.name}:`, e);
    record = {};
  }
  return {
    id: item.name || '',
    name: item.name || '',
    owner: record?.owner || '',
    registeredAt: record?.startTimestamp || item.startTimestamp,
    expiresAt: record?.type === 'lease' ? record?.endTimestamp : null,
    price: record?.purchasePrice?.toString() || item.purchasePrice?.toString() || '',
    contractTxId: record?.processId || item.processId,
    ...meta
  };
});
    
    await setCache(CACHE_KEYS.LATEST_REGISTRATIONS, data, CACHE_EXPIRY.SHORT);
    return data;
  } catch (error) {
    console.error('Error fetching latest registrations:', error);
    throw new Error('Failed to fetch registrations. Check network or SDK configuration.');
  }
}

// Fetch all names
export async function getAllArNSNames(
  page = 1,
  perPage = 20,
  search = '',
  sortBy = 'registeredAt',
  sortDir = 'desc'
): Promise<{ data: ArNSRecord[]; total: number }> {
  try {
    const cacheKey = `${CACHE_KEYS.ALL_NAMES}-${page}-${perPage}-${search}-${sortBy}-${sortDir}`;
    const cachedData = await getCache<{ data: ArNSRecord[]; total: number }>(cacheKey);
    if (cachedData) return cachedData;

    // Map sortBy field names to ARIO SDK field names
    const sdkSortBy = sortBy === 'registeredAt' ? 'startTimestamp' : 
                      sortBy === 'expiresAt' ? 'endTimestamp' : 'name';
    
    // Convert to cursor-based pagination used by the SDK
    const cursor = undefined; // Would need to be implemented for true pagination
    const response = await ario.getArNSRecords({
      cursor,
      limit: perPage,
      sortBy: sdkSortBy as any,
      sortOrder: sortDir === 'desc' ? 'desc' : 'asc'
    });
    
    const data = response.items.map(item => ({
      id: item.name || '',
      name: item.name || '',
      owner: (item as any).owner || '',
      registeredAt: item.startTimestamp,
      expiresAt: item.type === 'lease' ? item.endTimestamp : null,
      price: item.purchasePrice?.toString() || '',
      contractTxId: item.processId
    }));
    
    const result = {
      data,
      total: response.totalItems || data.length
    };
    
    await setCache(cacheKey, result, CACHE_EXPIRY.MEDIUM);
    return result;
  } catch (error) {
    console.error('Error fetching names:', error);
    throw new Error('Failed to fetch names. Check SDK or network.');
  }
}

// Fetch stats
export async function getArNSStats(): Promise<ArNSStats> {
  try {
    const cachedData = await getCache<ArNSStats>(CACHE_KEYS.STATS);
    if (cachedData) return cachedData;

    // The SDK doesn't directly provide stats, so we need to calculate them
    const response = await ario.getArNSRecords({
      limit: 1,
      sortBy: 'startTimestamp',
      sortOrder: 'desc'
    });
    
    // Basic stats - would need more API calls for detailed stats
    const stats: ArNSStats = {
      totalRegistrations: response.totalItems || 0,
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

// Fetch details for a specific name with improved rate limit handling
export async function getArNSDetails(name: string): Promise<ArNSRecord | null> {
  try {
    // First check cache to avoid unnecessary API calls
    const cacheKey = `arns-details-${name}`;
    const cachedData = await getCache<ArNSRecord>(cacheKey);
    if (cachedData) {
      console.log(`Using cached data for ${name}`);
      return cachedData;
    }
    
    // First, try to get the basic record - using the request queue
    const response = await requestQueue.add(() => ario.getArNSRecord({ name }));
    console.log('getArNSDetails SDK response:', response);
    
    if (!response) return null;
    
    // The ArNS record doesn't have a consistent shape, so we need to handle this carefully
    const nameProp = 'name' in response ? String(response.name) : name;
    
    let owner = (response as any).owner || '';
    let resolvedFallback = {};
    
    // Check for missing owner, try to resolve using resolveArNSName with queue
    if (!owner) {
      try {
        // Queue the second API call to avoid rate limiting
        resolvedFallback = await requestQueue.add(() => ario.resolveArNSName({ name }));
        console.log('Fallback resolveArNSName response:', resolvedFallback);
        owner = (resolvedFallback as any).owner || '';
      } catch (e) {
        console.warn(`Fallback resolveArNSName failed for ${name}:`, e);
      }
    }
    
    const result: ArNSRecord = {
      id: nameProp,
      name: nameProp,
      owner,
      registeredAt: response.startTimestamp || (resolvedFallback as any).startTimestamp,
      expiresAt: response.type === 'lease' ? response.endTimestamp || (resolvedFallback as any).endTimestamp : null,
      price: response.purchasePrice?.toString() || (resolvedFallback as any).purchasePrice?.toString() || '',
      contractTxId: response.processId || (resolvedFallback as any).processId,
      type: response.type || (resolvedFallback as any).type || 'unknown', // Ensure type is always present
      active: true // Default to active unless known otherwise
    };
    
    // Cache the result to reduce API calls
    await setCache(cacheKey, result, CACHE_EXPIRY.MEDIUM);
    
    return result;
  } catch (error) {
    console.error(`Error fetching details for ${name}:`, error);
    // Instead of throwing, return a minimal record with error flag
    return {
      id: name,
      name: name,
      owner: '',
      registeredAt: null,
      expiresAt: null,
      price: '',
      contractTxId: '',
      type: 'unknown',
      active: false,
      error: `Failed to fetch details for ${name}. The service may be rate limited.`
    };
  }
}

// Helper for resolving names with retry mechanism
async function resolveWithRetry(name: string, maxRetries = 3): Promise<any> {
  let attempt = 0;
  let delay = 2000; // Start with 2s
  
  while (attempt < maxRetries) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for resolving ${name}, waiting ${delay}ms`);
        await new Promise(res => setTimeout(res, delay));
      }
      
      return await ario.resolveArNSName({ name });
    } catch (e: any) {
      const errorMsg = e?.message?.toLowerCase() || '';
      if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        attempt++;
        delay = Math.min(delay * 2, 8000); // Cap at 8 seconds
      } else {
        throw e; // Non-rate limit errors are thrown immediately
      }
    }
  }
  
  // Return an empty object if we've exhausted retries
  console.warn(`Max retries reached for resolving ${name}`);
  return {};
}

type ArNSRecordSortBy = 'name' | 'processId' | 'endTimestamp' | 'startTimestamp' | 'type' | 'undernameLimit' | 'purchasePrice';

export async function getArNSRecords({
  cursor,
  limit = 1000, 
  sortBy = 'startTimestamp',
  sortOrder = 'desc',
}: {
  cursor?: string;
  limit?: number;
  sortBy?: ArNSRecordSortBy;
  sortOrder?: 'asc' | 'desc';
}) {
  const response = await ario.getArNSRecords({
    cursor,
    limit,
    sortBy,
    sortOrder,
  });
  return {
    items: response.items,
    hasMore: response.hasMore,
    nextCursor: response.nextCursor,
    totalItems: response.totalItems,
    sortBy,
    sortOrder,
  };
}

import { saveRecordsSmart, getAllRecords } from '../utils/db'; // getAllRecords now used in getAllArnsFromDB
import { resolveMissingOwnersInDB } from './arnsResolverService';

export async function fetchAndStoreAllArNS() {
  let hasMore = true;
  let cursor: string | undefined = undefined;
  const allRecords: any[] = [];
  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 1. Fetch all ArNS records first
  while (hasMore) {
    const result = await getArNSRecords({ cursor, limit: 1000 });
    allRecords.push(...result.items);
    cursor = result.nextCursor;
    hasMore = result.hasMore;
  }
  // Save all raw records to IndexedDB (use smart save to avoid erasing owners)
  await saveRecordsSmart(allRecords);

  // 2. Queue DB-based resolution of missing owners
  setTimeout(() => {
    resolveMissingOwnersInDB();
  }, 0);

  // Return the actual records instead of just the count
  // This allows the caller to use the records immediately
  return allRecords;
}

// Helper: Retry with exponential backoff
async function resolveWithBackoff(record: any, maxRetries = 5): Promise<any> {
  let attempt = 0;
  let delay = 2000; // start with 2s
  const jitter = 1000; // add some randomness to avoid synchronized retries
  
  while (attempt < maxRetries) {
    try {
      // Add a small initial delay even on the first attempt to help with rate limiting
      if (attempt > 0) {
        const jitterAmount = Math.floor(Math.random() * jitter);
        const waitTime = delay + jitterAmount;
        console.log(`Retry attempt ${attempt} for ${record.name}, waiting ${waitTime}ms`);
        await new Promise(res => setTimeout(res, waitTime));
      }
      
      const resolved = await ario.resolveArNSName({ name: record.name });
      return resolved;
    } catch (e: any) {
      const errorMsg = e?.message?.toLowerCase() || '';
      if (errorMsg.includes('rate limit') || errorMsg.includes('429') || errorMsg.includes('too many requests')) {
        attempt++;
        // More aggressive backoff with exponential increase
        delay = Math.min(delay * 2, 30000); // cap at 30 seconds
      } else {
        // For non-rate limit errors, we still retry but don't increase the delay as aggressively
        attempt++;
        console.error(`Error resolving ${record.name}:`, e);
      }
    }
  }
  
  // If we've exhausted retries, return a partial record instead of throwing
  console.warn(`Max retries (${maxRetries}) reached for ${record.name}. Returning partial record.`);
  return { name: record.name, owner: record.owner || '', type: record.type || 'unknown' };
}

// 3. Batch resolve in the background
import { resolveOwnersBatchInWorker } from './arnsWorkerClient';

async function resolveAllArnsWithBackoff(records: any[]) {
  function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }
  for (let i = 0; i < records.length; i += 20) {
    const batch = records.slice(i, i + 20);
    let resolvedBatch: any[] = [];
    try {
      resolvedBatch = await resolveOwnersBatchInWorker(batch);
      // Save resolved records to IndexedDB, only update owner if changed and non-empty
      await saveRecordsSmart(resolvedBatch);
    } catch (e) {
      console.warn('Failed to resolve batch in worker:', e);
    }
    // Optional: Add delay between batches if needed
    await sleep(1000); // 1 second between batches
  }
}


export async function getAllArnsFromDB(): Promise<any[]> {
  const all = await getAllRecords();
  console.log('Loaded records from IndexedDB:', all);
  return all;
}

// Group ArNS records by owner address
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

// Resolve missing owners for records stored in IndexedDB
export async function resolveMissingOwnersInDB(): Promise<void> {
  try {
    const allRecords = await getAllArnsFromDB();
    const missing = allRecords.filter(rec => !rec.owner);
    if (missing.length > 0) {
      await resolveAllArnsWithBackoff(missing);
    }
  } catch (err) {
    console.error('Error resolving missing owners in DB:', err);
  }
}
