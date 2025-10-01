// Lightweight IndexedDB wrapper w/ localStorage fallback for long messages.
const DB_NAME = "medx-chat";
const STORE = "messages";
let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
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
      tx.objectStore(STORE).put({ key, value, ts: Date.now() });
    });
  } catch {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
    }
  }
}

async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const d = await openDB();
    return await new Promise<T | null>((res, rej) => {
      const tx = d.transaction(STORE, "readonly");
      tx.onerror = () => rej(tx.error);
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => res(req.result?.value ?? null);
      req.onerror = () => rej(req.error);
    });
  } catch {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw).value as T) : null;
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
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  }
}

export const persist = {
  key(chatId: string, messageId: string) {
    return `chat:${chatId}:msg:${messageId}`;
  },
  async save(chatId: string, msg: any) {
    await idbSet(this.key(chatId, msg.id), msg);
  },
  async load(chatId: string, messageId: string) {
    return await idbGet(this.key(chatId, messageId));
  },
  async loadByChatPrefix(chatId: string) {
    const results: any[] = [];
    try {
      const d = await openDB();
      return new Promise<any[]>((res, rej) => {
        const tx = d.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return res(results);
          if (String(cursor.key).startsWith(`chat:${chatId}:msg:`)) {
            results.push(cursor.value.value);
          }
          cursor.continue();
        };
        req.onerror = () => rej(req.error);
      });
    } catch {
      if (typeof localStorage !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)!;
          if (k.startsWith(`chat:${chatId}:msg:`)) {
            const raw = localStorage.getItem(k)!;
            results.push(JSON.parse(raw).value);
          }
        }
      }
      return results;
    }
  },
  async remove(chatId: string, messageId: string) {
    await idbDel(this.key(chatId, messageId));
  }
};
