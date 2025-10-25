// Enterprise Pandora Intel Backend Server
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import enterprise modules
const config = require('./config');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { marketCache, signalsCache, tokenCache, portfolioCache } = require('./utils/cache');
const { apiRateLimit, signalsRateLimit, adminRateLimit, securityHeaders, cors: corsMiddleware } = require('./middleware/security');
const TradingEngine = require('./ai/tradingEngine');

// Initialize Express app
const app = express();

// Initialize AI Trading Engine
const tradingEngine = new TradingEngine();

// Security middleware
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', apiRateLimit);
app.use('/api/trading-signals', signalsRateLimit);
app.use('/api/admin', adminRateLimit);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: {
      market: marketCache.getStats(),
      signals: signalsCache.getStats(),
      token: tokenCache.getStats(),
      portfolio: portfolioCache.getStats()
    }
  });
});

// API Routes
app.get('/api/market/overview', async (req, res) => {
  try {
    const cacheKey = 'market_overview';
    let data = marketCache.get(cacheKey);
    
    if (!data) {
      // Fetch from external APIs
      data = await fetchMarketOverview();
      marketCache.set(cacheKey, data, 30); // 30 seconds cache
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Market overview error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
});

app.get('/api/trading-signals', async (req, res) => {
  try {
    const { type = 'all', limit = 20 } = req.query;
    const cacheKey = `signals_${type}_${limit}`;
    let signals = signalsCache.get(cacheKey);
    
    if (!signals) {
      signals = await generateTradingSignals(type, parseInt(limit));
      signalsCache.set(cacheKey, signals, 60); // 1 minute cache
    }
    
    res.json(signals);
  } catch (error) {
    logger.error('Trading signals error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch trading signals' });
  }
});

app.get('/api/portfolio/performance', async (req, res) => {
  try {
    const cacheKey = 'portfolio_performance';
    let performance = portfolioCache.get(cacheKey);
    
    if (!performance) {
      performance = await calculatePortfolioPerformance();
      portfolioCache.set(cacheKey, performance, 120); // 2 minutes cache
    }
    
    res.json(performance);
  } catch (error) {
    logger.error('Portfolio performance error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch portfolio performance' });
  }
});

app.get('/api/ai/performance', async (req, res) => {
  try {
    const performance = tradingEngine.getPerformance();
    res.json(performance);
  } catch (error) {
    logger.error('AI performance error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch AI performance' });
  }
});

// Admin endpoints
app.post('/api/admin/add-signal', async (req, res) => {
  try {
    const signalData = req.body;
    const signal = await addManualSignal(signalData);
    res.json({ success: true, signal });
  } catch (error) {
    logger.error('Add signal error', { error: error.message });
    res.status(500).json({ error: 'Failed to add signal' });
  }
});

app.delete('/api/admin/delete-signal/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteSignal(id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete signal error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete signal' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../intel_redesign')));

// Error handling middleware
app.use(errorLogger);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled application error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    ...(config.server.env === 'development' && { details: err.message })
  });
});

// Helper functions (to be implemented with actual API calls)
async function fetchMarketOverview() {
  // Implementation for fetching market overview
  return {
    totalMarketCap: 2500000000000,
    totalVolume: 150000000000,
    activeCryptocurrencies: 8500,
    marketCapChange24h: 2.5
  };
}

async function generateTradingSignals(type, limit) {
  // Implementation for generating trading signals
  const signals = [];
  for (let i = 0; i < limit; i++) {
    signals.push({
      id: `signal_${Date.now()}_${i}`,
      symbol: 'BTC/USDT',
      type: type === 'all' ? ['futures', 'spot', 'hodl', 'degen'][i % 4] : type,
      action: ['LONG', 'SHORT', 'BUY', 'SELL'][i % 4],
      entryPrice: 45000 + (Math.random() - 0.5) * 1000,
      targets: [46000, 47000],
      stopLoss: 44000,
      confidence: 70 + Math.random() * 30,
      timestamp: Date.now() - Math.random() * 3600000
    });
  }
  return signals;
}

async function calculatePortfolioPerformance() {
  return {
    totalValue: 125000,
    totalProfit: 25000,
    winRate: 78.5,
    totalTrades: 156,
    profitLoss: 25000,
    returnPercentage: 25.0
  };
}

async function addManualSignal(signalData) {
  const signal = {
    id: `manual_${Date.now()}`,
    ...signalData,
    timestamp: Date.now(),
    status: 'active'
  };
  
  // Add to cache
  signalsCache.set(signal.id, signal, 300);
  
  return signal;
}

async function deleteSignal(id) {
  signalsCache.del(id);
  return true;
}

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  logger.info(`🚀 Pandora Intel Enterprise Backend running on ${HOST}:${PORT}`);
  logger.info(`📊 Environment: ${config.server.env}`);
  logger.info(`🔒 Security: ENABLED`);
  logger.info(`🤖 AI Trading Engine: ACTIVE`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
