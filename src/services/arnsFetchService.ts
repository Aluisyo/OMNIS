// src/services/arnsFetchService.ts
import type { ArNSRecord } from '../types';
import { getArNSRecords, getAllArnsFromDB } from './arnsService';
import { saveRecordsSmart } from '../utils/db';

// Removed ARIO resolution here; owners mapping only from DB or raw

export interface FetchArnsResult {
  items: ArNSRecord[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Fetch and map ArNS records: applies owner resolution only when missing,
 * then persists via smart save, and returns typed ArNSRecord[]
 */
export async function fetchAndMapArns(
  cursor?: string,
  limit: number = 30
): Promise<FetchArnsResult> {
  const { items: rawItems, nextCursor, hasMore } =
    await getArNSRecords({ cursor, limit });
  // Cast to any[] to map to our ArNSRecord shape without TS complaints
  const rawItemsAny = rawItems as any[];
  const dbRecords = await getAllArnsFromDB();
  const dbMap = new Map<string, ArNSRecord>(
    dbRecords.map((r: ArNSRecord) => [r.name, r])
  );

  const items: ArNSRecord[] = [];
  for (const item of rawItemsAny) {
    const cached = dbMap.get(item.name);
    const rec: ArNSRecord = {
      id: item.name,
      name: item.name,
      owner: cached?.owner ?? item.owner ?? '',
      processId: item.processId ?? '',
      purchasePrice: item.purchasePrice,
      startTimestamp: item.startTimestamp,
      type: item.type,
      undernames: (item as any).undernames,
      expiresAt: cached?.expiresAt ?? ((item.type === 'lease') ? (item as any).endTimestamp : null),
      price: item.purchasePrice?.toString() ?? '',
      contractTxId: item.processId ?? '',
      title: (item as any).title ?? '',
      description: (item as any).description ?? '',
      category: (item as any).category ?? '',
      tags: (item as any).tags ?? [],
    };
    items.push(rec);
  }

  await saveRecordsSmart(items);
  return { items, nextCursor, hasMore };
}
