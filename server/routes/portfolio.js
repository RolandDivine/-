const express = require('express');
const Portfolio = require('../models/Portfolio');
const Trade = require('../models/Trade');
const { authenticateToken } = require('../middleware/auth');
const { calculatePortfolioMetrics } = require('../services/portfolioService');

const router = express.Router();

// Get user portfolio
router.get('/', authenticateToken, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user.userId });
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const metrics = await calculatePortfolioMetrics(portfolio);
    
    res.json({ portfolio, metrics });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio performance
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const portfolio = await Portfolio.findOne({ userId: req.user.userId });
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const metrics = await calculatePortfolioMetrics(portfolio);
    
    // Get performance history
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
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    
    const trades = await Trade.find({
      userId: req.user.userId,
      createdAt: { $gte: startDate },
      status: 'filled'
    }).sort({ createdAt: 1 });
    
    // Calculate performance over time
    const performanceData = [];
    let runningValue = portfolio.totalInvested || 0;
    let runningPnL = 0;
    
    for (const trade of trades) {
      runningPnL += trade.pnl.total;
      runningValue += trade.pnl.total;
      
      performanceData.push({
        date: trade.createdAt,
        value: runningValue,
        pnl: runningPnL,
        returnPercent: runningValue > 0 ? (runningPnL / (runningValue - runningPnL)) * 100 : 0
      });
    }
    
    res.json({
      metrics,
      performance: performanceData,
      timeframe
    });
  } catch (error) {
    console.error('Get portfolio performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio allocation
router.get('/allocation', authenticateToken, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user.userId });
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const metrics = await calculatePortfolioMetrics(portfolio);
    
    res.json({
      allocation: metrics.allocation,
      exposure: metrics.exposure,
      positions: portfolio.positions
    });
  } catch (error) {
    console.error('Get portfolio allocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio positions
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user.userId });
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json({ positions: portfolio.positions });
  } catch (error) {
    console.error('Get portfolio positions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio risk metrics
router.get('/risk', authenticateToken, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user.userId });
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const metrics = await calculatePortfolioMetrics(portfolio);
    
    res.json({
      riskMetrics: metrics.riskMetrics,
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      winRate: metrics.winRate
    });
  } catch (error) {
    console.error('Get portfolio risk metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ userId: req.user.userId });
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const metrics = await calculatePortfolioMetrics(portfolio);
    
    // Get recent trades
    const recentTrades = await Trade.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      summary: {
        totalValue: metrics.totalValue,
        totalReturn: metrics.returnPercent,
        dailyPnL: metrics.dailyPnL,
        winRate: metrics.winRate,
        sharpeRatio: metrics.sharpeRatio
      },
      allocation: metrics.allocation,
      exposure: metrics.exposure,
      recentTrades
    });
  } catch (error) {
    console.error('Get portfolio summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update portfolio position
router.put('/positions/:positionId', authenticateToken, async (req, res) => {
  try {
    const { positionId } = req.params;
    const { stopLoss, takeProfit } = req.body;
    
    const portfolio = await Portfolio.findOne({ userId: req.user.userId });
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const position = portfolio.positions.id(positionId);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    if (stopLoss !== undefined) position.stopLoss = stopLoss;
    if (takeProfit !== undefined) position.takeProfit = takeProfit;
    
    await portfolio.save();
    
    res.json({ position });
  } catch (error) {
    console.error('Update portfolio position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close portfolio position
router.delete('/positions/:positionId', authenticateToken, async (req, res) => {
  try {
    const { positionId } = req.params;
    
    const portfolio = await Portfolio.findOne({ userId: req.user.userId });
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const position = portfolio.positions.id(positionId);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    // Add to realized PnL
    portfolio.realizedPnL += position.unrealizedPnL;
    portfolio.totalPnL = portfolio.realizedPnL + portfolio.unrealizedPnL;
    
    // Remove position
    portfolio.positions.pull(positionId);
    
    // Recalculate allocation and exposure
    portfolio.calculateAllocation();
    portfolio.calculateExposure();
    
    await portfolio.save();
    
    res.json({ message: 'Position closed successfully' });
  } catch (error) {
    console.error('Close portfolio position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const portfolio = await Portfolio.findOne({ userId: req.user.userId });
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const metrics = await calculatePortfolioMetrics(portfolio);
    
    // Get trade statistics
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
    
    const analytics = {
      totalTrades: trades.length,
      winningTrades: trades.filter(t => t.pnl.total > 0).length,
      losingTrades: trades.filter(t => t.pnl.total < 0).length,
      avgReturn: trades.length > 0 ? trades.reduce((sum, t) => sum + t.performance.returnPercent, 0) / trades.length : 0,
      bestTrade: trades.length > 0 ? Math.max(...trades.map(t => t.performance.returnPercent)) : 0,
      worstTrade: trades.length > 0 ? Math.min(...trades.map(t => t.performance.returnPercent)) : 0,
      totalFees: trades.reduce((sum, t) => sum + t.fees.total, 0),
      avgTradeDuration: trades.length > 0 ? trades.reduce((sum, t) => sum + t.performance.duration, 0) / trades.length : 0
    };
    
    res.json({
      metrics,
      analytics,
      timeframe
    });
  } catch (error) {
    console.error('Get portfolio analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
