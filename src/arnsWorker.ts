// src/arnsWorker.ts
// Web Worker for heavy ArNS tasks (batch resolve, filter, etc.)

// Types for message passing
export type WorkerRequest =
  | { type: 'FILTER_RECORDS'; records: any[]; search: string }
  | { type: 'SORT_AND_PAGINATE_RECORDS'; records: any[]; search: string; sortBy: string; sortDirection: 'asc' | 'desc'; page: number; perPage: number }
  | { type: 'CALCULATE_ANALYTICS_STATS'; records: any[] }
  | { type: 'CALCULATE_TOP_HOLDERS'; records: any[] };

export type WorkerResponse =
  | { type: 'FILTERED_RECORDS'; records: any[] }
  | { type: 'SORTED_PAGINATED_RECORDS'; records: any[]; total: number }
  | { type: 'ANALYTICS_STATS'; stats: any; trends: any; priceHistory: any; uniqueOwnersTrend: { month: string; count: number }[]; priceBuckets: { bucket: string; count: number }[]; dailyCounts: { date: string; count: number }[]; typeBreakdown: { month: string; leases: number; permabuys: number }[]; topDomains: { domain: string; count: number }[]; nameLengthBuckets: { bucket: string; count: number }[] }
  | { type: 'TOP_HOLDERS'; holders: any[] };

// Analytics: heavy stats/trends computation with progress
async function calculateAnalyticsStatsInWorker(records: any[]) {
  try {
    const chunkSize = 500;
    const stats = { 
      totalRegistrations: 0, 
      dailyRegistrations: 0, 
      weeklyRegistrations: 0, 
      monthlyRegistrations: 0,
      yearlyRegistrations: 0,
      activePermabuys: 0,
      activeLeases: 0,
      uniqueOwners: 0,
      averagePrice: 0,
      growthRate: 0 
    };
    
    // Track unique owners
    const uniqueOwnersSet = new Set<string>();
    
    // Track monthly registrations for growth rate calculation
    let currentMonthRegistrations = 0;
    let previousMonthRegistrations = 0;
    const trends: any[] = [];
    let priceHistory: any[] = [];
    
    // Use current timestamp for "now" to ensure fresh calculations
    const now = Date.now();
    
    // For debugging - count records by timestamp range
    let last24h = 0;
    let last7d = 0;
    let last30d = 0;
    
    // For debugging - count records by type
    const typeCount: Record<string, number> = {};
    let nullTypeCount = 0;
    let undefinedTypeCount = 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    let processed = 0;
    const priceMap = new Map();
    let totalPrice = 0;
    let priceCount = 0;

    // Extended analytics structures
    const uniqueOwnersMap: Record<string, Set<string>> = {};
    const priceBucketsMap: Record<string, number> = { '0-1': 0, '1-10': 0, '10-100': 0, '100+': 0 };
    const dailyCountsMap: Record<string, number> = {};
    const typeBreakdownMap: Record<string, { leases: number; permabuys: number }> = {};
    const domainMap: Record<string, number> = {};
    const nameLengthMap: Record<string, number> = {};

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      for (const record of chunk) {
        // Add to total registrations
        stats.totalRegistrations += 1;
        
        // Count recent registrations - use either registeredAt or startTimestamp
        const timestamp = record.registeredAt || record.startTimestamp || 0;
        
        // Add debug info for first few records
        if (stats.totalRegistrations < 5) {
          console.log('Record timestamp info:', {
            name: record.name,
            registeredAt: record.registeredAt,
            startTimestamp: record.startTimestamp,
            used: timestamp,
            now,
            diff: now - timestamp,
            oneDay,
            oneWeek,
            oneMonth
          });
        }
        
        // Check if this record was registered in the last 24 hours
        if (now - timestamp <= oneDay) {
          stats.dailyRegistrations += 1;
          last24h++;
        }
        
        // Check if this record was registered in the last 7 days
        if (now - timestamp <= oneWeek) {
          stats.weeklyRegistrations += 1;
          last7d++;
        }
        
        // Check if this record was registered in the last 30 days
        if (now - timestamp <= oneMonth) {
          stats.monthlyRegistrations += 1;
          last30d++;
        }
        
        // Check if this record was registered in the last year
        if (now - timestamp <= 365 * oneDay) {
          stats.yearlyRegistrations += 1;
        }
        
        // Track unique owners
        if (record.owner) {
          uniqueOwnersSet.add(record.owner);
        }
        
        // Log all record types in the first few records to help debug
        if (stats.totalRegistrations < 10) {
          console.log('Record type info:', {
            name: record.name,
            type: record.type,
            expiresAt: record.expiresAt,
            hasExpiration: record.expiresAt !== null && record.expiresAt !== undefined
          });
        }
        
        // Count each record type for debugging
        if (record.type === null) {
          nullTypeCount++;
        } else if (record.type === undefined) {
          undefinedTypeCount++;
        } else {
          // Initialize the counter if this is the first time seeing this type
          if (!typeCount[record.type]) {
            typeCount[record.type] = 0;
          }
          typeCount[record.type]++;
        }
        
        // Distinguish between permabuys and leases based on record type and expiration
        // First normalize the type field for case-insensitive comparison
        const normalizedType = record.type ? String(record.type).toLowerCase() : '';
        
        // Check for permabuy variations
        if (normalizedType.includes('perma') || normalizedType === 'permanent') {
          stats.activePermabuys += 1;
        } 
        // Check for lease variations
        else if (normalizedType.includes('lease') || normalizedType === 'temporary') {
          stats.activeLeases += 1;
        } 
        // If type doesn't help, use expiration date as fallback
        else {
          const tenYearsFromNow = now + (10 * 365 * 24 * 60 * 60 * 1000);
          
          // If endTimestamp exists, it's likely a lease
          if (record.endTimestamp && record.endTimestamp > 0) {
            stats.activeLeases += 1;
          }
          // No expiration date typically means permabuy
          else if (record.expiresAt === null || record.expiresAt === undefined) {
            stats.activePermabuys += 1;
          } 
          // Short expiration = lease
          else if (record.expiresAt <= tenYearsFromNow) {
            stats.activeLeases += 1;
          } 
          // Very far future expiration = permabuy
          else {
            stats.activePermabuys += 1;
          }
        }
        
        // Calculate monthly data for growth rate
        const recordDate = new Date(timestamp);
        const thisMonth = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        // Current month registrations
        if (recordDate.getMonth() === thisMonth.getMonth() && recordDate.getFullYear() === thisMonth.getFullYear()) {
          currentMonthRegistrations++;
        }
        // Previous month registrations
        else if (recordDate.getMonth() === lastMonth.getMonth() && recordDate.getFullYear() === lastMonth.getFullYear()) {
          previousMonthRegistrations++;
        }
        // Trends (by date string)
        const date = new Date(record.startTimestamp ?? 0).toISOString().split('T')[0];
        const idx = trends.findIndex((t: any) => t.date === date);
        if (idx === -1) trends.push({ date, count: 1 });
        else trends[idx].count++;
        // Price history (by month)
        const month = date.slice(0, 7);
        const price = parseFloat(record.purchasePrice) || 0;
        if (price > 0) {
          totalPrice += price;
          priceCount++;
        }
        if (!priceMap.has(month)) priceMap.set(month, { sum: 0, count: 0 });
        const entry = priceMap.get(month)!;
        entry.sum += price;
        entry.count += 1;

        // Unique owners per month
        if (record.owner) {
          if (!uniqueOwnersMap[month]) uniqueOwnersMap[month] = new Set();
          uniqueOwnersMap[month].add(record.owner);
        }
        // Price bucket
        const priceVal = parseFloat(record.purchasePrice) || 0;
        let bucket = priceVal < 1 ? '0-1' : priceVal < 10 ? '1-10' : priceVal < 100 ? '10-100' : '100+';
        priceBucketsMap[bucket]++;
        // Daily counts
        dailyCountsMap[date] = (dailyCountsMap[date] || 0) + 1;
        // Type breakdown per month
        if (!typeBreakdownMap[month]) typeBreakdownMap[month] = { leases: 0, permabuys: 0 };
        const isPermabuy = normalizedType.includes('perma') || normalizedType === 'permanent' || (!record.endTimestamp && !record.expiresAt);
        if (isPermabuy) typeBreakdownMap[month].permabuys++;
        else typeBreakdownMap[month].leases++;
        // Domain counts
        const parts = record.name?.split('.') || [];
        const tld = parts.length > 1 ? parts.pop()! : 'none';
        domainMap[tld] = (domainMap[tld] || 0) + 1;
        // Name length buckets
        const len = record.name?.length || 0;
        const lenBucket = len <= 5 ? '1-5' : len <= 10 ? '6-10' : len <= 20 ? '11-20' : '21+';
        nameLengthMap[lenBucket] = (nameLengthMap[lenBucket] || 0) + 1;
      }
      processed += chunk.length;
      self.postMessage({ type: 'RESOLUTION_PROGRESS', current: processed, total: records.length });
    }

    priceHistory = Array.from(priceMap.entries()).map(([month, { sum, count }]) => ({ month, average: count ? sum / count : 0 }));
    priceHistory.sort((a, b) => a.month.localeCompare(b.month));
    trends.sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate average price
    stats.averagePrice = priceCount > 0 ? totalPrice / priceCount : 0;
    
    // Set unique owners count
    stats.uniqueOwners = uniqueOwnersSet.size;
    
    // Calculate growth rate (percentage change between current and previous month)
    if (previousMonthRegistrations > 0) {
      stats.growthRate = Math.max(((currentMonthRegistrations - previousMonthRegistrations) / previousMonthRegistrations) * 100, 0);
    } else if (currentMonthRegistrations > 0) {
      stats.growthRate = 100; // If no previous month data but current month has registrations, 100% growth
    } else {
      stats.growthRate = 0; // No growth if no registrations
    }
    
    // Log debug counters
    console.log('Debug time-based counts:', {
      last24h,
      last7d,
      last30d,
      dailyRegistrations: stats.dailyRegistrations,
      weeklyRegistrations: stats.weeklyRegistrations,
      monthlyRegistrations: stats.monthlyRegistrations,
      yearlyRegistrations: stats.yearlyRegistrations,
      now: new Date(now).toISOString(),
      oneDay,
      oneWeek,
      oneMonth
    });
    
    // Log type counts
    console.log('Record type summary:', {
      totalRecords: stats.totalRegistrations,
      activePermabuys: stats.activePermabuys,
      activeLeases: stats.activeLeases,
      uniqueOwners: stats.uniqueOwners,
      missingType: stats.totalRegistrations - (stats.activePermabuys + stats.activeLeases),
      typeDistribution: typeCount,
      nullTypeCount,
      undefinedTypeCount
    });
    
    // Build extended analytics arrays
    const uniqueOwnersTrend = Object.entries(uniqueOwnersMap).map(([month, owners]) => ({ month, count: owners.size })).sort((a, b) => a.month.localeCompare(b.month));
    const priceBuckets = Object.entries(priceBucketsMap).map(([bucket, count]) => ({ bucket, count }));
    const dailyCounts = Object.entries(dailyCountsMap).map(([date, count]) => ({ date, count }));
    const typeBreakdown = Object.entries(typeBreakdownMap).map(([month, { leases, permabuys }]) => ({ month, leases, permabuys })).sort((a, b) => a.month.localeCompare(b.month));
    const topDomains = Object.entries(domainMap).map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const nameLengthBuckets = Object.entries(nameLengthMap).map(([bucket, count]) => ({ bucket, count }));
    
    // Send full analytics
    self.postMessage({
      type: 'ANALYTICS_STATS',
      stats,
      trends,
      priceHistory,
      uniqueOwnersTrend,
      priceBuckets,
      dailyCounts,
      typeBreakdown,
      topDomains,
      nameLengthBuckets
    });
  } catch (e) {
    self.postMessage({ type: 'RESOLUTION_ERROR', name: 'analytics', error: (e as Error).message });
  }
}

// Top holders: heavy aggregation with progress
async function calculateTopHoldersInWorker(records: any[]) {
  try {
    const chunkSize = 500;
    let processed = 0;
    const holderMap: Record<string, { count: number; value: number }> = {};
    let totalNames = 0;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      for (const record of chunk) {
        const owner = record.owner || 'unknown';
        const price = typeof record.purchasePrice === 'string' ? parseFloat(record.purchasePrice) : (record.purchasePrice || 0);
        if (!holderMap[owner]) {
          holderMap[owner] = { count: 0, value: 0 };
        }
        holderMap[owner].count += 1;
        holderMap[owner].value += price || 0;
        totalNames += 1;
      }
      processed += chunk.length;
      self.postMessage({ type: 'RESOLUTION_PROGRESS', current: processed, total: records.length });
    }
    const holders = Object.entries(holderMap)
      .map(([address, { count, value }]) => ({
        address,
        count,
        value,
        percentage: (count / totalNames) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100); // return top 100 holders for UI selection
    self.postMessage({ type: 'TOP_HOLDERS', holders });
  } catch (e) {
    self.postMessage({ type: 'RESOLUTION_ERROR', name: 'topHolders', error: (e as Error).message });
  }
}

function filterRecords(records: any[], search: any): any[] {
  const term = (typeof search === 'string' ? search : '').toLowerCase();
  return records.filter(r =>
    (r.name ?? '').toLowerCase().includes(term) ||
    (r.owner ?? '').toLowerCase().includes(term) ||
    (Array.isArray(r.tags) ? r.tags.join(' ').toLowerCase().includes(term) : false)
  );
}

function sortAndPaginate(records: any[], sortBy: string, sortDirection: 'asc' | 'desc', page: number, perPage: number) {
  // Debug info
  self.postMessage({
    type: 'DEBUG_SORT_PAGINATE',
    recordsLength: records.length,
    sortBy,
    sortDirection,
    page,
    perPage,
    start: (page - 1) * perPage,
    end: (page - 1) * perPage + perPage,
    firstRecord: records[0] || null
  });
  const sorted = records.slice().sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'registeredAt') cmp = ((a.registeredAt ?? a.startTimestamp ?? 0) - (b.registeredAt ?? b.startTimestamp ?? 0));
    else if (sortBy === 'expiresAt') cmp = (a.expiresAt ?? 0) - (b.expiresAt ?? 0);
    else if (sortBy === 'price') cmp = (parseFloat(a.price || '0') - parseFloat(b.price || '0'));
    else if (sortBy === 'name') cmp = (a.name ?? '').localeCompare(b.name ?? '');
    else if (sortBy === 'owner') cmp = (a.owner ?? '').localeCompare(b.owner ?? '');
    return sortDirection === 'desc' ? -cmp : cmp;
  });
  const total = sorted.length;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return { records: sorted.slice(start, end), total };
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === 'FILTER_RECORDS') {
    const filtered = filterRecords(msg.records, msg.search);
    self.postMessage({ type: 'FILTERED_RECORDS', records: filtered } as WorkerResponse);
  } else if (msg.type === 'SORT_AND_PAGINATE_RECORDS') {
    let filtered = msg.records;
    if (msg.search) {
      filtered = filterRecords(filtered, msg.search);
    }
    const { records, total } = sortAndPaginate(filtered, msg.sortBy, msg.sortDirection, msg.page, msg.perPage);
    self.postMessage({ type: 'SORTED_PAGINATED_RECORDS', records, total } as WorkerResponse);
  } else if (msg.type === 'CALCULATE_ANALYTICS_STATS') {
    await calculateAnalyticsStatsInWorker(msg.records);
  } else if (msg.type === 'CALCULATE_TOP_HOLDERS') {
    await calculateTopHoldersInWorker(msg.records);
  }
};
