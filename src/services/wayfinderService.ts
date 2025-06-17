import { Wayfinder, NetworkGatewaysProvider, RandomRoutingStrategy } from '@ar.io/wayfinder-core';
import { ARIO, type ARIOReadable } from '@ar.io/sdk';

// Cast ARIO.mainnet() to ARIOReadable for Wayfinder
const arioClient: ARIOReadable = ARIO.mainnet() as unknown as ARIOReadable;

const wayfinder = new Wayfinder({
  gatewaysProvider: new NetworkGatewaysProvider({
    ario: arioClient,
    sortBy: 'operatorStake',
    sortOrder: 'desc',
    limit: 10,
  }),
  routingStrategy: new RandomRoutingStrategy(),
});

export async function fetchViaWayfinder<T>(url: string): Promise<T> {
  const res = await wayfinder.request(url);
  if (!res.ok) {
    throw new Error(`Wayfinder request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
