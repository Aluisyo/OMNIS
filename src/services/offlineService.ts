import { openDB } from 'idb';
import { setCache, getCache } from './cacheService';

const OUTBOX_DB = 'omnis-outbox';
const OUTBOX_STORE = 'outbox';
const OUTBOX_DB_VERSION = 1;

async function getOutboxDB() {
  return openDB(OUTBOX_DB, OUTBOX_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { autoIncrement: true });
      }
    },
  });
}

/**
 * GET wrapper with caching
 */
export async function apiGet<T>(url: string, expiryTime: number = 1000 * 60 * 5): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`GET ${url} failed: ${res.status}`);
    }
    const json = (await res.json()) as T;
    await setCache(url, json, expiryTime);
    return json;
  } catch (error) {
    const cached = await getCache<T>(url);
    if (cached !== null) {
      return cached;
    }
    throw error;
  }
}

/**
 * Queue mutation requests when offline
 */
export async function queueRequest(url: string, options: RequestInit): Promise<void> {
  const db = await getOutboxDB();
  await db.add(OUTBOX_STORE, { url, options });
}

/**
 * Process queued mutation requests when back online
 */
export async function processOutbox(): Promise<void> {
  const db = await getOutboxDB();
  const tx = db.transaction(OUTBOX_STORE, 'readwrite');
  const store = tx.objectStore(OUTBOX_STORE);
  let cursor = await store.openCursor();
  while (cursor) {
    const { url, options } = cursor.value;
    try {
      await fetch(url, options);
      await cursor.delete();
    } catch (error) {
      console.error('Failed to process outbox request', error);
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

// Wrapper for POST/PUT requests with offline queuing
export async function apiMutate(
  url: string,
  options: RequestInit
): Promise<Response> {
  if (!navigator.onLine) {
    await queueRequest(url, options);
    return new Response(null, { status: 202, statusText: 'Queued (offline)' });
  }
  return fetch(url, options);
}
