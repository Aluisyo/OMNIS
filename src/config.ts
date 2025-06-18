// Configuration for Arweave manifest
import { wayfinder } from './services/wayfinderService';

// original ArNS ar:// URL
export const ARNS_AR_URL = 'ar://omnisdata_aluisyo';

// resolve current gateway URL via Wayfinder
export async function getArnsGatewayUrl(): Promise<string> {
  const url = await wayfinder.resolveUrl({ originalUrl: ARNS_AR_URL });
  return url.toString();
}
