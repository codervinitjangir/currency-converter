// ==========================================
// FluxCurrency - API Logic
// ==========================================

import { getFromCache, saveToCache, CACHE_TTL } from './db.js';
export const API_URL = 'https://api.frankfurter.app';

// Main Fetch Function
export async function fetchWithCache(url) {
  const cached = await getFromCache(url);
  const isFresh = cached && (Date.now() - cached.timestamp < CACHE_TTL);

  // 1. Return fresh cache immediately
  if (isFresh) {
    return cached.data;
  }

  // 2. Fetch fresh data
  try {
    const res = await fetch(url);
    const data = await res.json();
    await saveToCache(url, data);
    return data;
  } catch (err) {
    // 3. Offline Fallback: Return stale cache if available
    console.warn('Network failed, checking stale cache...', err);
    if (cached) {
      return cached.data;
    }
    throw err; // No cache + No network = Error
  }
}

export async function fetchLatestRates(fromCurrency) {
    return fetchWithCache(`${API_URL}/latest?from=${fromCurrency}`);
}

export async function fetchHistoryData(from, to, historyDays) {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date();
    start.setDate(start.getDate() - historyDays);
    const startStr = start.toISOString().split('T')[0];

    return fetchWithCache(`${API_URL}/${startStr}..${end}?from=${from}&to=${to}`);
}
