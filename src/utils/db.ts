// src/utils/db.ts
// IndexedDB wrapper using idb
import { openDB, DBSchema } from 'idb';

interface ArnsDB extends DBSchema {
  records: {
    key: string; // name
    value: any; // ArNSRecord
  };
}

const DB_NAME = 'omnis-arns-db';
const DB_VERSION = 1;

export async function getDB() {
  return openDB<ArnsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('records')) {
        db.createObjectStore('records', { keyPath: 'name' });
      }
    },
  });
}

export async function saveRecords(records: any[]) {
  const db = await getDB();
  const tx = db.transaction('records', 'readwrite');
  for (const rec of records) {
    await tx.store.put(rec);
  }
  await tx.done;
}

// Smart save: only update owner if new owner is non-empty and different
export async function saveRecordsSmart(records: any[]) {
  const db = await getDB();
  const tx = db.transaction('records', 'readwrite');
  for (const rec of records) {
    const existing = await tx.store.get(rec.name);
    if (!existing) {
      await tx.store.put(rec);
    } else {
      // Merge new owner or expiration if changed
      let shouldUpdate = false;
      const updated: any = { ...existing };
      if (rec.owner && rec.owner !== existing.owner) {
        updated.owner = rec.owner;
        shouldUpdate = true;
      }
      if (rec.expiresAt != null && rec.expiresAt !== existing.expiresAt) {
        updated.expiresAt = rec.expiresAt;
        shouldUpdate = true;
      }
      if (rec.primaryName && rec.primaryName !== existing.primaryName) {
        updated.primaryName = rec.primaryName;
        shouldUpdate = true;
      }
      if (Array.isArray(rec.underNames) && JSON.stringify(rec.underNames) !== JSON.stringify(existing.underNames)) {
        updated.underNames = rec.underNames;
        shouldUpdate = true;
      }
      if (shouldUpdate) {
        await tx.store.put(updated);
      }
    }
  }
  await tx.done;
}

export async function getAllRecords(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('records');
}

export async function getRecord(name: string): Promise<any | undefined> {
  const db = await getDB();
  return db.get('records', name);
}

export async function clearRecords() {
  const db = await getDB();
  await db.clear('records');
}
