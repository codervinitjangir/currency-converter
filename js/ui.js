// ==========================================
// FluxCurrency - UI & Charts
// ==========================================

let chartInstance = null;

// ==========================================
// DOM Elements
// ==========================================
export const getElements = () => ({
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
});

// ==========================================
// Visual Updates
// ==========================================

export function updateFlags(fromCode, toCode) {
  const els = getElements();
  const getFlag = (code) => {
    const countryCode = currencyToCountry[code] || 'un'; 
    return `https://flagcdn.com/w40/${countryCode}.png`;
  };
  
  els.flagFrom.src = getFlag(fromCode);
  els.flagTo.src = getFlag(toCode);
}

export function renderSlider(rates, currencyNames) {
  const els = getElements();
  els.slider.innerHTML = '';
  
  const createItem = (code, rate) => {
    const name = currencyNames[code] || code;
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
  els.slider.innerHTML = itemsHtml + itemsHtml; 
}

export function updateNetworkStatus() {
  const badge = document.querySelector('.live-badge');
  if (!badge) return;
  
  if (navigator.onLine) {
    badge.innerHTML = '● Live Rates';
    badge.className = 'live-badge';
  } else {
    badge.innerHTML = '⚠ Offline Mode';
    badge.className = 'live-badge offline';
  }
}

// ==========================================
// Theme Logic
// ==========================================

export function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  const els = getElements();
  const isLight = theme === 'light';
  els.themeToggle.querySelector('.sun-icon').style.display = isLight ? 'none' : 'block';
  els.themeToggle.querySelector('.moon-icon').style.display = isLight ? 'block' : 'none';

  if (chartInstance) {
    const color = isLight ? '#64748b' : '#94a3b8';
    const grid = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    chartInstance.options.scales.y.ticks.color = color;
    chartInstance.options.scales.y.grid.color = grid;
    chartInstance.update();
  }
}

// ==========================================
// Modals
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

export function openModal(type) {
  const content = modalContent[type];
  if (!content) return;
  
  document.getElementById('modal-title').textContent = content.title;
  document.getElementById('modal-body').innerHTML = content.body;
  document.getElementById('info-modal').classList.remove('hidden');
}

export function closeModal() {
  document.getElementById('info-modal').classList.add('hidden');
}

// ==========================================
// Chart.js Logic
// ==========================================

export function initChart() {
  const els = getElements();
  if (!els.chart) return; 

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

export function updateChart(labels, data) {
  if (!chartInstance) return;
  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = data;
  chartInstance.update();
}

// ==========================================
// Data: Currency to Country Map
// ==========================================

export const currencyToCountry = {
  AUD: 'au', BGN: 'bg', BRL: 'br', CAD: 'ca', CHF: 'ch',
  CNY: 'cn', CZK: 'cz', DKK: 'dk', EUR: 'eu', GBP: 'gb',
  HKD: 'hk', HUF: 'hu', IDR: 'id', ILS: 'il', INR: 'in',
  ISK: 'is', JPY: 'jp', KRW: 'kr', MXN: 'mx', MYR: 'my',
  NOK: 'no', NZD: 'nz', PHP: 'ph', PLN: 'pl', RON: 'ro',
  SEK: 'se', SGD: 'sg', THB: 'th', TRY: 'tr', USD: 'us',
  ZAR: 'za'
};
