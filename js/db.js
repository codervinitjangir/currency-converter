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

// ==========================================
// Backup & Restore
// ==========================================

export async function exportData() {
  const db = await getDb();
  if (!db) {
    alert("Database not ready!");
    return;
  }

  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = () => {
    const data = request.result;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `flux-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  request.onerror = () => alert("Failed to export data.");
}

export async function importData(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error("Invalid Format");

      const db = await getDb();
      if (!db) return;

      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      data.forEach(item => store.put(item));

      tx.oncomplete = () => {
        alert("Data restored successfully! Refreshing...");
        window.location.reload();
      };
      
      tx.onerror = () => alert("Failed to save data to DB.");

    } catch (err) {
      console.error(err);
      alert("Invalid backup file.");
    }
  };
  reader.readAsText(file);
}
