const express = require('express');
const Trade = require('../models/Trade');
const Portfolio = require('../models/Portfolio');
const TradingSignal = require('../models/TradingSignal');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user trades
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, type, limit = 50, page = 1 } = req.query;
    
    const filter = { userId: req.user.userId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const trades = await Trade.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Trade.countDocuments(filter);
    
    res.json({
      trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trade by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const trade = await Trade.findOne({ 
      tradeId: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    
    res.json({ trade });
  } catch (error) {
    console.error('Get trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new trade
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { signalId, size, price, side, leverage = 1 } = req.body;
    
    // Validate input
    if (!signalId || !size || !price || !side) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'Invalid side' });
    }
    
    // Get signal details
    const signal = await TradingSignal.findOne({ signalId });
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    
    if (signal.status !== 'active') {
      return res.status(400).json({ error: 'Signal is not active' });
    }
    
    // Create trade
    const tradeId = `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const value = size * price;
    
    const trade = new Trade({
      tradeId,
      userId: req.user.userId,
      signalId,
      asset: {
        symbol: signal.asset.symbol,
        name: signal.asset.name
      },
      type: signal.type,
      side,
      size,
      price,
      value,
      leverage,
      fees: {
        trading: value * 0.001, // 0.1% trading fee
        gas: signal.execution.gasEstimate || 0,
        total: (value * 0.001) + (signal.execution.gasEstimate || 0)
      },
      slippage: signal.execution.slippage || 0.1,
      stopLoss: signal.execution.stopLoss,
      takeProfit: signal.execution.takeProfit,
      status: 'pending'
    });
    
    await trade.save();
    
    res.status(201).json({ trade });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Execute trade
router.post('/:id/execute', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { executedPrice, txHash } = req.body;
    
    const trade = await Trade.findOne({ 
      tradeId: id, 
      userId: req.user.userId 
    });
    
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    
    if (trade.status !== 'pending') {
      return res.status(400).json({ error: 'Trade is not pending' });
    }
    
    // Update trade with execution details
    trade.status = 'filled';
    trade.execution.filledSize = trade.size;
    trade.execution.avgPrice = executedPrice || trade.price;
    trade.execution.filledValue = trade.size * trade.execution.avgPrice;
    trade.execution.filledAt = new Date();
    trade.execution.txHash = txHash;
    
    // Calculate PnL
    const priceChange = trade.execution.avgPrice - trade.price;
    trade.pnl.unrealized = priceChange * trade.size * trade.leverage;
    trade.pnl.total = trade.pnl.realized + trade.pnl.unrealized;
    trade.performance.returnPercent = (priceChange / trade.price) * 100;
    
    await trade.save();
    
    // Update portfolio
    await updatePortfolioWithTrade(trade);
    
    res.json({ trade });
  } catch (error) {
    console.error('Execute trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel trade
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const trade = await Trade.findOne({ 
      tradeId: id, 
      userId: req.user.userId 
    });
    
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    
    if (trade.status !== 'pending') {
      return res.status(400).json({ error: 'Trade cannot be cancelled' });
    }
    
    trade.status = 'cancelled';
    await trade.save();
    
    res.json({ message: 'Trade cancelled successfully' });
  } catch (error) {
    console.error('Cancel trade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trade statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    
    const trades = await Trade.find({
      userId: req.user.userId,
      createdAt: { $gte: startDate },
      status: 'filled'
    });
    
    const stats = await Trade.getUserStats(req.user.userId, timeframe);
    
    res.json({
      ...stats,
      timeframe,
      totalTrades: trades.length
    });
  } catch (error) {
    console.error('Get trade stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trade performance by type
router.get('/performance/type', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    
    const trades = await Trade.find({
      userId: req.user.userId,
      createdAt: { $gte: startDate },
      status: 'filled'
    });
    
    const performanceByType = {};
    const types = ['quick', 'spot', 'hodl', 'degen'];
    
    for (const type of types) {
      const typeTrades = trades.filter(t => t.type === type);
      
      if (typeTrades.length > 0) {
        const winningTrades = typeTrades.filter(t => t.pnl.total > 0);
        const totalPnL = typeTrades.reduce((sum, t) => sum + t.pnl.total, 0);
        const avgReturn = typeTrades.reduce((sum, t) => sum + t.performance.returnPercent, 0) / typeTrades.length;
        
        performanceByType[type] = {
          totalTrades: typeTrades.length,
          winningTrades: winningTrades.length,
          winRate: (winningTrades.length / typeTrades.length) * 100,
          totalPnL,
          avgReturn,
          avgDuration: typeTrades.reduce((sum, t) => sum + t.performance.duration, 0) / typeTrades.length
        };
      } else {
        performanceByType[type] = {
          totalTrades: 0,
          winningTrades: 0,
          winRate: 0,
          totalPnL: 0,
          avgReturn: 0,
          avgDuration: 0
        };
      }
    }
    
    res.json({ performanceByType, timeframe });
  } catch (error) {
    console.error('Get trade performance by type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update trade stop loss or take profit
router.put('/:id/levels', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { stopLoss, takeProfit } = req.body;
    
    const trade = await Trade.findOne({ 
      tradeId: id, 
      userId: req.user.userId 
    });
    
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    
    if (stopLoss !== undefined) trade.stopLoss = stopLoss;
    if (takeProfit !== undefined) trade.takeProfit = takeProfit;
    
    await trade.save();
    
    res.json({ trade });
  } catch (error) {
    console.error('Update trade levels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to update portfolio with trade
async function updatePortfolioWithTrade(trade) {
  try {
    let portfolio = await Portfolio.findOne({ userId: trade.userId });
    
    if (!portfolio) {
      portfolio = new Portfolio({
        userId: trade.userId,
        totalValue: 0,
        totalInvested: 0,
        unrealizedPnL: 0,
        realizedPnL: 0,
        totalPnL: 0,
        positions: [],
        allocation: { quick: 0, spot: 0, hodl: 0, degen: 0 },
        exposure: { btc: 0, eth: 0, sol: 0, other: 0 }
      });
    }
    
    // Add position to portfolio
    const position = {
      asset: {
        symbol: trade.asset.symbol,
        name: trade.asset.name
      },
      type: trade.type,
      side: trade.side === 'buy' ? 'long' : 'short',
      size: trade.execution.filledSize,
      entryPrice: trade.execution.avgPrice,
      currentPrice: trade.execution.avgPrice,
      value: trade.execution.filledValue,
      invested: trade.execution.filledValue,
      unrealizedPnL: trade.pnl.unrealized,
      leverage: trade.leverage,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      openedAt: trade.execution.filledAt,
      signalId: trade.signalId
    };
    
    portfolio.positions.push(position);
    portfolio.totalValue += position.value;
    portfolio.totalInvested += position.invested;
    portfolio.unrealizedPnL += position.unrealizedPnL;
    portfolio.totalPnL = portfolio.realizedPnL + portfolio.unrealizedPnL;
    
    // Recalculate allocation and exposure
    portfolio.calculateAllocation();
    portfolio.calculateExposure();
    
    await portfolio.save();
  } catch (error) {
    console.error('Error updating portfolio with trade:', error);
  }
}

module.exports = router;
