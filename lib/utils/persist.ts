// Lightweight IndexedDB wrapper w/ localStorage fallback for long messages.
const DB_NAME = "medx-chat";
const STORE = "messages";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_STORAGE_BYTES = 5 * 1024 * 1024;

type StoredPayload<T = any> = { key: string; value: T; ts: number };

let db: IDBDatabase | null = null;

function now() {
  return Date.now();
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isExpired(entryTs: number | undefined, ttlMs: number): boolean {
  if (!entryTs) return false;
  if (ttlMs <= 0) return false;
  return now() - entryTs > ttlMs;
}

async function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB unavailable"));
  }
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db!);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: any) {
  try {
    const d = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = d.transaction(STORE, "readwrite");
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.objectStore(STORE).put({ key, value, ts: now() });
    });
  } catch {
    if (isBrowser() && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify({ value, ts: now() }));
      } catch {
        // ignore storage quota errors
      }
    }
  }
}

async function idbGetRaw<T = any>(key: string): Promise<StoredPayload<T> | null> {
  try {
    const d = await openDB();
    return await new Promise<StoredPayload<T> | null>((res, rej) => {
      const tx = d.transaction(STORE, "readonly");
      tx.onerror = () => rej(tx.error);
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const record = req.result as StoredPayload<T> | undefined;
        res(record ?? null);
      };
      req.onerror = () => rej(req.error);
    });
  } catch {
    if (!isBrowser() || typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredPayload<T>;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }
}

async function idbDel(key: string) {
  try {
    const d = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = d.transaction(STORE, "readwrite");
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.objectStore(STORE).delete(key);
    });
  } catch {
    if (isBrowser() && typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }
}

type IterateCallback = (entry: StoredPayload<any>) => void | Promise<void>;

async function iterateEntries(cb: IterateCallback): Promise<void> {
  const tasks: Promise<void>[] = [];
  try {
    const d = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = d.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          res();
          return;
        }
        const record = cursor.value as StoredPayload<any>;
        const maybe = cb(record);
        if (maybe && typeof (maybe as Promise<void>).then === "function") {
          tasks.push(Promise.resolve(maybe).catch(() => undefined));
        }
        cursor.continue();
      };
      req.onerror = () => rej(req.error);
    });
  } catch {
    if (!isBrowser() || typeof localStorage === "undefined") {
      return;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const maybe = cb({ ...(JSON.parse(raw) as StoredPayload<any>), key });
        if (maybe && typeof (maybe as Promise<void>).then === "function") {
          tasks.push(Promise.resolve(maybe).catch(() => undefined));
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }
  if (tasks.length) {
    await Promise.all(tasks);
  }
}

async function removeByPrefix(prefix: string) {
  if (!isBrowser()) return;
  const normalized = prefix === "*" ? "" : prefix;
  try {
    const d = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = d.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          res();
          return;
        }
        if (!normalized || String(cursor.key).startsWith(normalized)) {
          cursor.delete();
        }
        cursor.continue();
      };
      req.onerror = () => rej(req.error);
    });
  } catch {
    if (typeof localStorage === "undefined") return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!normalized || key.startsWith(normalized)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }
}

export const persist = {
  key(chatId: string, messageId: string) {
    return `chat:${chatId}:msg:${messageId}`;
  },
  async save(chatId: string, msg: any, opts?: { ttlMs?: number; maxBytes?: number }) {
    if (!isBrowser()) return;
    if (!msg || typeof msg.id !== "string") return;
    const maxBytes = opts?.maxBytes ?? MAX_STORAGE_BYTES;
    const estimate = await this.estimateSize(opts);
    if (estimate.bytes >= maxBytes) {
      return;
    }
    await idbSet(this.key(chatId, msg.id), msg);
  },
  async load<T = any>(chatId: string, messageId: string, opts?: { ttlMs?: number }): Promise<T | null> {
    if (!isBrowser()) return null;
    const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
    const key = this.key(chatId, messageId);
    const record = await idbGetRaw<T>(key);
    if (!record) return null;
    if (isExpired(record.ts, ttlMs)) {
      await idbDel(key);
      return null;
    }
    return record.value ?? null;
  },
  async loadByChatPrefix(chatId: string, opts?: { ttlMs?: number }) {
    if (!isBrowser()) return [] as any[];
    const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
    const prefix = `chat:${chatId}:msg:`;
    const results: any[] = [];
    await iterateEntries(async (entry) => {
      if (!String(entry.key).startsWith(prefix)) return;
      if (isExpired(entry.ts, ttlMs)) {
        await idbDel(entry.key);
        return;
      }
      results.push(entry.value);
    });
    return results;
  },
  async remove(chatId: string, messageId: string) {
    if (!isBrowser()) return;
    await idbDel(this.key(chatId, messageId));
  },
  async clearByPrefix(prefix: string) {
    if (!isBrowser()) return;
    const normalizedPrefix = (() => {
      if (prefix === "*") return "";
      if (prefix.startsWith("chat:")) {
        if (prefix.includes(":msg")) {
          return prefix.endsWith(":") ? prefix : `${prefix}:`;
        }
        return `${prefix}:msg:`;
      }
      return `chat:${prefix}:msg:`;
    })();
    const target = normalizedPrefix;
    await removeByPrefix(target);
  },
  async estimateSize(opts?: { ttlMs?: number }) {
    if (!isBrowser()) {
      return { bytes: 0, entries: 0 };
    }
    const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
    let bytes = 0;
    let entries = 0;
    await iterateEntries((entry) => {
      if (isExpired(entry.ts, ttlMs)) {
        return idbDel(entry.key);
      }
      try {
        bytes += JSON.stringify(entry).length;
        entries += 1;
      } catch {
        // ignore serialization failures
      }
    });
    return { bytes, entries };
  },
  DEFAULT_TTL_MS,
};
