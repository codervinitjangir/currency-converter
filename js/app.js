// ==========================================
// FluxCurrency - Main Application
// ==========================================

// Data import removed
import * as DB from './db.js';
import * as API from './api.js';
import * as UI from './ui.js';

// State
const state = {
  amount: 0,
  from: 'USD',
  to: 'INR',
  currencies: {},
  historyDays: 90
};

let debounceTimer = null;
const els = UI.getElements();

// Global Exports for HTML onclick handlers
window.exportData = DB.exportData;
window.importData = DB.importData;
window.openModal = UI.openModal;
window.closeModal = UI.closeModal;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  UI.setTheme(localStorage.getItem('theme') || 'dark');
  UI.initChart();
  loadCurrencies();
  setupEventListeners();

  registerServiceWorker();
  
  // Network Listeners
  window.addEventListener('online', UI.updateNetworkStatus);
  window.addEventListener('offline', UI.updateNetworkStatus);
  if (!navigator.onLine) UI.updateNetworkStatus();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .catch(err => console.error('SW Registration Failed:', err));
  }
}

// PWA Install Logic
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    deferredPrompt = null;
    installBtn.style.display = 'none';
  }
});

window.addEventListener('appinstalled', () => {
  installBtn.style.display = 'none';
  deferredPrompt = null;
});

// Logic
function setupEventListeners() {
  // Amount
  els.amount.addEventListener('input', (e) => {
    if (e.target.value.length > 20) {
      e.target.value = e.target.value.slice(0, 20);
    }
    const val = parseFloat(e.target.value);
    state.amount = isNaN(val) ? 0 : val;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateExchangeRate, 400);
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

  // Swap
  els.swap.addEventListener('click', () => {
    [state.from, state.to] = [state.to, state.from];
    els.from.value = state.from;
    els.to.value = state.to;
    
    // Icon Animation
    const icon = els.swap.querySelector('svg');
    icon.style.transform = 'rotate(180deg)';
    setTimeout(() => icon.style.transform = 'rotate(0deg)', 300);
    
    handleCurrencyChange();
  });

  // Filters
  els.filters.forEach(btn => {
    btn.addEventListener('click', () => {
      els.filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.historyDays = parseInt(btn.dataset.days);
      loadHistory();
    });
  });

  // Theme
  els.themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    UI.setTheme(isDark ? 'light' : 'dark');
  });
}

function handleCurrencyChange() {
  UI.updateFlags(state.from, state.to);
  updateExchangeRate();
  loadHistory();
}

function loadCurrencies() {
  try {
    const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });
    const codes = Object.keys(UI.currencyToCountry).sort();
    
    state.currencies = {};
    codes.forEach(code => {
      try {
        state.currencies[code] = currencyNames.of(code);
      } catch {
        state.currencies[code] = code;
      }
    });

    const options = codes.map(code => 
      `<option value="${code}">${code} - ${state.currencies[code]}</option>`
    ).join('');
    
    els.from.innerHTML = options;
    els.to.innerHTML = options;
    
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

  // Show loading on result input and slider
  els.result.value = 'Calculating...';
  UI.showLoading('slider-track');

  try {
    const data = await API.fetchLatestRates(state.from);
    
    // Validate we got rates
    if (!data || !data.rates) throw new Error('Invalid rate data received');

    const rate = data.rates[state.to];
    if (rate) {
      els.rate.textContent = rate.toFixed(4);
      if (state.amount === 0) {
        els.result.value = '0.00';
      } else {
        const result = rate * state.amount;
        els.result.value = result.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
    } else {
      UI.showToast(`Rate for ${state.to} not found`, 'error');
      els.result.value = '---';
    }

    UI.renderSlider(data.rates, state.currencies);

  } catch (err) {
    console.error('Failed to fetch rates', err);
    UI.showToast('Failed to update rates. Check connection.', 'error');
    els.result.value = 'Error';
  } finally {
    UI.hideLoading('slider-track');
  }
}

async function loadHistory() {
  if (state.from === state.to) return;
  
  const chartCard = document.querySelector('.chart-card');
  UI.showLoading(chartCard.id || 'markets'); // Fallback/use section id

  try {
    const data = await API.fetchHistoryData(state.from, state.to, state.historyDays);
    
    if (!data || !data.rates) throw new Error('Invalid history data');

    const labels = Object.keys(data.rates);
    const values = labels.map(date => data.rates[date][state.to]);
    
    UI.updateChart(labels, values);
  } catch (err) {
    console.error('Failed to load history', err);
    UI.showToast('Could not load market history', 'warning');
  } finally {
    UI.hideLoading('markets');
  }
}
