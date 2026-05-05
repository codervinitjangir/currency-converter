// ==========================================
// FluxCurrency - API Logic
// ==========================================

import { getFromCache, saveToCache, CACHE_TTL } from './db.js';
export const API_URL = 'https://api.frankfurter.dev';
export const ALT_API_URL = 'https://open.er-api.com/v6/latest';

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
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
    try {
        // Try ExchangeRate-API v6
        const data = await fetchWithCache(`${ALT_API_URL}/${fromCurrency}`);
        
        // Normalize v6 response to match Frankfurter-like structure if needed
        // v6 returns { result: "success", rates: { ... }, ... }
        if (data.result === 'success') {
            return data;
        }
        throw new Error('ExchangeRate-API v6 returned non-success result');
    } catch (err) {
        console.warn('ExchangeRate-API failed, falling back to Frankfurter...', err);
        return fetchWithCache(`${API_URL}/latest?from=${fromCurrency}`);
    }
}

export async function fetchHistoryData(from, to, historyDays) {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date();
    start.setDate(start.getDate() - historyDays);
    const startStr = start.toISOString().split('T')[0];

    return fetchWithCache(`${API_URL}/${startStr}..${end}?from=${from}&to=${to}`);
}
