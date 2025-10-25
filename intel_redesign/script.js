// Pandora Intel - AI Trading Platform
// Main JavaScript functionality for the moonshot callers interface

// Global state
let currentSignals = [];
let filteredSignals = [];
let activeFilter = 'all';
let isConnected = false;
let marketData = null;
let statsData = null;
let topPerformersList = [];
let fundamentals = null;
let intelligence = null;

// Trading signal data structure
const tradingSignals = [
  {
    id: 1,
    symbol: 'BTC/USDT',
    type: 'futures',
    action: 'LONG',
    entryPrice: 43250,
    targets: [44100, 45200],
    stopLoss: 42800,
    confidence: 98,
    timestamp: Date.now() - 120000, // 2 minutes ago
    profit: 0,
    status: 'active'
  },
  {
    id: 2,
    symbol: 'ETH/USDT',
    type: 'spot',
    action: 'BUY',
    entryPrice: 2650,
    targets: [2850, 3100],
    stopLoss: 2450,
    confidence: 89,
    timestamp: Date.now() - 300000, // 5 minutes ago
    profit: 0,
    status: 'active'
  },
  {
    id: 3,
    symbol: 'PEPE/USDT',
    type: 'degen',
    action: 'YOLO',
    entryPrice: 0.000012,
    targets: [0.000015, 0.000018],
    stopLoss: 0.000010,
    confidence: 76,
    timestamp: Date.now() - 480000, // 8 minutes ago
    profit: 0,
    status: 'active'
  },
  {
    id: 4,
    symbol: 'SOL/USDT',
    type: 'spot',
    action: 'BUY',
    entryPrice: 98.5,
    targets: [105, 115],
    stopLoss: 92,
    confidence: 91,
    timestamp: Date.now() - 600000, // 10 minutes ago
    profit: 0,
    status: 'active'
  },
  {
    id: 5,
    symbol: 'DOT/USDT',
    type: 'hodl',
    action: 'HODL',
    entryPrice: 6.8,
    targets: [8.5, 12],
    stopLoss: 5.5,
    confidence: 85,
    timestamp: Date.now() - 900000, // 15 minutes ago
    profit: 0,
    status: 'active'
  }
];

// Top performers data
const topPerformers = [
  { symbol: 'BTC', type: 'Futures', profit: 247, time: '2h 15m' },
  { symbol: 'SOL', type: 'Spot', profit: 189, time: '1d 3h' },
  { symbol: 'PEPE', type: 'Degen', profit: 1247, time: '3h 42m' },
  { symbol: 'DOT', type: 'Hodl', profit: 156, time: '2w 1d' }
];

// Market data
const marketData = {
  totalMarketCap: 1800000000000,
  volume24h: 45200000000,
  fearGreed: 68,
  activeSignals: 1247
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  startRealTimeUpdates();
  fetchAndRenderHeroStats();
  fetchAndRenderLiveSignals();
  fetchAndRenderMarketOverview();
  fetchAndRenderTopPerformers();
});

// Live data fetching functions
async function fetchAndRenderHeroStats() {
  try {
    const response = await fetch('/api/portfolio-performance');
    if (!response.ok) throw new Error('Failed to fetch portfolio performance');
    const data = await response.json();
    
    // Update hero stats
    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
      heroStats.innerHTML = `
        <div class="stat">
          <span class="stat-value">${data.winRate}%</span>
          <span class="stat-label">Success Rate</span>
        </div>
        <div class="stat">
          <span class="stat-value">$${formatNumber(data.totalProfit)}</span>
          <span class="stat-label">Profits Generated</span>
        </div>
        <div class="stat">
          <span class="stat-value">${data.totalTrades}</span>
          <span class="stat-label">Active Signals</span>
        </div>
      `;
      }
    } catch (error) {
    console.error('Error fetching hero stats:', error);
  }
}

async function fetchAndRenderLiveSignals() {
  try {
    const response = await fetch('/api/trading-signals');
    if (!response.ok) throw new Error('Failed to fetch trading signals');
    const signals = await response.json();
    
    // Update signals display
    const signalsContainer = document.querySelector('.signals-grid');
    if (signalsContainer) {
      signalsContainer.innerHTML = signals.map(signal => createSignalCard(signal)).join('');
    }
  } catch (error) {
    console.error('Error fetching trading signals:', error);
  }
}

async function fetchAndRenderMarketOverview() {
  try {
    const response = await fetch('/api/market-overview');
    if (!response.ok) throw new Error('Failed to fetch market overview');
    const data = await response.json();
    
    // Update market overview
    console.log('Market overview data:', data);
  } catch (error) {
    console.error('Error fetching market overview:', error);
  }
}

async function fetchAndRenderTopPerformers() {
  try {
    const response = await fetch('/api/analytics');
    if (!response.ok) throw new Error('Failed to fetch analytics');
    const data = await response.json();
    
    // Update top performers
    console.log('Analytics data:', data);
  } catch (error) {
    console.error('Error fetching analytics:', error);
  }
}

function createSignalCard(signal) {
  return `
    <div class="signal-card" data-type="${signal.type}">
      <div class="signal-header">
        <div class="signal-symbol">${signal.symbol}</div>
        <div class="signal-type ${signal.type}">${signal.type}</div>
      </div>
      <div class="signal-action ${signal.action.toLowerCase()}">${signal.action}</div>
      <div class="signal-details">
        <div class="signal-detail">
          <div class="signal-detail-label">Entry Price</div>
          <div class="signal-detail-value">$${formatNumber(signal.entryPrice)}</div>
        </div>
        <div class="signal-detail">
          <div class="signal-detail-label">Target</div>
          <div class="signal-detail-value">$${formatNumber(signal.targets?.[0])}</div>
        </div>
        <div class="signal-detail">
          <div class="signal-detail-label">Stop Loss</div>
          <div class="signal-detail-value">$${formatNumber(signal.stopLoss)}</div>
        </div>
        <div class="signal-detail">
          <div class="signal-detail-label">Time</div>
          <div class="signal-detail-value">${formatTime(signal.timestamp)}</div>
        </div>
      </div>
      <div class="signal-confidence">
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${signal.confidence}%"></div>
        </div>
        <div class="confidence-value">${signal.confidence}%</div>
      </div>
    </div>
  `;
}

function formatNumber(num) {
  if (typeof num !== 'number') return '--';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --- LIVE DATA INITIALIZATION SECTION ---
// Remove all previous static demo data and replace with runtime populated state:

const heroStatsDefaults = [
  { label: 'Success Rate', value: '...' },
  { label: 'Profits Generated', value: '...' },
  { label: 'Active Signals', value: '...' }
];

// --- DASHBOARD DATA FETCHING ---
async function fetchPortfolioPerformance() {
  try {
    showHeroLoading();
    const res = await fetch('/api/portfolio-performance');
    if (!res.ok) throw new Error('Failed to load portfolio stats');
    const data = await res.json();
    statsData = data;
    topPerformers = Array.isArray(data.topPerformers) ? data.topPerformers : [];
    renderHeroStats();
    renderTopPerformers();
  } catch (err) {
    handleError(err, 'fetchPortfolioPerformance');
    showHeroError();
  }
}

async function fetchSignals() {
  try {
    showSignalsLoading();
    const res = await fetch('/api/trading-signals');
    if (!res.ok) throw new Error('Failed to load AI signals');
    currentSignals = await res.json();
    filteredSignals = [...currentSignals];
    renderTradingCards();
    renderLiveSignals();
  } catch (err) {
    handleError(err, 'fetchSignals');
    showSignalsError();
  }
}

async function fetchMarketOverview() {
  try {
    showMarketLoading();
    const res = await fetch('/api/fundamentals');
    if (!res.ok) throw new Error('Failed to load fundamentals');
    fundamentals = await res.json();
    renderMarketOverview();
  } catch (err) {
    handleError(err, 'fetchMarketOverview');
    showMarketError();
  }
}

async function fetchAnalytics() {
  try {
    showAnalyticsLoading();
    const res = await fetch('/api/market-intelligence');
    if (!res.ok) throw new Error('Failed to load analytics');
    intelligence = await res.json();
    renderAnalytics();
  } catch (err) {
    handleError(err, 'fetchAnalytics');
    showAnalyticsError();
  }
}

// ---- LOADING AND ERROR STATES ----
function showHeroLoading() {
  document.querySelectorAll('.hero .stat-value').forEach(e => e.textContent = '...');
}
function showHeroError() {
  document.querySelectorAll('.hero .stat-value').forEach(e => e.textContent = 'N/A');
}
function showSignalsLoading() {
  const c = document.querySelector('.signals-container');
  if (c) c.innerHTML = '<div class="loading">Loading signals…</div>';
}
function showSignalsError() {
  const c = document.querySelector('.signals-container');
  if (c) c.innerHTML = '<div class="error">Could not load AI signals.</div>';
}
function showMarketLoading() {
  const c = document.querySelector('.market-stats');
  if (c) c.innerHTML = '<div class="loading">Loading market data…</div>';
}
function showMarketError() {
  const c = document.querySelector('.market-stats');
  if (c) c.innerHTML = '<div class="error">Could not load market overview.</div>';
}
function showAnalyticsLoading() {
  // Implement if you show analytics section
}
function showAnalyticsError() {
  // Implement if you show analytics section
}

// ---- LIVE DATA RENDERERS ----
function renderHeroStats() {
  const heroStats = document.querySelectorAll('.hero .stat-value');
  if (!statsData || !heroStats.length) return;
  heroStats[0].textContent = statsData.winRate ? `${statsData.winRate.toFixed(1)}%` : 'N/A';
  heroStats[1].textContent = statsData.totalProfit ? `$${statsData.totalProfit.toLocaleString()}` : 'N/A';
  heroStats[2].textContent = statsData.totalTrades ? statsData.totalTrades.toLocaleString() : 'N/A';
}
function renderTopPerformers() {
  const performersGrid = document.querySelector('.performers-grid');
  if (!performersGrid) return;
  if (!topPerformers || !topPerformers.length) {
    performersGrid.innerHTML = '<div class="loading">No data</div>';
    return;
  }
  performersGrid.innerHTML = topPerformers.map(performer => `
    <div class="performer-card">
      <div class="performer-header">
        <span class="performer-symbol">${performer.symbol}</span>
        <span class="performer-type">${performer.type}</span>
      </div>
      <div class="performer-stats">
        <span class="performer-profit">+${performer.profit}%</span>
        <span class="performer-time">${performer.time || ''}</span>
      </div>
    </div>`).join('');
}
function renderMarketOverview() {
  const marketStats = document.querySelector('.market-stats');
  if (!fundamentals || !marketStats) return;
  marketStats.innerHTML = Object.values(fundamentals).map(x => `
    <div class="market-stat">
      <span class="stat-label">${x.label}</span>
      <span class="stat-value">${x.value !== null ? x.value : 'N/A'}</span>
      <span class="stat-change"></span>
    </div>`).join('');
}
function renderAnalytics() {
  // OPTIONAL: render analytics metrics if you have an analytics section
  // Example: for (const metric of Object.values(intelligence)) ...
}

// Override initializeApp to load live data
function initializeApp() {
  fetchPortfolioPerformance();
  fetchSignals();
  fetchMarketOverview();
  fetchAnalytics();
}

// Setup event listeners
function setupEventListeners() {
  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      filterSignals(type);
      updateFilterButtons(e.target);
    });
  });

  // Trading card actions
  const tradingCards = document.querySelectorAll('.trading-card');
  tradingCards.forEach(card => {
    const actionBtn = card.querySelector('.card-action');
    actionBtn.addEventListener('click', () => {
      const cardType = card.classList.contains('futures') ? 'futures' :
                      card.classList.contains('spot') ? 'spot' :
                      card.classList.contains('hodl') ? 'hodl' : 'degen';
      openTradingInterface(cardType);
    });
  });

  // Signal action buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('signal-action-btn')) {
      const signalCard = e.target.closest('.signal-card');
      const signalId = parseInt(signalCard.dataset.id);
      executeTrade(signalId);
    }
  });

  // Wallet connection
  const connectBtn = document.querySelector('.btn-secondary');
  if (connectBtn) {
    connectBtn.addEventListener('click', connectWallet);
  }

  // Pro upgrade
  const upgradeBtn = document.querySelector('.btn-primary');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', upgradeToPro);
  }
}

// Filter signals by type
function filterSignals(type) {
  activeFilter = type;
  if (type === 'all') {
    filteredSignals = [...currentSignals];
  } else {
    filteredSignals = currentSignals.filter(signal => signal.type === type);
  }
  renderLiveSignals();
}

// Update filter buttons
function updateFilterButtons(activeBtn) {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');
}

// Render trading cards
function renderTradingCards() {
  const tradingGrid = document.querySelector('.trading-grid');
  if (!tradingGrid) return;

  const cardTypes = ['futures', 'spot', 'hodl', 'degen'];
  const cardData = {
    futures: {
      icon: '⚡',
      title: 'QUICK Futures',
      badge: 'High Frequency',
      description: 'Ultra-fast trading signals for short-term futures positions',
      avgHoldTime: '15 min',
      successRate: '96.8%'
    },
    spot: {
      icon: '💎',
      title: 'Spot Trades',
      badge: 'Medium Term',
      description: 'Strategic spot trading with AI-optimized entry and exit points',
      avgHoldTime: '2-7 days',
      successRate: '92.4%'
    },
    hodl: {
      icon: '🏛️',
      title: 'Hodl Trades',
      badge: 'Long Term',
      description: 'Long-term investment opportunities with fundamental analysis',
      avgHoldTime: '3-12 months',
      successRate: '88.7%'
    },
    degen: {
      icon: '🎯',
      title: 'Degen Trades',
      badge: 'High Risk',
      description: 'High-risk, high-reward opportunities for experienced traders',
      avgHoldTime: '1-24 hours',
      successRate: '78.3%'
    }
  };

  cardTypes.forEach(type => {
    const card = tradingGrid.querySelector(`.${type}`);
    if (card) {
      const data = cardData[type];
      const signals = currentSignals.filter(s => s.type === type).slice(0, 2);
      
      // Update signal preview
      const signalPreview = card.querySelector('.signal-preview');
      if (signalPreview && signals.length > 0) {
        signalPreview.innerHTML = signals.map(signal => `
          <div class="signal-item">
            <span class="signal-symbol">${signal.symbol.split('/')[0]}</span>
            <span class="signal-action ${signal.action.toLowerCase()}">${signal.action}</span>
            <span class="signal-confidence">${signal.confidence}%</span>
          </div>
        `).join('');
      }
    }
  });
}

// Render live signals
function renderLiveSignals() {
  const signalsContainer = document.querySelector('.signals-container');
  if (!signalsContainer) return;

  signalsContainer.innerHTML = filteredSignals.map(signal => `
    <div class="signal-card" data-type="${signal.type}" data-id="${signal.id}">
      <div class="signal-header">
        <div class="signal-info">
          <span class="signal-symbol">${signal.symbol}</span>
          <span class="signal-type">${signal.type.charAt(0).toUpperCase() + signal.type.slice(1)}</span>
        </div>
        <div class="signal-confidence">
          <span class="confidence-value">${signal.confidence}%</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${signal.confidence}%"></div>
          </div>
        </div>
      </div>
      <div class="signal-details">
        <div class="signal-action ${signal.action.toLowerCase()}">${signal.action}</div>
        <div class="signal-price">Entry: $${formatPrice(signal.entryPrice)}</div>
        <div class="signal-targets">
          <span>TP1: $${formatPrice(signal.targets[0])}</span>
          <span>TP2: $${formatPrice(signal.targets[1])}</span>
          <span>SL: $${formatPrice(signal.stopLoss)}</span>
        </div>
      </div>
      <div class="signal-footer">
        <span class="signal-time">${formatTimeAgo(signal.timestamp)}</span>
        <button class="signal-action-btn">Execute Trade</button>
      </div>
    </div>
  `).join('');
}

// Render top performers
function renderTopPerformers() {
  const performersGrid = document.querySelector('.performers-grid');
  if (!performersGrid) return;

  performersGrid.innerHTML = topPerformers.map(performer => `
    <div class="performer-card">
      <div class="performer-header">
        <span class="performer-symbol">${performer.symbol}</span>
        <span class="performer-type">${performer.type}</span>
      </div>
      <div class="performer-stats">
        <span class="performer-profit">+${performer.profit}%</span>
        <span class="performer-time">${performer.time}</span>
      </div>
    </div>
  `).join('');
}

// Render market overview
function renderMarketOverview() {
  const marketStats = document.querySelector('.market-stats');
  if (!marketStats) return;

  marketStats.innerHTML = `
    <div class="market-stat">
      <span class="stat-label">Total Market Cap</span>
      <span class="stat-value">$${formatNumber(marketData.totalMarketCap)}</span>
      <span class="stat-change positive">+2.4%</span>
    </div>
    <div class="market-stat">
      <span class="stat-label">24h Volume</span>
      <span class="stat-value">$${formatNumber(marketData.volume24h)}</span>
      <span class="stat-change positive">+12.8%</span>
    </div>
    <div class="market-stat">
      <span class="stat-label">Fear & Greed</span>
      <span class="stat-value">${marketData.fearGreed}</span>
      <span class="stat-change positive">Greed</span>
    </div>
    <div class="market-stat">
      <span class="stat-label">Active Signals</span>
      <span class="stat-value">${marketData.activeSignals}</span>
      <span class="stat-change positive">+23</span>
    </div>
  `;
}

// Update hero stats
function updateHeroStats() {
  const heroStats = document.querySelectorAll('.hero .stat-value');
  if (heroStats.length >= 3) {
    heroStats[0].textContent = '94.2%';
    heroStats[1].textContent = '$2.4M';
    heroStats[2].textContent = '1,247';
  }
}

// Open trading interface
function openTradingInterface(type) {
  // Simulate opening trading interface
  showNotification(`Opening ${type} trading interface...`, 'info');
  
  // In a real application, this would open a modal or navigate to a trading page
  setTimeout(() => {
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} interface loaded successfully!`, 'success');
  }, 1000);
}

// Execute trade
function executeTrade(signalId) {
  const signal = currentSignals.find(s => s.id === signalId);
  if (!signal) return;

  // Simulate trade execution
  showNotification(`Executing ${signal.action} trade for ${signal.symbol}...`, 'info');
  
  setTimeout(() => {
    showNotification(`Trade executed successfully! Entry: $${formatPrice(signal.entryPrice)}`, 'success');
    
    // Update signal status
    signal.status = 'executed';
    signal.executedAt = Date.now();
    
    // Refresh the display
    renderLiveSignals();
  }, 1500);
}

// Connect wallet
function connectWallet() {
  showNotification('Connecting wallet...', 'info');
  
  setTimeout(() => {
    isConnected = true;
    const connectBtn = document.querySelector('.btn-secondary');
    if (connectBtn) {
      connectBtn.textContent = 'Wallet Connected';
      connectBtn.style.background = 'rgba(34, 197, 94, 0.2)';
      connectBtn.style.borderColor = '#22c55e';
    }
    showNotification('Wallet connected successfully!', 'success');
  }, 2000);
}

// Upgrade to Pro
function upgradeToPro() {
  showNotification('Redirecting to Pro upgrade...', 'info');
  
  setTimeout(() => {
    showNotification('Pro features unlocked! Enjoy advanced AI signals and analytics.', 'success');
  }, 1500);
}

// Start real-time updates
function startRealTimeUpdates() {
  // Update prices every 30 seconds
  setInterval(() => {
    updateSignalPrices();
    updateMarketData();
  }, 30000);

  // Add new signals periodically
  setInterval(() => {
    addNewSignal();
  }, 120000); // Every 2 minutes
}

// Update signal prices
function updateSignalPrices() {
  currentSignals.forEach(signal => {
    if (signal.status === 'active') {
      // Simulate price movement
      const priceChange = (Math.random() - 0.5) * 0.02; // ±1% change
      signal.entryPrice *= (1 + priceChange);
      
      // Update targets and stop loss proportionally
      signal.targets = signal.targets.map(target => target * (1 + priceChange));
      signal.stopLoss *= (1 + priceChange);
      
      // Calculate profit
      const currentPrice = signal.entryPrice * (1 + priceChange);
      signal.profit = ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100;
    }
  });
  
  // Re-render if current filter is active
  if (activeFilter === 'all' || filteredSignals.some(s => s.status === 'active')) {
    renderLiveSignals();
  }
}

// Update market data
function updateMarketData() {
  // Simulate market data changes
  marketData.totalMarketCap *= (1 + (Math.random() - 0.5) * 0.01);
  marketData.volume24h *= (1 + (Math.random() - 0.5) * 0.05);
  marketData.fearGreed = Math.max(0, Math.min(100, marketData.fearGreed + (Math.random() - 0.5) * 5));
  marketData.activeSignals += Math.floor((Math.random() - 0.5) * 10);
  
  renderMarketOverview();
}

// Add new signal
function addNewSignal() {
  const symbols = ['ADA/USDT', 'LINK/USDT', 'MATIC/USDT', 'AVAX/USDT', 'ATOM/USDT'];
  const types = ['futures', 'spot', 'hodl', 'degen'];
  const actions = ['LONG', 'SHORT', 'BUY', 'SELL', 'HODL', 'YOLO'];
  
  const newSignal = {
    id: Date.now(),
    symbol: symbols[Math.floor(Math.random() * symbols.length)],
    type: types[Math.floor(Math.random() * types.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    entryPrice: Math.random() * 1000 + 1,
    targets: [Math.random() * 1000 + 100, Math.random() * 1000 + 200],
    stopLoss: Math.random() * 1000 + 50,
    confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
    timestamp: Date.now(),
    profit: 0,
    status: 'active'
  };
  
  currentSignals.unshift(newSignal);
  
  // Keep only last 20 signals
  if (currentSignals.length > 20) {
    currentSignals = currentSignals.slice(0, 20);
  }
  
  // Update filtered signals
  filterSignals(activeFilter);
  
  // Show notification
  showNotification(`New ${newSignal.type} signal: ${newSignal.symbol} ${newSignal.action}`, 'info');
}

// Utility functions
function formatPrice(price) {
  if (price < 0.01) {
    return price.toFixed(8);
  } else if (price < 1) {
    return price.toFixed(4);
  } else if (price < 100) {
    return price.toFixed(2);
    } else {
    return price.toFixed(0);
  }
}

function formatNumber(num) {
  if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toFixed(0);
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Notification system
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 
                 type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                 'rgba(59, 130, 246, 0.9)'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 400px;
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Close button
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    removeNotification(notification);
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    removeNotification(notification);
  }, 5000);
}

function removeNotification(notification) {
  notification.style.transform = 'translateX(100%)';
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add loading states
function showLoading(element) {
  element.innerHTML = '<div class="loading">Loading...</div>';
}

function hideLoading(element, content) {
  element.innerHTML = content;
}

// Error handling
function handleError(error, context) {
  console.error(`Error in ${context}:`, error);
  showNotification(`Error: ${error.message}`, 'error');
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatPrice,
    formatNumber,
    formatTimeAgo,
    showNotification
  };
}