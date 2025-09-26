export type ShareRecord = {
  id: string;
  content: string;
  mode?: string;
  createdAt: number;
};

type ShareStore = Map<string, ShareRecord>;

declare global {
  // eslint-disable-next-line no-var
  var __medxShareStore: ShareStore | undefined;
}

function getStore(): ShareStore {
  if (!globalThis.__medxShareStore) {
    globalThis.__medxShareStore = new Map();
  }
  return globalThis.__medxShareStore;
}

export function createShare(content: string, mode?: string): ShareRecord {
  const store = getStore();
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const record: ShareRecord = {
    id,
    content,
    mode,
    createdAt: Date.now(),
  };
  store.set(id, record);
  return record;
}

export function getShare(id: string): ShareRecord | null {
  const store = getStore();
  return store.get(id) ?? null;
}
