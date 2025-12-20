// ==========================================
// FluxCurrency - Database & Cache
// ==========================================

const DB_NAME = 'currencyDB';
const DB_VERSION = 1;
const STORE_NAME = 'rates';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Initialize DB Promise
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = (event) => {
    console.warn('IndexedDB error:', event.target.error);
    resolve(null);
  };
  request.onsuccess = (event) => resolve(event.target.result);
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'url' });
    }
  };
});

// Helpers
export const getDb = async () => {
  try {
    return await dbPromise;
  } catch (e) {
    console.warn('DB failed to open', e);
    return null;
  }
};

export const getFromCache = async (url) => {
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(url);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

export const saveToCache = async (url, data) => {
  const db = await getDb();
  if (!db) return;

  try {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).put({ url, data, timestamp: Date.now() });
  } catch (e) {
    console.warn('Failed to save to cache', e);
  }
};

export { CACHE_TTL };

