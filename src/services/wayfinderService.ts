import { Wayfinder, NetworkGatewaysProvider, RandomRoutingStrategy, SimpleCacheGatewaysProvider } from '@ar.io/wayfinder-core';
import { ARIO, type ARIOReadable } from '@ar.io/sdk';

// Cast ARIO.mainnet() to ARIOReadable for Wayfinder
const arioClient: ARIOReadable = ARIO.mainnet() as unknown as ARIOReadable;

export const wayfinder = new Wayfinder({
  gatewaysProvider: new SimpleCacheGatewaysProvider({
    ttlSeconds: 60 * 60, // cache the top 10 for 1 hour
    gatewaysProvider: new NetworkGatewaysProvider({
      ario: arioClient,
      sortBy: 'operatorStake',
      sortOrder: 'desc',
      limit: 10,
    }),
  }),
  routingSettings: { strategy: new RandomRoutingStrategy() },
});

// subscribe to routing events
wayfinder.emitter.on('routing-started', ({ originalUrl }) => console.log(`Routing started for ${originalUrl}`));
wayfinder.emitter.on('routing-skipped', ({ originalUrl }) => console.log(`Routing skipped for ${originalUrl}`));
wayfinder.emitter.on('routing-succeeded', ({ originalUrl, selectedGateway, redirectUrl }) => console.log(`Routing succeeded for ${originalUrl} via ${selectedGateway}`, redirectUrl));

export async function fetchViaWayfinder<T>(url: string): Promise<T> {
  const res = await wayfinder.request(url);
  if (!res.ok) {
    throw new Error(`Wayfinder request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// Retry wrapper: attempts fetchViaWayfinder up to maxAttempts to try new gateways
export async function fetchWithFallback<T>(url: string, maxAttempts = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchViaWayfinder<T>(url);
    } catch (err) {
      console.warn(`fetchWithFallback attempt ${attempt} failed for ${url}:`, err);
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Resolve any URL via Wayfinder with fallback.
 */
export async function resolveUrlWithFallback(url: string, maxAttempts = 3): Promise<string> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await wayfinder.request(url);
      if (!res.ok) {
        throw new Error(`Wayfinder request failed: ${res.status} ${res.statusText}`);
      }
      return res.url;
    } catch (err) {
      console.warn(`resolveUrlWithFallback attempt ${attempt} failed for ${url}:`, err);
      lastError = err;
    }
  }
  throw lastError;
}
