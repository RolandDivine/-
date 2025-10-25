const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  tradeId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  signalId: {
    type: String,
    required: true
  },
  asset: {
    symbol: {
      type: String,
      required: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true
    }
  },
  type: {
    type: String,
    enum: ['quick', 'spot', 'hodl', 'degen'],
    required: true
  },
  side: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  leverage: {
    type: Number,
    default: 1,
    min: 1,
    max: 100
  },
  fees: {
    trading: {
      type: Number,
      default: 0
    },
    gas: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  slippage: {
    type: Number,
    default: 0
  },
  stopLoss: {
    type: Number
  },
  takeProfit: {
    type: Number
  },
  status: {
    type: String,
    enum: ['pending', 'filled', 'partial', 'cancelled', 'rejected'],
    default: 'pending'
  },
  execution: {
    filledSize: {
      type: Number,
      default: 0
    },
    avgPrice: {
      type: Number
    },
    filledValue: {
      type: Number,
      default: 0
    },
    filledAt: {
      type: Date
    },
    txHash: {
      type: String
    }
  },
  pnl: {
    realized: {
      type: Number,
      default: 0
    },
    unrealized: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  performance: {
    returnPercent: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number, // in minutes
      default: 0
    },
    maxDrawdown: {
      type: Number,
      default: 0
    },
    maxGain: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    exchange: {
      type: String,
      default: 'binance'
    },
    orderType: {
      type: String,
      enum: ['market', 'limit', 'stop'],
      default: 'market'
    },
    timeInForce: {
      type: String,
      enum: ['GTC', 'IOC', 'FOK'],
      default: 'GTC'
    },
    clientOrderId: {
      type: String
    },
    exchangeOrderId: {
      type: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ signalId: 1 });
tradeSchema.index({ 'asset.symbol': 1, createdAt: -1 });
tradeSchema.index({ status: 1, createdAt: -1 });

// Update updatedAt field
tradeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for trade duration in human readable format
tradeSchema.virtual('durationFormatted').get(function() {
  if (!this.execution.filledAt) return 'N/A';
  
  const duration = this.performance.duration;
  if (duration < 60) return `${duration}m`;
  if (duration < 1440) return `${Math.floor(duration / 60)}h ${duration % 60}m`;
  return `${Math.floor(duration / 1440)}d ${Math.floor((duration % 1440) / 60)}h`;
});

// Virtual for profit/loss status
tradeSchema.virtual('isProfitable').get(function() {
  return this.pnl.total > 0;
});

// Method to calculate performance metrics
tradeSchema.methods.calculatePerformance = function(currentPrice) {
  if (!this.execution.filledAt) return;

  const duration = (Date.now() - this.execution.filledAt.getTime()) / (1000 * 60); // minutes
  this.performance.duration = duration;

  if (currentPrice && this.execution.avgPrice) {
    const priceChange = currentPrice - this.execution.avgPrice;
    const returnPercent = (priceChange / this.execution.avgPrice) * 100;
    
    this.pnl.unrealized = (priceChange * this.execution.filledSize) * this.leverage;
    this.pnl.total = this.pnl.realized + this.pnl.unrealized;
    this.performance.returnPercent = returnPercent;
  }
};

// Static method to get user's trade statistics
tradeSchema.statics.getUserStats = async function(userId, timeframe = 'all') {
  const now = new Date();
  let startDate;

  switch (timeframe) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(0);
  }

  const trades = await this.find({
    userId,
    createdAt: { $gte: startDate },
    status: 'filled'
  });

  const stats = {
    totalTrades: trades.length,
    winningTrades: trades.filter(t => t.pnl.total > 0).length,
    losingTrades: trades.filter(t => t.pnl.total < 0).length,
    totalPnL: trades.reduce((sum, t) => sum + t.pnl.total, 0),
    totalFees: trades.reduce((sum, t) => sum + t.fees.total, 0),
    avgReturn: 0,
    winRate: 0,
    maxDrawdown: 0,
    maxGain: 0
  };

  if (trades.length > 0) {
    stats.winRate = (stats.winningTrades / stats.totalTrades) * 100;
    stats.avgReturn = trades.reduce((sum, t) => sum + t.performance.returnPercent, 0) / trades.length;
    stats.maxGain = Math.max(...trades.map(t => t.performance.returnPercent));
    stats.maxDrawdown = Math.min(...trades.map(t => t.performance.returnPercent));
  }

  return stats;
};

module.exports = mongoose.model('Trade', tradeSchema);
