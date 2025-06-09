// src/services/arnsWorkerClient.ts
// Utility for communicating with arnsWorker (web worker)

let worker: Worker | null = null;

export function getArnsWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../arnsWorker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

// Progress and error subscribers
// Progress callback now includes optional record name
let progressSubscribers: ((current: number, total: number, name?: string) => void)[] = [];
let errorSubscribers: ((name: string, error: string) => void)[] = [];

export function onResolutionProgress(cb: (current: number, total: number, name?: string) => void) {
  progressSubscribers.push(cb);
  return () => { progressSubscribers = progressSubscribers.filter(fn => fn !== cb); };
}

export function onResolutionError(cb: (name: string, error: string) => void) {
  errorSubscribers.push(cb);
  return () => { errorSubscribers = errorSubscribers.filter(fn => fn !== cb); };
}

/**
 * Offload analytics stats calculation to the worker. Returns { stats, trends, priceHistory }.
 * Progress and error events are sent to subscribers.
 */
export function calculateAnalyticsStatsInWorker(records: any[]): Promise<{ stats: any; trends: any; priceHistory: any; uniqueOwnersTrend: { month: string; count: number }[]; priceBuckets: { bucket: string; count: number }[]; dailyCounts: { date: string; count: number }[]; typeBreakdown: { month: string; leases: number; permabuys: number }[]; topDomains: { domain: string; count: number }[]; nameLengthBuckets: { bucket: string; count: number }[] }> {
  return new Promise((resolve) => {
    const w = getArnsWorker();
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'ANALYTICS_STATS') {
        w.removeEventListener('message', handler);
        resolve({
          stats: e.data.stats,
          trends: e.data.trends,
          priceHistory: e.data.priceHistory,
          uniqueOwnersTrend: e.data.uniqueOwnersTrend,
          priceBuckets: e.data.priceBuckets,
          dailyCounts: e.data.dailyCounts,
          typeBreakdown: e.data.typeBreakdown,
          topDomains: e.data.topDomains,
          nameLengthBuckets: e.data.nameLengthBuckets
        });
      } else if (e.data.type === 'RESOLUTION_PROGRESS') {
        progressSubscribers.forEach(fn => fn(e.data.current, e.data.total, e.data.name));
      } else if (e.data.type === 'RESOLUTION_ERROR') {
        errorSubscribers.forEach(fn => fn(e.data.name, e.data.error));
      }
    };
    w.addEventListener('message', handler);
    w.postMessage({ type: 'CALCULATE_ANALYTICS_STATS', records });
  });
}

/**
 * Offload top holders calculation to the worker. Returns holders array.
 * Progress and error events are sent to subscribers.
 */
export function calculateTopHoldersInWorker(records: any[]): Promise<any[]> {
  return new Promise((resolve) => {
    const w = getArnsWorker();
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'TOP_HOLDERS') {
        w.removeEventListener('message', handler);
        resolve(e.data.holders);
      } else if (e.data.type === 'RESOLUTION_PROGRESS') {
        progressSubscribers.forEach(fn => fn(e.data.current, e.data.total, e.data.name));
      } else if (e.data.type === 'RESOLUTION_ERROR') {
        errorSubscribers.forEach(fn => fn(e.data.name, e.data.error));
      }
    };
    w.addEventListener('message', handler);
    w.postMessage({ type: 'CALCULATE_TOP_HOLDERS', records });
  });
}


export function filterRecordsInWorker(records: any[], search: string): Promise<any[]> {
  return new Promise((resolve) => {
    const w = getArnsWorker();
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'FILTERED_RECORDS') {
        w.removeEventListener('message', handler);
        resolve(e.data.records);
      }
    };
    w.addEventListener('message', handler);
    w.postMessage({ type: 'FILTER_RECORDS', records, search });
  });
}

export function sortAndPaginateRecordsInWorker(records: any[], search: string, sortBy: string, sortDirection: 'asc' | 'desc', page: number, perPage: number): Promise<{ records: any[]; total: number }> {
  return new Promise((resolve) => {
    const w = getArnsWorker();
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'SORTED_PAGINATED_RECORDS') {
        w.removeEventListener('message', handler);
        resolve({ records: e.data.records, total: e.data.total });
      }
    };
    w.addEventListener('message', handler);
    w.postMessage({
      type: 'SORT_AND_PAGINATE_RECORDS',
      records,
      search,
      sortBy,
      sortDirection,
      page,
      perPage
    });
  });
}
