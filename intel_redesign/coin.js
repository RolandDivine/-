// intel_redesign/coin.js

/**
 * Helper to parse query parameters from the current URL.
 * @returns {Object.<string, string>} Map of query params
 */
function getQueryParams() {
  const params = {};
  const queryString = window.location.search.substring(1);
  if (!queryString) return params;
  queryString.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return params;
}

/**
 * Format a number as a currency string.
 * @param {number} num
 * @returns {string}
 */
function formatCurrency(num) {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number into a shortened human-readable string (K, M, B, T).
 * @param {number} num
 * @returns {string}
 */
function formatNumberShort(num) {
  if (num === null || num === undefined) return '-';
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

/**
 * Attempt to fetch JSON from the given URL. Attempts several proxy options
 * if the direct request fails. This function mirrors the implementation
 * in script.js so that both the index page and coin detail page use
 * consistent error handling and proxy fallbacks. A list of proxy
 * prefixes is attempted in order, stopping at the first successful
 * response. See script.js for detailed documentation.
 * @param {string} url Absolute URL to fetch
 * @returns {Promise<any>} Parsed JSON response
 */
async function fetchJsonWithCorsFallback(url) {
  const proxies = [
    null,
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/',
    'https://yacdn.org/proxy/',
    'https://cors.isomorphic-git.org/'
  ];
  let lastError;
  for (const proxy of proxies) {
    let fetchUrl;
    try {
      if (!proxy) {
        fetchUrl = url;
      } else {
        if (proxy.endsWith('?')) {
          fetchUrl = proxy + encodeURIComponent(url);
        } else {
          fetchUrl = proxy + url;
        }
      }
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        lastError = new Error(
          `Fetch via ${proxy || 'direct'} failed with status ${res.status}`
        );
        continue;
      }
      try {
        const json = await res.json();
        return json;
      } catch (e) {
        lastError = new Error(
          `Invalid JSON from ${proxy || 'direct'} proxy: ${e.message}`
        );
        continue;
      }
    } catch (error) {
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error('Failed to fetch JSON from any proxy');
}

/**
 * Fetch detailed coin data from CoinGecko.
 * @param {string} id Coin identifier
 */
async function fetchCoinDetails(id) {
  // Fetch details from our backend API, which also includes a buy_signal flag.
  const url = `/api/coins/${encodeURIComponent(id)}`;
  return await fetchJsonWithCorsFallback(url);
}

/**
 * Fetch market chart data (historical prices) for the given coin.
 * @param {string} id Coin identifier
 * @param {number} days Number of days for the chart (e.g., 30)
 */
async function fetchMarketChart(id, days = 30) {
  // Fetch market chart from our backend API.
  const url = `/api/coins/${encodeURIComponent(id)}/chart?days=${days}`;
  return await fetchJsonWithCorsFallback(url);
}

/**
 * Render the coin information section.
 * @param {Object} data Coin data returned from CoinGecko
 */
function renderCoinInfo(data) {
  const container = document.getElementById('coinDetails');
  container.innerHTML = '';
  const infoDiv = document.createElement('div');
  infoDiv.className = 'coin-info';
  // Top row: logo, name, symbol
  const headerDiv = document.createElement('div');
  headerDiv.className = 'coin-header';
  const img = document.createElement('img');
  img.src = data.image?.large || data.image?.small || data.image?.thumb;
  img.alt = data.name;
  img.className = 'coin-logo-large';
  headerDiv.appendChild(img);
  const nameDiv = document.createElement('div');
  nameDiv.className = 'coin-header-text';
  const h2 = document.createElement('h2');
  h2.textContent = data.name;
  nameDiv.appendChild(h2);
  const symbolSpan = document.createElement('span');
  symbolSpan.className = 'coin-symbol-large';
  symbolSpan.textContent = data.symbol.toUpperCase();
  nameDiv.appendChild(symbolSpan);
  headerDiv.appendChild(nameDiv);
  infoDiv.appendChild(headerDiv);
  // Stats grid
  const statsDiv = document.createElement('div');
  statsDiv.className = 'coin-stats';
  const marketData = data.market_data;
  // Price
  statsDiv.appendChild(createStatItem('Price', formatCurrency(marketData?.current_price?.usd)));
  // 24h Change
  const change24 = marketData?.price_change_percentage_24h;
  const change24Item = createStatItem(
    '24h Change',
    change24 !== undefined && change24 !== null ? `${change24.toFixed(2)}%` : '-'
  );
  // Apply positive/negative color if available
  if (typeof change24 === 'number') {
    const valEl = change24Item.querySelector('.stat-value');
    valEl.classList.add(change24 >= 0 ? 'positive' : 'negative');
  }
  statsDiv.appendChild(change24Item);
  // 7d Change
  const change7 = marketData?.price_change_percentage_7d;
  const change7Item = createStatItem(
    '7d Change',
    change7 !== undefined && change7 !== null ? `${change7.toFixed(2)}%` : '-'
  );
  if (typeof change7 === 'number') {
    const valEl = change7Item.querySelector('.stat-value');
    valEl.classList.add(change7 >= 0 ? 'positive' : 'negative');
  }
  statsDiv.appendChild(change7Item);
  // Market Cap
  statsDiv.appendChild(createStatItem('Market Cap', formatNumberShort(marketData?.market_cap?.usd)));
  // 24h Volume
  statsDiv.appendChild(createStatItem('24h Volume', formatNumberShort(marketData?.total_volume?.usd)));
  // Circulating Supply
  statsDiv.appendChild(createStatItem('Circulating Supply', formatNumberShort(marketData?.circulating_supply)));
  // Total Supply
  statsDiv.appendChild(createStatItem('Total Supply', formatNumberShort(marketData?.total_supply)));
  infoDiv.appendChild(statsDiv);
  // Description
  const descDiv = document.createElement('div');
  descDiv.className = 'coin-description';
  const desc = data.description?.en || data.description?.en_us || '';
  // Strip HTML tags and limit length
  const stripped = desc.replace(/<[^>]*>/g, '').trim();
  const truncated = stripped.split(/\s+/).slice(0, 60).join(' ') + (stripped.split(/\s+/).length > 60 ? '…' : '');
  descDiv.textContent = truncated;
  infoDiv.appendChild(descDiv);

  // If this coin is on the Binance Smart Chain (bnb chain), display a
  // prominent buy button. The backend adds a `buy_signal` boolean to
  // the coin details object, allowing us to conditionally render
  // this call‑to‑action. The button links to the provided swap URL.
  if (data.buy_signal) {
    const buyWrapper = document.createElement('div');
    buyWrapper.className = 'buy-section';
    const buyLink = document.createElement('a');
    buyLink.href = 'https://www.nq-swap.xyz/nq-swap';
    buyLink.target = '_blank';
    buyLink.rel = 'noopener noreferrer';
    buyLink.className = 'buy-button-big';
    buyLink.textContent = 'Buy on BNB Chain';
    buyWrapper.appendChild(buyLink);
    infoDiv.appendChild(buyWrapper);
  }
  container.appendChild(infoDiv);
}

/**
 * Create an element representing a single stat item.
 * @param {string} label
  * @param {string} value
 * @returns {HTMLElement}
 */
function createStatItem(label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stat-item';
  const lbl = document.createElement('div');
  lbl.className = 'stat-label';
  lbl.textContent = label;
  const val = document.createElement('div');
  val.className = 'stat-value';
  val.textContent = value;
  wrapper.appendChild(lbl);
  wrapper.appendChild(val);
  return wrapper;
}

/**
 * Render or update a line chart using Chart.js to display price history.
 * If a chart instance already exists, its data and labels are updated
 * instead of recreating it to preserve animations and performance.
 * @param {Array} prices Array of [timestamp, price] pairs
 */
let chartInstance = null;
function renderChart(prices) {
  const ctx = document.getElementById('priceChart').getContext('2d');
  // Convert timestamps to readable dates
  const labels = prices.map((p) => {
    const date = new Date(p[0]);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  const data = prices.map((p) => p[1]);
  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Price (USD)',
            data,
            borderColor: '#7052ff',
            backgroundColor: 'rgba(112, 82, 255, 0.15)',
            fill: true,
            tension: 0.25,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#c9cffb' },
            grid: { color: 'rgba(35, 39, 74, 0.5)' },
          },
          y: {
            ticks: { color: '#c9cffb' },
            grid: { color: 'rgba(35, 39, 74, 0.5)' },
          },
        },
        plugins: {
          legend: {
            labels: { color: '#c9cffb' },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const val = context.parsed.y;
                return ' $' + val.toFixed(2);
              },
            },
          },
        },
      },
    });
  }
}

// Refresh interval for coin details updates. Shorter interval (30s) for
// a more dynamic experience while respecting API rate limits.
const REFRESH_INTERVAL = 30000;
let refreshTimer = null;

/**
 * Fetch latest coin data and update the UI. Called on initial load and periodically.
 */
async function updateCoinData() {
  const params = getQueryParams();
  const id = params.id;
  if (!id) {
    document.getElementById('coinDetails').innerHTML = '<p class="error">No coin specified.</p>';
    return;
  }
  // Attempt to retrieve cached coin from localStorage to avoid network errors
  let cachedCoin = null;
  try {
    const stored = localStorage.getItem('selectedCoin');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id === id) {
        cachedCoin = parsed;
      }
    }
  } catch (e) {
    // ignore JSON errors silently
  }
  try {
    // Fetch details and chart concurrently. If either fails, we'll fall back
    // to cached coin data (if available). This call uses proxies if needed.
    const [details, chart] = await Promise.all([
      fetchCoinDetails(id),
      fetchMarketChart(id, 30),
    ]);
    renderCoinInfo(details);
    renderChart(chart.prices);
  } catch (err) {
    console.error(err);
    if (cachedCoin) {
      // Use cached data to display at least some information
      renderCoinInfo(cachedCoin);
      // If cached sparkline exists, build a simple [timestamp, price] array
      if (cachedCoin.sparkline_in_7d && Array.isArray(cachedCoin.sparkline_in_7d.price)) {
        const prices = cachedCoin.sparkline_in_7d.price;
        const now = Date.now();
        const interval = (7 * 24 * 60 * 60 * 1000) / prices.length;
        const pricePairs = prices.map((p, idx) => [now - (prices.length - idx - 1) * interval, p]);
        renderChart(pricePairs);
      } else {
        // If no sparkline, clear chart area or display message
        document.getElementById('priceChart').getContext('2d').clearRect(0, 0, 400, 300);
      }
    } else {
      document.getElementById('coinDetails').innerHTML = '<p class="error">Failed to load coin data.</p>';
    }
  }
}

/**
 * Initialize the coin page: load data and set up periodic refresh.
 */
function init() {
  // Show initial loading state
  document.getElementById('coinDetails').innerHTML = '<p class="loading">Loading...</p>';
  updateCoinData();
  // Set up auto refresh
  refreshTimer = setInterval(updateCoinData, REFRESH_INTERVAL);
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', init);