const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalValue: {
    type: Number,
    default: 0
  },
  totalInvested: {
    type: Number,
    default: 0
  },
  unrealizedPnL: {
    type: Number,
    default: 0
  },
  realizedPnL: {
    type: Number,
    default: 0
  },
  totalPnL: {
    type: Number,
    default: 0
  },
  dailyPnL: {
    type: Number,
    default: 0
  },
  weeklyPnL: {
    type: Number,
    default: 0
  },
  monthlyPnL: {
    type: Number,
    default: 0
  },
  allTimePnL: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  sharpeRatio: {
    type: Number,
    default: 0
  },
  maxDrawdown: {
    type: Number,
    default: 0
  },
  positions: [{
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
      enum: ['long', 'short'],
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    entryPrice: {
      type: Number,
      required: true
    },
    currentPrice: {
      type: Number,
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    invested: {
      type: Number,
      required: true
    },
    unrealizedPnL: {
      type: Number,
      required: true
    },
    leverage: {
      type: Number,
      default: 1
    },
    stopLoss: {
      type: Number
    },
    takeProfit: {
      type: Number
    },
    openedAt: {
      type: Date,
      default: Date.now
    },
    signalId: {
      type: String
    }
  }],
  allocation: {
    quick: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    spot: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    hodl: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    degen: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  exposure: {
    btc: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    eth: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    sol: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    other: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  performance: {
    daily: [{
      date: Date,
      value: Number,
      pnl: Number
    }],
    weekly: [{
      week: String,
      value: Number,
      pnl: Number
    }],
    monthly: [{
      month: String,
      value: Number,
      pnl: Number
    }]
  },
  riskMetrics: {
    var95: {
      type: Number,
      default: 0
    },
    var99: {
      type: Number,
      default: 0
    },
    beta: {
      type: Number,
      default: 1
    },
    correlation: {
      type: Number,
      default: 0
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
portfolioSchema.index({ userId: 1 });
portfolioSchema.index({ 'positions.asset.symbol': 1 });

// Update updatedAt field
portfolioSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total return percentage
portfolioSchema.virtual('totalReturnPercent').get(function() {
  if (this.totalInvested === 0) return 0;
  return ((this.totalValue - this.totalInvested) / this.totalInvested) * 100;
});

// Virtual for daily return percentage
portfolioSchema.virtual('dailyReturnPercent').get(function() {
  if (this.totalValue === 0) return 0;
  return (this.dailyPnL / this.totalValue) * 100;
});

// Method to calculate allocation percentages
portfolioSchema.methods.calculateAllocation = function() {
  const total = this.positions.reduce((sum, pos) => sum + pos.value, 0);
  if (total === 0) return;

  const allocation = { quick: 0, spot: 0, hodl: 0, degen: 0 };
  this.positions.forEach(pos => {
    allocation[pos.type] += (pos.value / total) * 100;
  });

  this.allocation = allocation;
};

// Method to calculate exposure percentages
portfolioSchema.methods.calculateExposure = function() {
  const total = this.positions.reduce((sum, pos) => sum + pos.value, 0);
  if (total === 0) return;

  const exposure = { btc: 0, eth: 0, sol: 0, other: 0 };
  this.positions.forEach(pos => {
    const symbol = pos.asset.symbol.toLowerCase();
    if (symbol === 'btc') exposure.btc += (pos.value / total) * 100;
    else if (symbol === 'eth') exposure.eth += (pos.value / total) * 100;
    else if (symbol === 'sol') exposure.sol += (pos.value / total) * 100;
    else exposure.other += (pos.value / total) * 100;
  });

  this.exposure = exposure;
};

module.exports = mongoose.model('Portfolio', portfolioSchema);
