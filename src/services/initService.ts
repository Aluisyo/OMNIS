// src/services/initService.ts
import { clearRecords, saveRecords, saveRecordsSmart } from '../utils/db';
import { getArnsGatewayUrl } from '../config';
import { fetchWithFallback } from './wayfinderService';

/**
 * Initialize IndexedDB by fetching delta updates from Arweave manifest.
 * Persists last-seen manifest in localStorage and only fetches new chunks.
 */
export async function initializeDB(): Promise<void> {
  console.log('📥 Initializing IndexedDB from Arweave manifest (delta fetch)...');

  // Fetch manifest via Wayfinder
  const gatewayUrl = await getArnsGatewayUrl();
  const manifestJson: any = await fetchWithFallback<any>(gatewayUrl);
  const pathsMap: Record<string, { id: string }> = manifestJson.paths ?? manifestJson.manifest?.paths;
  if (!pathsMap) {
    throw new Error('Manifest missing "paths"');
  }
  // Sort chunk filenames
  const manifestPaths = Object.keys(pathsMap).sort((a, b) => {
    const aIdx = parseInt(a.match(/chunk-(\d+)\.json/)?.[1] ?? '0', 10);
    const bIdx = parseInt(b.match(/chunk-(\d+)\.json/)?.[1] ?? '0', 10);
    return aIdx - bIdx;
  });
  const STORAGE_KEY = 'omnis-manifest-paths';
  const prevJson = localStorage.getItem(STORAGE_KEY);
  const prevPaths: string[] = prevJson ? JSON.parse(prevJson) : [];
  const newPaths = manifestPaths.filter(p => !prevPaths.includes(p));
  const firstRun = !prevJson;
  if (firstRun) {
    console.log('First run: clearing existing records');
    await clearRecords();
  }
  if (newPaths.length === 0) {
    console.log('No new chunks to fetch');
  } else {
    // Fetch only new chunks
    const chunkResults = await Promise.all(
      newPaths.map(async fname => {
        const id = pathsMap[fname].id;
                try {
          const json = await fetchWithFallback<{ records: any[] }>(`ar://${id}`);
          console.log(`Loaded ${json.records.length} from ${fname}`);
          return json.records;
        } catch (error) {
          console.warn(`Failed to fetch chunk ${fname} id=${id}:`, error);
          return [] as any[];
        }
      })
    );
    const rawRecords = chunkResults.flat();
    // Map endTimestamp to expiresAt so UI can render expiration dates
    const newRecords = rawRecords.map(r => ({
      ...r,
      expiresAt: (r.endTimestamp ?? r.expiresAt) ?? null,
    }));
    if (firstRun) {
      await saveRecords(newRecords);
    } else {
      await saveRecordsSmart(newRecords);
    }
  }
  // Persist updated manifest
  localStorage.setItem(STORAGE_KEY, JSON.stringify(manifestPaths));
  console.log('✅ IndexedDB updated with delta records');
}
