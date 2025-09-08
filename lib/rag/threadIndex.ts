import MiniSearch from 'minisearch';

const store = new Map<string, MiniSearch>();

export function ensureIndex(tid: string) {
  if (!store.has(tid)) {
    store.set(
      tid,
      new MiniSearch({
        fields: ['text', 'tags'],
        storeFields: ['text', 'id'],
        idField: 'id',
      })
    );
  }
  return store.get(tid)!;
}

export function indexTurn(tid: string, id: string, text: string, tags: string[] = []) {
  ensureIndex(tid).add({ id, text, tags: tags.join(' ') });
}

export function searchTurns(tid: string, q: string, limit = 5) {
  const idx = store.get(tid);
  if (!idx) return [];
  return idx.search(q, { prefix: true, fuzzy: 0.2 }).slice(0, limit);
}
