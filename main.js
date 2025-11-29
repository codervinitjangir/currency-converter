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
  initTheme();
  initChart();
  loadCurrencies();
  setupEventListeners();
});

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
  els.themeToggle.addEventListener('click', toggleTheme);
}

function handleCurrencyChange() {
  updateFlags();
  updateExchangeRate();
  loadPopularRates();
  loadHistory();
}

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
    console.log('Serving from cache (fresh):', url);
    return cached.data;
  }

  // 2. Fetch fresh data
  console.log('Fetching fresh:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    await saveToCache(url, data);
    return data;
  } catch (err) {
    // 3. Offline Fallback: Return stale cache if available
    console.warn('Network failed, checking stale cache...', err);
    if (cached) {
      console.log('Serving from cache (stale/offline):', url);
      return cached.data;
    }
    throw err; // No cache + No network = Error
  }
}

async function loadCurrencies() {
  try {
    const data = await fetchWithCache(`${API_URL}/currencies`);
    state.currencies = data;
    
    // Populate Dropdowns
    const options = Object.entries(data).map(([code, name]) => 
      `<option value="${code}">${code} - ${name}</option>`
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
  if (state.amount === 0) {
    els.result.value = '0.00';
    return;
  }

  if (state.from === state.to) {
    els.result.value = state.amount;
    els.rate.textContent = '1.0000';
    return;
  }

  try {
    // Fetch rate for 1 unit
    const data = await fetchWithCache(`${API_URL}/latest?from=${state.from}&to=${state.to}`);
    const rate = data.rates[state.to];
    
    // Calculate Result Locally
    const result = rate * state.amount;
    els.result.value = result.toLocaleString(undefined, { maximumFractionDigits: 2 });
    
    // Update Rate Label
    els.rate.textContent = rate.toFixed(4);
    
    els.lblFrom.textContent = state.from;
    els.lblTo.textContent = state.to;
  } catch (err) {
    console.error('Failed to fetch rate', err);
  }
}

async function loadPopularRates() {
  const popular = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'SGD', 'NZD'];
  const targets = popular.filter(c => c !== state.from).join(',');
  
  try {
    const data = await fetchWithCache(`${API_URL}/latest?from=${state.from}&to=${targets}`);
    renderSlider(data.rates);
  } catch (err) {
    console.error('Failed to load popular rates', err);
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

function updateChartTheme(theme) {
  if (!chartInstance) return;
  const isLight = theme === 'light';
  const color = isLight ? '#64748b' : '#94a3b8';
  const grid = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
  
  chartInstance.options.scales.y.ticks.color = color;
  chartInstance.options.scales.y.grid.color = grid;
  chartInstance.update();
}

// ==========================================
// Theme Logic
// ==========================================

function initTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', theme);
  updateThemeIcons(theme);
  setTimeout(() => updateChartTheme(theme), 100);
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcons(next);
  updateChartTheme(next);
}

function updateThemeIcons(theme) {
  const sun = els.themeToggle.querySelector('.sun-icon');
  const moon = els.themeToggle.querySelector('.moon-icon');
  if (theme === 'light') {
    sun.style.display = 'none';
    moon.style.display = 'block';
  } else {
    sun.style.display = 'block';
    moon.style.display = 'none';
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
