const Portfolio = require('../models/Portfolio');
const Trade = require('../models/Trade');

class PortfolioService {
  constructor() {
    this.riskFreeRate = 0.02; // 2% annual risk-free rate
  }

  async calculatePortfolioMetrics(portfolio) {
    if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
      return this.getEmptyMetrics();
    }

    const metrics = {
      totalValue: 0,
      totalInvested: 0,
      unrealizedPnL: 0,
      realizedPnL: portfolio.realizedPnL || 0,
      totalPnL: 0,
      dailyPnL: 0,
      weeklyPnL: 0,
      monthlyPnL: 0,
      allTimePnL: 0,
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      returnPercent: 0,
      dailyReturnPercent: 0,
      allocation: { quick: 0, spot: 0, hodl: 0, degen: 0 },
      exposure: { btc: 0, eth: 0, sol: 0, other: 0 },
      riskMetrics: {
        var95: 0,
        var99: 0,
        beta: 1,
        correlation: 0
      }
    };

    // Calculate position metrics
    let totalValue = 0;
    let totalInvested = 0;
    let totalUnrealizedPnL = 0;

    for (const position of portfolio.positions) {
      totalValue += position.value;
      totalInvested += position.invested;
      totalUnrealizedPnL += position.unrealizedPnL;
    }

    metrics.totalValue = totalValue;
    metrics.totalInvested = totalInvested;
    metrics.unrealizedPnL = totalUnrealizedPnL;
    metrics.totalPnL = metrics.realizedPnL + totalUnrealizedPnL;
    metrics.returnPercent = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

    // Calculate allocation
    metrics.allocation = this.calculateAllocation(portfolio.positions, totalValue);
    
    // Calculate exposure
    metrics.exposure = this.calculateExposure(portfolio.positions, totalValue);

    // Calculate performance metrics
    const performanceMetrics = await this.calculatePerformanceMetrics(portfolio.userId);
    Object.assign(metrics, performanceMetrics);

    // Calculate risk metrics
    metrics.riskMetrics = await this.calculateRiskMetrics(portfolio.positions);

    return metrics;
  }

  calculateAllocation(positions, totalValue) {
    if (totalValue === 0) return { quick: 0, spot: 0, hodl: 0, degen: 0 };

    const allocation = { quick: 0, spot: 0, hodl: 0, degen: 0 };
    
    positions.forEach(position => {
      const percentage = (position.value / totalValue) * 100;
      allocation[position.type] += percentage;
    });

    return allocation;
  }

  calculateExposure(positions, totalValue) {
    if (totalValue === 0) return { btc: 0, eth: 0, sol: 0, other: 0 };

    const exposure = { btc: 0, eth: 0, sol: 0, other: 0 };
    
    positions.forEach(position => {
      const percentage = (position.value / totalValue) * 100;
      const symbol = position.asset.symbol.toLowerCase();
      
      if (symbol === 'btc') exposure.btc += percentage;
      else if (symbol === 'eth') exposure.eth += percentage;
      else if (symbol === 'sol') exposure.sol += percentage;
      else exposure.other += percentage;
    });

    return exposure;
  }

  async calculatePerformanceMetrics(userId) {
    try {
      const trades = await Trade.find({
        userId,
        status: 'filled'
      }).sort({ createdAt: -1 });

      if (trades.length === 0) {
        return {
          winRate: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          dailyPnL: 0,
          weeklyPnL: 0,
          monthlyPnL: 0,
          allTimePnL: 0
        };
      }

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dailyTrades = trades.filter(t => t.createdAt >= oneDayAgo);
      const weeklyTrades = trades.filter(t => t.createdAt >= oneWeekAgo);
      const monthlyTrades = trades.filter(t => t.createdAt >= oneMonthAgo);

      const dailyPnL = dailyTrades.reduce((sum, t) => sum + t.pnl.total, 0);
      const weeklyPnL = weeklyTrades.reduce((sum, t) => sum + t.pnl.total, 0);
      const monthlyPnL = monthlyTrades.reduce((sum, t) => sum + t.pnl.total, 0);
      const allTimePnL = trades.reduce((sum, t) => sum + t.pnl.total, 0);

      const winningTrades = trades.filter(t => t.pnl.total > 0);
      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

      const returns = trades.map(t => t.performance.returnPercent);
      const sharpeRatio = this.calculateSharpeRatio(returns);
      const maxDrawdown = this.calculateMaxDrawdown(returns);

      return {
        winRate: Math.round(winRate * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        dailyPnL: Math.round(dailyPnL * 100) / 100,
        weeklyPnL: Math.round(weeklyPnL * 100) / 100,
        monthlyPnL: Math.round(monthlyPnL * 100) / 100,
        allTimePnL: Math.round(allTimePnL * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
      return {
        winRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        dailyPnL: 0,
        weeklyPnL: 0,
        monthlyPnL: 0,
        allTimePnL: 0
      };
    }
  }

  calculateSharpeRatio(returns) {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualize the returns (assuming daily returns)
    const annualizedReturn = avgReturn * 365;
    const annualizedStdDev = stdDev * Math.sqrt(365);

    return (annualizedReturn - this.riskFreeRate * 100) / annualizedStdDev;
  }

  calculateMaxDrawdown(returns) {
    if (returns.length === 0) return 0;

    let maxDrawdown = 0;
    let peak = 0;
    let runningSum = 0;

    for (const return_ of returns) {
      runningSum += return_;
      if (runningSum > peak) {
        peak = runningSum;
      }
      const drawdown = peak - runningSum;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  async calculateRiskMetrics(positions) {
    if (positions.length === 0) {
      return { var95: 0, var99: 0, beta: 1, correlation: 0 };
    }

    // Simplified risk calculations
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    const avgVolatility = 0.3; // Assume 30% average volatility

    const var95 = totalValue * avgVolatility * 1.645; // 95% VaR
    const var99 = totalValue * avgVolatility * 2.326; // 99% VaR

    // Calculate portfolio beta (simplified)
    const btcWeight = positions
      .filter(pos => pos.asset.symbol.toLowerCase() === 'btc')
      .reduce((sum, pos) => sum + pos.value, 0) / totalValue;
    
    const beta = 0.5 + btcWeight * 0.5; // BTC has beta of 1, others have beta of 0.5

    return {
      var95: Math.round(var95 * 100) / 100,
      var99: Math.round(var99 * 100) / 100,
      beta: Math.round(beta * 100) / 100,
      correlation: Math.round(btcWeight * 100) / 100
    };
  }

  getEmptyMetrics() {
    return {
      totalValue: 0,
      totalInvested: 0,
      unrealizedPnL: 0,
      realizedPnL: 0,
      totalPnL: 0,
      dailyPnL: 0,
      weeklyPnL: 0,
      monthlyPnL: 0,
      allTimePnL: 0,
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      returnPercent: 0,
      dailyReturnPercent: 0,
      allocation: { quick: 0, spot: 0, hodl: 0, degen: 0 },
      exposure: { btc: 0, eth: 0, sol: 0, other: 0 },
      riskMetrics: { var95: 0, var99: 0, beta: 1, correlation: 0 }
    };
  }

  async updatePortfolioValue(portfolio, currentPrices) {
    if (!portfolio.positions || portfolio.positions.length === 0) return portfolio;

    let totalValue = 0;
    let totalUnrealizedPnL = 0;

    for (const position of portfolio.positions) {
      const symbol = position.asset.symbol.toLowerCase();
      const currentPrice = currentPrices[symbol] || position.currentPrice;
      
      // Update current price
      position.currentPrice = currentPrice;
      
      // Recalculate value and PnL
      position.value = position.size * currentPrice;
      position.unrealizedPnL = (currentPrice - position.entryPrice) * position.size * position.leverage;
      
      totalValue += position.value;
      totalUnrealizedPnL += position.unrealizedPnL;
    }

    portfolio.totalValue = totalValue;
    portfolio.unrealizedPnL = totalUnrealizedPnL;
    portfolio.totalPnL = portfolio.realizedPnL + totalUnrealizedPnL;

    // Recalculate allocation and exposure
    portfolio.calculateAllocation();
    portfolio.calculateExposure();

    return portfolio;
  }

  async generatePortfolioReport(userId, timeframe = '30d') {
    try {
      const portfolio = await Portfolio.findOne({ userId });
      if (!portfolio) return null;

      const metrics = await this.calculatePortfolioMetrics(portfolio);
      const trades = await Trade.find({ userId, status: 'filled' })
        .sort({ createdAt: -1 })
        .limit(100);

      const report = {
        summary: {
          totalValue: metrics.totalValue,
          totalReturn: metrics.returnPercent,
          winRate: metrics.winRate,
          sharpeRatio: metrics.sharpeRatio,
          maxDrawdown: metrics.maxDrawdown
        },
        allocation: metrics.allocation,
        exposure: metrics.exposure,
        performance: {
          daily: metrics.dailyPnL,
          weekly: metrics.weeklyPnL,
          monthly: metrics.monthlyPnL,
          allTime: metrics.allTimePnL
        },
        risk: metrics.riskMetrics,
        recentTrades: trades.slice(0, 10),
        positions: portfolio.positions
      };

      return report;
    } catch (error) {
      console.error('Error generating portfolio report:', error);
      return null;
    }
  }
}

module.exports = {
  PortfolioService,
  calculatePortfolioMetrics: (portfolio) => {
    const service = new PortfolioService();
    return service.calculatePortfolioMetrics(portfolio);
  }
};
