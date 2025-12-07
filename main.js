// ==========================================
// FluxCurrency - Main Logic
// ==========================================

const API_URL = 'https://api.frankfurter.app';
let chartInstance = null;
let debounceTimer = null;


// State
const state = {
  amount: 0,
  from: 'USD',
  to: 'INR',
  currencies: {},
  historyDays: 90
};

// DOM Elements
const els = {
  amount: document.getElementById('amount'),
  from: document.getElementById('from-currency'),
  to: document.getElementById('to-currency'),
  result: document.getElementById('result-amount'),
  rate: document.getElementById('exchange-rate'),
  lblFrom: document.getElementById('lbl-from'),
  lblTo: document.getElementById('lbl-to'),
  swap: document.getElementById('swap-btn'),
  chart: document.getElementById('marketChart'),
  filters: document.querySelectorAll('.filter-btn'),
  slider: document.getElementById('slider-track'),
  flagFrom: document.getElementById('from-flag'),
  flagTo: document.getElementById('to-flag'),
  themeToggle: document.getElementById('theme-toggle'),
};

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setTheme(localStorage.getItem('theme') || 'dark');
  initChart();
  loadCurrencies();
  setupEventListeners();

  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      // .then(() => console.log('Service Worker Registered'))
      .catch(err => console.error('SW Registration Failed:', err));
  }
}

function setupEventListeners() {
  // Amount Input (Debounced)
  els.amount.addEventListener('input', (e) => {
    if (e.target.value.length > 20) {
      e.target.value = e.target.value.slice(0, 20);
    }
    const val = parseFloat(e.target.value);
    state.amount = isNaN(val) ? 0 : val;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateExchangeRate,400);
  });

  // Currency Selects
  els.from.addEventListener('change', (e) => {
    state.from = e.target.value;
    handleCurrencyChange();
  });

  els.to.addEventListener('change', (e) => {
    state.to = e.target.value;
    handleCurrencyChange();
  });

  // Swap Button
  els.swap.addEventListener('click', () => {
    // Swap state
    [state.from, state.to] = [state.to, state.from];
    // Update UI
    els.from.value = state.from;
    els.to.value = state.to;
    
    // Animate icon
    const icon = els.swap.querySelector('svg');
    icon.style.transform = 'rotate(180deg)';
    setTimeout(() => icon.style.transform = 'rotate(0deg)', 300);
    
    handleCurrencyChange();
  });

  // Time Filters
  els.filters.forEach(btn => {
    btn.addEventListener('click', () => {
      els.filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.historyDays = parseInt(btn.dataset.days);
      loadHistory();
    });
  });

  // Theme Toggle
  els.themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'light' : 'dark');
  });
}

function handleCurrencyChange() {
  updateFlags();
  updateExchangeRate();
  loadHistory();
}

// ==========================================
// Backup & Restore System
// ==========================================

async function exportData() {
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

async function importData(file) {
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

// ==========================================
// Info Modal System
// ==========================================

const modalContent = {
  privacy: {
    title: "Privacy Policy",
    body: "Your privacy is our priority. FluxCurrency operates entirely on your device (Client-Side). We do not store, collect, or transmit any of your personal financial data or usage history to external servers. All data remains strictly local in your browser's secure database."
  },
  support: {
    title: "Support",
    body: "Need assistance? We're here to help! For inquiries, bug reports, or feedback, please reach out to us at <br><br><strong>djangir0090@gmail.com</strong><br><br>We aim to respond to all queries within 24-48 hours."
  }
};

function openModal(type) {
  const content = modalContent[type];
  if (!content) return;
  
  document.getElementById('modal-title').textContent = content.title;
  document.getElementById('modal-body').innerHTML = content.body; // Using innerHTML to support <br>
  document.getElementById('info-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('info-modal').classList.add('hidden');
  document.getElementById('info-modal').classList.add('hidden');
}

// ==========================================
// Network Status Logic
// ==========================================

function updateNetworkStatus() {
  const badge = document.querySelector('.live-badge');
  if (!badge) return;
  
  if (navigator.onLine) {
    badge.innerHTML = '● Live Rates';
    badge.className = 'live-badge'; // Reset to default (Green)
  } else {
    badge.innerHTML = '⚠ Offline Mode';
    badge.className = 'live-badge offline'; // Set to offline (Red)
  }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
// Initial check (optional, usually start hidden)
if (!navigator.onLine) updateNetworkStatus();

// ==========================================
// API & Logic
// ==========================================

const DB_NAME = 'currencyDB';
const DB_VERSION = 1;
const STORE_NAME = 'rates';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = (event) => {
    console.warn('IndexedDB error:', event.target.error);
    resolve(null); // Fallback to no cache if DB fails
  };
  request.onsuccess = (event) => resolve(event.target.result);
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'url' });
    }
  };
});

// IndexedDB Helpers
const getDb = async () => {
  try {
    return await dbPromise;
  } catch (e) {
    console.warn('DB failed to open', e);
    return null;
  }
};

const getFromCache = async (url) => {
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(url);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

const saveToCache = async (url, data) => {
  const db = await getDb();
  if (!db) return;

  try {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).put({ url, data, timestamp: Date.now() });
  } catch (e) {
    console.warn('Failed to save to cache', e);
  }
};

// Main Fetch Function
async function fetchWithCache(url) {
  const cached = await getFromCache(url);
  const isFresh = cached && (Date.now() - cached.timestamp < CACHE_TTL);

  // 1. Return fresh cache immediately
  if (isFresh) {
    // console.log('Serving from cache (fresh):', url);
    return cached.data;
  }

  // 2. Fetch fresh data
  // console.log('Fetching fresh:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    await saveToCache(url, data);
    return data;
  } catch (err) {
    // 3. Offline Fallback: Return stale cache if available
    console.warn('Network failed, checking stale cache...', err);
    if (cached) {
      // console.log('Serving from cache (stale/offline):', url);
      return cached.data;
    }
    throw err; // No cache + No network = Error
  }
}

// 1. Generate Currency List Locally (No API Call)
function loadCurrencies() {
  try {
    const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });
    const codes = Object.keys(currencyToCountry).sort();
    
    // Store names for Slider
    state.currencies = {};
    codes.forEach(code => {
      try {
        state.currencies[code] = currencyNames.of(code);
      } catch {
        state.currencies[code] = code;
      }
    });

    // Populate Dropdowns
    const options = codes.map(code => 
      `<option value="${code}">${code} - ${state.currencies[code]}</option>`
    ).join('');
    
    els.from.innerHTML = options;
    els.to.innerHTML = options;
    
    // Set Defaults
    els.from.value = state.from;
    els.to.value = state.to;
    
    handleCurrencyChange();
  } catch (err) {
    console.error('Failed to load currencies', err);
  }
}

async function updateExchangeRate() {
  els.lblFrom.textContent = state.from;
  els.lblTo.textContent = state.to;

  if (state.from === state.to) {
    els.result.value = state.amount;
    els.rate.textContent = '1.0000';
    return;
  }

  try {
    // 1. Fetch ALL rates for the base currency (Optimized: Single Request)
    const data = await fetchWithCache(`${API_URL}/latest?from=${state.from}`);
    
    // 2. Update Calculator
    const rate = data.rates[state.to];
    if (rate) {
      els.rate.textContent = rate.toFixed(4);
      if (state.amount === 0) {
        els.result.value = '0.00';
      } else {
        const result = rate * state.amount;
        els.result.value = result.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
    }

    // 3. Update Slider (with all rates)
    renderSlider(data.rates);

  } catch (err) {
    console.error('Failed to fetch rates', err);
  }
}


async function loadHistory() {
  if (state.from === state.to) return;
  
  const end = new Date().toISOString().split('T')[0];
  const start = new Date();
  start.setDate(start.getDate() - state.historyDays);
  const startStr = start.toISOString().split('T')[0];

  try {
    const data = await fetchWithCache(`${API_URL}/${startStr}..${end}?from=${state.from}&to=${state.to}`);
    
    const labels = Object.keys(data.rates);
    const values = labels.map(date => data.rates[date][state.to]);
    
    updateChart(labels, values);
  } catch (err) {
    console.error('Failed to load history', err);
  }
}

// ==========================================
// UI Helpers
// ==========================================

function updateFlags() {
  const getFlag = (code) => {
    const countryCode = currencyToCountry[code] || 'un'; // 'un' for unknown/generic
    return `https://flagcdn.com/w40/${countryCode}.png`;
  };
  
  els.flagFrom.src = getFlag(state.from);
  els.flagTo.src = getFlag(state.to);
}

function renderSlider(rates) {
  els.slider.innerHTML = '';
  
  const createItem = (code, rate) => {
    const name = state.currencies[code] || code;
    return `
      <div class="slider-item">
        <div class="pair-info">
          <span class="code">${code}</span>
          <span class="name">${name}</span>
        </div>
        <span class="rate">${rate.toFixed(4)}</span>
      </div>
    `;
  };

  const itemsHtml = Object.entries(rates).map(([code, rate]) => createItem(code, rate)).join('');
  // Duplicate for seamless scroll
  els.slider.innerHTML = itemsHtml + itemsHtml; 
}

// ==========================================
// Chart.js
// ==========================================

function initChart() {
  const ctx = els.chart.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Rate',
        data: [],
        borderColor: '#6366f1',
        backgroundColor: gradient,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        x: { display: false },
        y: { display: true, grid: { color: 'rgba(255,255,255,0.05)' } }
      },
      interaction: { mode: 'index', intersect: false }
    }
  });
}

function updateChart(labels, data) {
  if (!chartInstance) return;
  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = data;
  chartInstance.update();
}




// ==========================================
// Theme Logic
// ==========================================

function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  // Update Icons
  const isLight = theme === 'light';
  els.themeToggle.querySelector('.sun-icon').style.display = isLight ? 'none' : 'block';
  els.themeToggle.querySelector('.moon-icon').style.display = isLight ? 'block' : 'none';

  // Update Chart Theme
  if (chartInstance) {
    const color = isLight ? '#64748b' : '#94a3b8';
    const grid = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    chartInstance.options.scales.y.ticks.color = color;
    chartInstance.options.scales.y.grid.color = grid;
    chartInstance.update();
  }
}

// ==========================================
// Data: Currency to Country Map
// ==========================================
const currencyToCountry = {
  AUD: 'au', BGN: 'bg', BRL: 'br', CAD: 'ca', CHF: 'ch',
  CNY: 'cn', CZK: 'cz', DKK: 'dk', EUR: 'eu', GBP: 'gb',
  HKD: 'hk', HUF: 'hu', IDR: 'id', ILS: 'il', INR: 'in',
  ISK: 'is', JPY: 'jp', KRW: 'kr', MXN: 'mx', MYR: 'my',
  NOK: 'no', NZD: 'nz', PHP: 'ph', PLN: 'pl', RON: 'ro',
  SEK: 'se', SGD: 'sg', THB: 'th', TRY: 'tr', USD: 'us',
  ZAR: 'za'
};