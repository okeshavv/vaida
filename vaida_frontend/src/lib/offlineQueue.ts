/**
 * ─── VAIDA Offline Sync Engine ──────────────────────────────
 *
 * IndexedDB-backed queue for offline POST/PUT/PATCH requests.
 * Uses the `idb` library (already in package.json) for a clean
 * promise-based API over IndexedDB.
 *
 * Flow:
 *   1. When offline, requests are intercepted (in api/client.ts)
 *      and stored in IDB via offlineQueue.enqueue().
 *   2. A "online" event listener triggers flushQueue() which
 *      replays every queued request sequentially.
 *   3. Successful replays are marked "synced"; failures increment
 *      retry_count and stay in queue (max 5 retries).
 *
 * This module is imported by:
 *   - src/api/client.ts (enqueue on network failure)
 *   - src/main.tsx or App.tsx (register the online listener)
 * ─────────────────────────────────────────────────────────────
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { OfflineSyncItem, SyncStatus } from '../types';

// ─── Constants ───────────────────────────────────────────────
const DB_NAME = 'vaida_offline';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';
const MAX_RETRIES = 5;

// ─── Types ───────────────────────────────────────────────────
type QueueItemInput = Omit<OfflineSyncItem, 'id'>;

interface VaidaOfflineDB {
    [STORE_NAME]: {
        key: string;
        value: OfflineSyncItem;
        indexes: { by_status: SyncStatus };
    };
}

// ─── DB Singleton ────────────────────────────────────────────
let dbPromise: Promise<IDBPDatabase<VaidaOfflineDB>> | null = null;

function getDB(): Promise<IDBPDatabase<VaidaOfflineDB>> {
    if (!dbPromise) {
        dbPromise = openDB<VaidaOfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('by_status', 'status');
                }
            },
        });
    }
    return dbPromise;
}

// ─── Queue Operations ────────────────────────────────────────
async function enqueue(item: QueueItemInput): Promise<string> {
    const db = await getDB();
    const id = crypto.randomUUID();
    const record: OfflineSyncItem = { ...item, id };
    await db.put(STORE_NAME, record);
    console.log('[OfflineQueue] Enqueued:', id, item.endpoint);
    return id;
}

async function getAll(): Promise<OfflineSyncItem[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
}

async function getQueued(): Promise<OfflineSyncItem[]> {
    const db = await getDB();
    return db.getAllFromIndex(STORE_NAME, 'by_status', 'queued');
}

async function getFailed(): Promise<OfflineSyncItem[]> {
    const db = await getDB();
    return db.getAllFromIndex(STORE_NAME, 'by_status', 'failed');
}

async function updateStatus(
    id: string,
    status: SyncStatus,
    extra?: Partial<OfflineSyncItem>,
): Promise<void> {
    const db = await getDB();
    const item = await db.get(STORE_NAME, id);
    if (!item) return;
    const updated = { ...item, status, ...extra };
    await db.put(STORE_NAME, updated);
}

async function remove(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
}

async function clear(): Promise<void> {
    const db = await getDB();
    await db.clear(STORE_NAME);
}

async function count(): Promise<number> {
    const db = await getDB();
    return db.count(STORE_NAME);
}

async function pendingCount(): Promise<number> {
    const db = await getDB();
    const queued = await db.countFromIndex(STORE_NAME, 'by_status', 'queued');
    const failed = await db.countFromIndex(STORE_NAME, 'by_status', 'failed');
    return queued + failed;
}

// ─── Flush / Sync Logic ─────────────────────────────────────
async function flushQueue(): Promise<{ synced: number; failed: number }> {
    if (!navigator.onLine) {
        console.log('[OfflineQueue] Still offline — skipping flush');
        return { synced: 0, failed: 0 };
    }

    const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
    const token = localStorage.getItem('vaida_access_token');

    // Gather items eligible for retry
    const queued = await getQueued();
    const retryable = (await getFailed()).filter((i) => i.retry_count < MAX_RETRIES);
    const items = [...queued, ...retryable];

    if (items.length === 0) {
        console.log('[OfflineQueue] Nothing to sync');
        return { synced: 0, failed: 0 };
    }

    console.log(`[OfflineQueue] Flushing ${items.length} items…`);

    let synced = 0;
    let failed = 0;

    for (const item of items) {
        await updateStatus(item.id, 'syncing');

        try {
            const res = await fetch(`${apiBase}${item.endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(item.payload_json),
            });

            if (res.ok) {
                await updateStatus(item.id, 'synced', {
                    synced_at: new Date().toISOString(),
                });
                synced++;
                console.log(`[OfflineQueue] ✓ Synced ${item.id} → ${item.endpoint}`);
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (err) {
            failed++;
            await updateStatus(item.id, 'failed', {
                retry_count: item.retry_count + 1,
            });
            console.warn(
                `[OfflineQueue] ✗ Failed ${item.id} (attempt ${item.retry_count + 1}/${MAX_RETRIES})`,
                err,
            );
        }
    }

    // Purge successfully synced items older than 1 hour
    const all = await getAll();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const item of all) {
        if (item.status === 'synced' && item.synced_at && new Date(item.synced_at).getTime() < oneHourAgo) {
            await remove(item.id);
        }
    }

    return { synced, failed };
}

// ─── Auto-sync listener setup ────────────────────────────────
let listenerRegistered = false;

function registerOnlineListener(): void {
    if (listenerRegistered) return;
    listenerRegistered = true;

    window.addEventListener('online', () => {
        console.log('[OfflineQueue] Network restored — triggering sync');
        flushQueue().then((result) => {
            if (result.synced > 0) {
                console.log(`[OfflineQueue] Sync complete: ${result.synced} synced, ${result.failed} failed`);
            }
        });
    });

    // Also attempt on startup if online
    if (navigator.onLine) {
        setTimeout(() => flushQueue(), 3000);
    }
}

// ─── Export ──────────────────────────────────────────────────
export const offlineQueue = {
    enqueue,
    getAll,
    getQueued,
    getFailed,
    updateStatus,
    remove,
    clear,
    count,
    pendingCount,
    flushQueue,
    registerOnlineListener,
};