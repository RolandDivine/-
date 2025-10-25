// Enterprise Pandora Intel JavaScript
// Advanced AI Trading Platform Frontend

class PandoraIntel {
  constructor() {
    this.apiBase = 'http://localhost:3000/api';
    this.wsConnection = null;
    this.cache = new Map();
    this.refreshInterval = null;
    this.charts = new Map();
    
    this.init();
  }

  async init() {
    try {
      this.showLoading();
      await this.loadInitialData();
      this.setupWebSocket();
      this.setupEventListeners();
      this.startAutoRefresh();
      this.hideLoading();
      
      console.log('🚀 Pandora Intel Enterprise Platform Initialized');
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize platform');
    }
  }

  showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
  }

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  showError(message) {
    console.error(message);
    // You can implement a toast notification system here
  }

  async loadInitialData() {
    const promises = [
      this.fetchHeroStats(),
      this.fetchTradingSignals(),
      this.fetchMarketOverview(),
      this.fetchAIPerformance()
    ];

    await Promise.allSettled(promises);
  }

  async fetchHeroStats() {
    try {
      const response = await fetch(`${this.apiBase}/portfolio/performance`);
      if (!response.ok) throw new Error('Failed to fetch portfolio performance');
      
      const data = await response.json();
      this.updateHeroStats(data);
    } catch (error) {
      console.error('Error fetching hero stats:', error);
      this.updateHeroStats({
        winRate: '--',
        totalProfit: '--',
        activeSignals: '--',
        aiAccuracy: '--'
      });
    }
  }

  updateHeroStats(data) {
    const elements = {
      winRate: document.getElementById('winRate'),
      totalProfit: document.getElementById('totalProfit'),
      activeSignals: document.getElementById('activeSignals'),
      aiAccuracy: document.getElementById('aiAccuracy')
    };

    if (elements.winRate) elements.winRate.textContent = `${data.winRate || 0}%`;
    if (elements.totalProfit) elements.totalProfit.textContent = `$${this.formatNumber(data.totalProfit || 0)}`;
    if (elements.activeSignals) elements.activeSignals.textContent = data.totalTrades || 0;
    if (elements.aiAccuracy) elements.aiAccuracy.textContent = `${data.accuracy || 0}%`;
  }

  async fetchTradingSignals() {
    try {
      const response = await fetch(`${this.apiBase}/trading-signals`);
      if (!response.ok) throw new Error('Failed to fetch trading signals');
      
      const signals = await response.json();
      this.renderTradingSignals(signals);
    } catch (error) {
      console.error('Error fetching trading signals:', error);
      this.renderTradingSignals([]);
    }
  }

  renderTradingSignals(signals) {
    const container = document.getElementById('signalsGrid');
    if (!container) return;

    if (signals.length === 0) {
      container.innerHTML = '<div class="no-signals">No active signals available</div>';
      return;
    }

    container.innerHTML = signals.map(signal => this.createSignalCard(signal)).join('');
  }

  createSignalCard(signal) {
    const confidence = signal.confidence || 0;
    const actionClass = signal.action.toLowerCase();
    
    return `
      <div class="signal-card" data-type="${signal.type}">
        <div class="signal-header">
          <div class="signal-symbol">${signal.symbol}</div>
          <div class="signal-type ${signal.type}">${signal.type}</div>
        </div>
        
        <div class="signal-action ${actionClass}">${signal.action}</div>
        
        <div class="signal-details">
          <div class="signal-detail">
            <div class="signal-detail-label">Entry Price</div>
            <div class="signal-detail-value">$${this.formatNumber(signal.entryPrice)}</div>
          </div>
          <div class="signal-detail">
            <div class="signal-detail-label">Target</div>
            <div class="signal-detail-value">$${this.formatNumber(signal.targets?.[0])}</div>
          </div>
          <div class="signal-detail">
            <div class="signal-detail-label">Stop Loss</div>
            <div class="signal-detail-value">$${this.formatNumber(signal.stopLoss)}</div>
          </div>
          <div class="signal-detail">
            <div class="signal-detail-label">Time</div>
            <div class="signal-detail-value">${this.formatTime(signal.timestamp)}</div>
          </div>
        </div>
        
        <div class="signal-confidence">
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${confidence}%"></div>
          </div>
          <div class="confidence-value">${confidence}%</div>
        </div>
        
        <div class="signal-footer">
          <span>AI Generated</span>
          <button class="btn-trade" onclick="pandoraIntel.executeTrade('${signal.id}')">
            Execute Trade
          </button>
        </div>
      </div>
    `;
  }

  async fetchMarketOverview() {
    try {
      const response = await fetch(`${this.apiBase}/market/overview`);
      if (!response.ok) throw new Error('Failed to fetch market overview');
      
      const data = await response.json();
      this.updateMarketOverview(data);
    } catch (error) {
      console.error('Error fetching market overview:', error);
    }
  }

  updateMarketOverview(data) {
    const elements = {
      totalMarketCap: document.getElementById('totalMarketCap'),
      marketCapChange: document.getElementById('marketCapChange'),
      totalVolume: document.getElementById('totalVolume'),
      volumeChange: document.getElementById('volumeChange'),
      activeCryptos: document.getElementById('activeCryptos'),
      cryptoChange: document.getElementById('cryptoChange')
    };

    if (elements.totalMarketCap) {
      elements.totalMarketCap.textContent = this.formatCurrency(data.totalMarketCap);
    }
    if (elements.marketCapChange) {
      elements.marketCapChange.textContent = `+${data.marketCapChange24h || 0}%`;
    }
    if (elements.totalVolume) {
      elements.totalVolume.textContent = this.formatCurrency(data.totalVolume);
    }
    if (elements.volumeChange) {
      elements.volumeChange.textContent = `+${data.volumeChange24h || 0}%`;
    }
    if (elements.activeCryptos) {
      elements.activeCryptos.textContent = this.formatNumber(data.activeCryptocurrencies);
    }
  }

  async fetchAIPerformance() {
    try {
      const response = await fetch(`${this.apiBase}/ai/performance`);
      if (!response.ok) throw new Error('Failed to fetch AI performance');
      
      const data = await response.json();
      this.updateAIPerformance(data);
    } catch (error) {
      console.error('Error fetching AI performance:', error);
    }
  }

  updateAIPerformance(data) {
    const elements = {
      modelAccuracy: document.getElementById('modelAccuracy'),
      accuracyBar: document.getElementById('accuracyBar'),
      totalSignals: document.getElementById('totalSignals'),
      successfulSignals: document.getElementById('successfulSignals'),
      failedSignals: document.getElementById('failedSignals'),
      totalPnL: document.getElementById('totalPnL'),
      totalProfit: document.getElementById('totalProfit'),
      totalLoss: document.getElementById('totalLoss')
    };

    const accuracy = data.accuracy || 0;
    
    if (elements.modelAccuracy) elements.modelAccuracy.textContent = `${accuracy}%`;
    if (elements.accuracyBar) elements.accuracyBar.style.width = `${accuracy}%`;
    if (elements.totalSignals) elements.totalSignals.textContent = data.totalSignals || 0;
    if (elements.successfulSignals) elements.successfulSignals.textContent = data.successfulSignals || 0;
    if (elements.failedSignals) elements.failedSignals.textContent = (data.totalSignals || 0) - (data.successfulSignals || 0);
    if (elements.totalPnL) elements.totalPnL.textContent = this.formatCurrency(data.profitLoss || 0);
    if (elements.totalProfit) elements.totalProfit.textContent = this.formatCurrency(data.totalProfit || 0);
    if (elements.totalLoss) elements.totalLoss.textContent = this.formatCurrency(Math.abs(data.totalLoss || 0));
  }

  setupWebSocket() {
    // WebSocket implementation for real-time updates
    try {
      this.wsConnection = new WebSocket('ws://localhost:3000/ws');
      
      this.wsConnection.onopen = () => {
        console.log('WebSocket connected');
      };
      
      this.wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };
      
      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.setupWebSocket(), 5000);
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket setup failed:', error);
    }
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'signal_update':
        this.handleSignalUpdate(data.payload);
        break;
      case 'market_update':
        this.handleMarketUpdate(data.payload);
        break;
      case 'performance_update':
        this.handlePerformanceUpdate(data.payload);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  handleSignalUpdate(signal) {
    // Update signals in real-time
    this.fetchTradingSignals();
  }

  handleMarketUpdate(marketData) {
    // Update market data in real-time
    this.updateMarketOverview(marketData);
  }

  handlePerformanceUpdate(performanceData) {
    // Update performance metrics in real-time
    this.updateAIPerformance(performanceData);
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleNavigation(item);
      });
    });

    // Trading card clicks
    document.querySelectorAll('.trading-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const type = card.classList.contains('futures') ? 'futures' :
                    card.classList.contains('spot') ? 'spot' :
                    card.classList.contains('hodl') ? 'hodl' : 'degen';
        this.openTradingInterface(type);
      });
    });

    // Signal filter
    const filterSelect = document.getElementById('signalFilter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterSignals(e.target.value);
      });
    }
  }

  handleNavigation(item) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    // Add active class to clicked item
    item.classList.add('active');
    
    // Handle navigation logic
    const href = item.getAttribute('href');
    if (href && href.startsWith('#')) {
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  openTradingInterface(type) {
    const interfaces = {
      futures: 'futures.html',
      spot: 'spot.html',
      hodl: 'hodl.html',
      degen: 'degen.html'
    };
    
    const url = interfaces[type];
    if (url) {
      window.location.href = url;
    }
  }

  filterSignals(type) {
    const signalCards = document.querySelectorAll('.signal-card');
    
    signalCards.forEach(card => {
      if (type === 'all' || card.dataset.type === type) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  async executeTrade(signalId) {
    try {
      // Implement trade execution logic
      console.log('Executing trade for signal:', signalId);
      
      // Show loading state
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = 'Executing...';
      button.disabled = true;
      
      // Simulate trade execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset button
      button.textContent = originalText;
      button.disabled = false;
      
      // Show success message
      this.showNotification('Trade executed successfully!', 'success');
      
    } catch (error) {
      console.error('Trade execution failed:', error);
      this.showNotification('Trade execution failed', 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '600',
      zIndex: '10000',
      animation: 'slideInRight 0.3s ease-out'
    });
    
    // Set background color based on type
    const colors = {
      success: '#0fcc7f',
      error: '#e05a5a',
      info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  startAutoRefresh() {
    // Refresh data every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.fetchTradingSignals();
      this.fetchMarketOverview();
      this.fetchAIPerformance();
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Utility functions
  formatNumber(num) {
    if (typeof num !== 'number') return '--';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  formatCurrency(num) {
    if (typeof num !== 'number') return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }

  formatTime(timestamp) {
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
}

// Global functions for HTML onclick handlers
function openTradingInterface(type) {
  if (window.pandoraIntel) {
    window.pandoraIntel.openTradingInterface(type);
  }
}

function refreshSignals() {
  if (window.pandoraIntel) {
    window.pandoraIntel.fetchTradingSignals();
  }
}

function filterSignals() {
  if (window.pandoraIntel) {
    const select = document.getElementById('signalFilter');
    window.pandoraIntel.filterSignals(select.value);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.pandoraIntel = new PandoraIntel();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .notification {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
  
  .no-signals {
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
    font-size: 1.1rem;
  }
  
  .btn-trade {
    background: var(--gradient-primary);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .btn-trade:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-primary);
  }
  
  .btn-trade:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;
document.head.appendChild(style);
