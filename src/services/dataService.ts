// src/services/dataService.ts
import type { ArNSRecord } from '../types';
import { ARNS_GATEWAY_URL } from '../config';

// Raw record includes backend endTimestamp for lease records
type RawArNSRecord = ArNSRecord & { endTimestamp?: number };

/**
 * Fetch the ArNS folder manifest and load all chunk JSON files.
 */
export async function fetchAllRecords(): Promise<ArNSRecord[]> {
  const manifestRes = await fetch(ARNS_GATEWAY_URL);
  if (!manifestRes.ok) {
    throw new Error(`Failed to fetch manifest: ${manifestRes.status}`);
  }
  // Parse manifest and collect chunk paths
  const manifestJsonRaw = await manifestRes.json() as any;
  console.log('fetchAllRecords: manifestJsonRaw=', manifestJsonRaw);
  // Support both standard and nested ArFS manifest
  const pathsMap: Record<string, { id: string }> = manifestJsonRaw.paths ?? manifestJsonRaw.manifest?.paths;
  if (!pathsMap) throw new Error('fetchAllRecords: manifest missing "paths"');
  // Sort chunk filenames numerically (chunk-0.json, chunk-1.json, ...)
  const entries = Object.entries(pathsMap).sort(([a], [b]) => {
    const aIdx = parseInt(a.match(/chunk-(\d+)\.json/)?.[1] ?? '0', 10);
    const bIdx = parseInt(b.match(/chunk-(\d+)\.json/)?.[1] ?? '0', 10);
    return aIdx - bIdx;
  });
  console.log('fetchAllRecords: chunk order =', entries.map(([k]) => k));
  // Fetch each chunk by its transaction ID
  const chunks: RawArNSRecord[][] = await Promise.all(entries.map(async ([fname, { id }]) => {
    const url = `https://arweave.net/${id}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`fetchAllRecords: failed chunk ${fname} id=${id}: ${res.status}`);
      return [] as RawArNSRecord[];
    }
    const json = await res.json() as { records: RawArNSRecord[] };
    console.log(`fetchAllRecords: loaded ${json.records.length} records from ${fname}`);
    return json.records;
  }));
  const rawRecords: RawArNSRecord[] = chunks.flat();
  // Flatten and map endTimestamp to expiresAt
  const allRecords: ArNSRecord[] = rawRecords.map(r => ({
    ...r,
    // Prefer endTimestamp, fallback to raw expiresAt if present
    expiresAt: (r.endTimestamp ?? r.expiresAt) ?? null,
  }));
  console.log(`fetchAllRecords: total records = ${allRecords.length}`);
  return allRecords;
}
