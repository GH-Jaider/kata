// Minimal IndexedDB wrapper: a key-value store ('kv') and a blob store for photos ('photos').

let name = 'kata';
let dbp = null;

export function useDatabase(dbName) {
  name = dbName;
  dbp = null;
}

function open() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv');
      req.result.createObjectStore('photos');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const result = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const idb = {
  get: (store, key) => run(store, 'readonly', s => s.get(key)),
  set: (store, key, value) => run(store, 'readwrite', s => { s.put(value, key); }),
  del: (store, key) => run(store, 'readwrite', s => { s.delete(key); }),
  setMany: (store, entries) => run(store, 'readwrite', s => { for (const [k, v] of entries) s.put(v, k); }),
  clear: store => run(store, 'readwrite', s => { s.clear(); }),
  async entries(store) {
    const out = {};
    await run(store, 'readonly', s => {
      s.openCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (!cursor) return;
        out[cursor.key] = cursor.value;
        cursor.continue();
      };
    });
    return out;
  },
};
