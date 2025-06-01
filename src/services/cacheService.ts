import { openDB } from 'idb';

const DB_NAME = 'omnis-cache';
const STORE_NAME = 'cache-store';
const DB_VERSION = 1;

// Initialize the IndexedDB
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create a store with a timestamp for cache invalidation
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'key'
      });
      store.createIndex('expires', 'expires');
    }
  });
}

// Get item from cache
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await store.get(key);
    
    if (!result) {
      return null;
    }
    
    // Check if the cache has expired
    if (result.expires && result.expires < Date.now()) {
      // Cache expired, delete it
      const deleteTx = db.transaction(STORE_NAME, 'readwrite');
      const deleteStore = deleteTx.objectStore(STORE_NAME);
      await deleteStore.delete(key);
      await deleteTx.done;
      return null;
    }
    
    return result.value as T;
  } catch (error) {
    console.error('Error retrieving from cache:', error);
    return null;
  }
}

// Set item in cache
export async function setCache<T>(key: string, value: T, expiryTime?: number): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const expires = expiryTime ? Date.now() + expiryTime : null;
    
    await store.put({
      key,
      value,
      expires,
      timestamp: Date.now()
    });
    
    await tx.done;
  } catch (error) {
    console.error('Error setting cache:', error);
  }
}

// Clear entire cache or specific key
export async function clearCache(key?: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    if (key) {
      await store.delete(key);
    } else {
      await store.clear();
    }
    
    await tx.done;
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

// Clean expired cache entries
export async function cleanExpiredCache(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('expires');
    
    const now = Date.now();
    let cursor = await index.openCursor();
    
    while (cursor) {
      if (cursor.value.expires && cursor.value.expires < now) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    
    await tx.done;
  } catch (error) {
    console.error('Error cleaning expired cache:', error);
  }
}