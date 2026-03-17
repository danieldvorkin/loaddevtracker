import { db, auth } from "./firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

type PendingLoad = {
  localId: string;
  // optional serverId when this pending record corresponds to an existing server document
  serverId?: string;
  name: string;
  description?: string;
  entries: unknown[];
  createdAt: number;
};

const STORAGE_KEY = "pendingLoads";

function readStore(): PendingLoad[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingLoad[];
  } catch (e) {
    console.error("Failed to read pending loads from localStorage:", e);
    return [];
  }
}

function writeStore(items: PendingLoad[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to write pending loads to localStorage:", e);
  }
}

export function addPendingLoad(
  load: Omit<PendingLoad, "localId" | "createdAt">,
) {
  const items = readStore();
  const pending: PendingLoad = {
    ...load,
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  items.push(pending);
  writeStore(items);
  // emit storage event for same-window listeners
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch {
    // ignore
  }
  return pending;
}

export function upsertPendingLoadByServerId(
  serverId: string,
  load: Omit<PendingLoad, "localId" | "createdAt" | "serverId">,
) {
  const items = readStore();
  const idx = items.findIndex((i) => i.serverId === serverId);
  if (idx >= 0) {
    // merge entries (overwrite with provided)
    items[idx] = {
      ...items[idx],
      name: load.name,
      description: load.description,
      entries: load.entries,
      createdAt: Date.now(),
      serverId,
    };
  } else {
    const pending: PendingLoad = {
      ...load,
      serverId,
      localId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    items.push(pending);
  }
  writeStore(items);
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch {}
}

export function getPendingLoads() {
  return readStore();
}

export function clearPendingLoad(localIdOrServerId: string) {
  const items = readStore().filter(
    (i) => i.localId !== localIdOrServerId && i.serverId !== localIdOrServerId,
  );
  writeStore(items);
}

export async function syncPendingLoads(onProgress?: (msg: string) => void) {
  const items = readStore();
  if (!items.length) return { ok: true, synced: 0 };

  let synced = 0;
  try {
    if (!auth.currentUser) await signInAnonymously(auth);
  } catch (e) {
    console.warn("Anonymous sign-in failed during sync:", e);
  }

  for (const item of items) {
    try {
      onProgress?.(`Syncing ${item.name}...`);
      await addDoc(collection(db, "loads"), {
        name: item.name,
        description: item.description ?? "",
        entries: item.entries ?? [],
        ownerId: (auth.currentUser as any)?.uid ?? null,
        createdAt: serverTimestamp(),
      });
      // removed from pending on success
      clearPendingLoad(item.localId);
      synced += 1;
      onProgress?.(`Synced ${item.name}`);
    } catch (e) {
      console.error("Failed to sync pending load:", item, e);
      // continue to next item
      onProgress?.(`Failed to sync ${item.name}`);
    }
  }

  return { ok: true, synced };
}
