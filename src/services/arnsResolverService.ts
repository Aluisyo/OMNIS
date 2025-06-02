// src/services/arnsResolverService.ts
import { ARIO } from '@ar.io/sdk';
import { resolveOwnersBatchInWorker } from './arnsWorkerClient';
import { saveRecordsSmart, getAllRecords } from '../utils/db';
import type { ArNSNameResolutionData } from '../types/ArNSNameResolutionData';
import type { ArNSRecord } from '../types';

const ario = ARIO.mainnet();

async function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

/**
 * Retry resolution with exponential backoff on rate-limit errors.
 */
export async function resolveWithBackoff(
  record: ArNSRecord,
  maxRetries = 5
): Promise<ArNSNameResolutionData> {
  let attempt = 0;
  let delay = 2000; // start with 2s
  const jitter = 1000; // randomness to avoid sync retries

  while (attempt < maxRetries) {
    try {
      if (attempt > 0) {
        const jitterAmount = Math.floor(Math.random() * jitter);
        const waitTime = delay + jitterAmount;
        console.log(
          `Retry attempt ${attempt} for ${record.name}, waiting ${waitTime}ms`
        );
        await new Promise(res => setTimeout(res, waitTime));
      }

      const resolved = await ario.resolveArNSName({ name: record.name });
      return resolved as ArNSNameResolutionData;
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('429')) {
        attempt++;
        delay = Math.min(delay * 2, 30000); // cap at 30s
      } else {
        attempt++;
        console.error(`Error resolving ${record.name}:`, e);
      }
    }
  }

  console.warn(
    `Max retries (${maxRetries}) reached for ${record.name}. Returning partial record.`
  );
  return { name: record.name, owner: record.owner || '', type: record.type || 'unknown' } as ArNSNameResolutionData;
}

/**
 * Batch resolve owners in worker, with 1s pause between batches.
 */
export async function resolveAllArnsWithBackoff(
  records: ArNSRecord[]
): Promise<void> {
  for (let i = 0; i < records.length; i += 20) {
    const batch = records.slice(i, i + 20);
    try {
      const resolvedBatch = await resolveOwnersBatchInWorker(batch);
      await saveRecordsSmart(resolvedBatch);
    } catch (e) {
      console.warn('Failed to resolve batch in worker:', e);
    }
    await sleep(1000);
  }
}

/**
 * Resolve missing owners for all records in IndexedDB.
 */
export async function resolveMissingOwnersInDB(): Promise<void> {
  try {
    const all = await getAllRecords();
    const missing = all.filter((rec: ArNSRecord) => !rec.owner);
    if (missing.length > 0) {
      await resolveAllArnsWithBackoff(missing);
    }
  } catch (err) {
    console.error('Error resolving missing owners in DB:', err);
  }
}
