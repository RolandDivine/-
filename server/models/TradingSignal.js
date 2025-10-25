const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  signalId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['quick', 'spot', 'hodl', 'degen'],
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
    },
    price: {
      type: Number,
      required: true
    },
    marketCap: {
      type: Number,
      required: true
    },
    volume24h: {
      type: Number,
      required: true
    }
  },
  signal: {
    action: {
      type: String,
      enum: ['buy', 'sell', 'hold'],
      required: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    expectedROI: {
      min: {
        type: Number,
        required: true
      },
      max: {
        type: Number,
        required: true
      }
    },
    timeframe: {
      min: {
        type: Number,
        required: true
      },
      max: {
        type: Number,
        required: true
      },
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days'],
        required: true
      }
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true
    },
    leverage: {
      type: Number,
      default: 1,
      min: 1,
      max: 100
    },
    positionSize: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    }
  },
  technicalAnalysis: {
    indicators: {
      rsi: {
        type: Number,
        min: 0,
        max: 100
      },
      macd: {
        type: Number
      },
      bollingerBands: {
        upper: Number,
        middle: Number,
        lower: Number
      },
      support: {
        type: Number
      },
      resistance: {
        type: Number
      }
    },
    trend: {
      type: String,
      enum: ['bullish', 'bearish', 'sideways'],
      required: true
    },
    momentum: {
      type: String,
      enum: ['strong', 'moderate', 'weak'],
      required: true
    }
  },
  marketConditions: {
    volatility: {
      type: Number,
      min: 0,
      max: 100
    },
    liquidity: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true
    },
    fundingRate: {
      type: Number
    },
    openInterest: {
      type: Number
    }
  },
  aiMetrics: {
    modelVersion: {
      type: String,
      required: true
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 100
    },
    backtestResults: {
      winRate: {
        type: Number,
        min: 0,
        max: 100
      },
      avgReturn: {
        type: Number
      },
      maxDrawdown: {
        type: Number
      },
      sharpeRatio: {
        type: Number
      }
    },
    features: [{
      name: String,
      weight: Number,
      value: mongoose.Schema.Types.Mixed
    }]
  },
  execution: {
    entryPrice: {
      type: Number
    },
    stopLoss: {
      type: Number
    },
    takeProfit: {
      type: Number
    },
    slippage: {
      type: Number,
      default: 0.1
    },
    gasEstimate: {
      type: Number
    },
    projectedPnL: {
      type: Number
    }
  },
  status: {
    type: String,
    enum: ['active', 'executed', 'expired', 'cancelled'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    required: true
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

// Indexes for better query performance
signalSchema.index({ type: 1, status: 1, createdAt: -1 });
signalSchema.index({ 'asset.symbol': 1, status: 1 });
signalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Update updatedAt field
signalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted timeframe
signalSchema.virtual('formattedTimeframe').get(function() {
  const { min, max, unit } = this.signal.timeframe;
  return `${min}-${max} ${unit}`;
});

// Virtual for risk score
signalSchema.virtual('riskScore').get(function() {
  const { confidence, leverage, volatility } = this;
  const riskFactors = [
    (100 - confidence) / 100,
    Math.min(leverage / 10, 1),
    (volatility || 50) / 100
  ];
  return Math.round(riskFactors.reduce((sum, factor) => sum + factor, 0) / riskFactors.length * 100);
});

module.exports = mongoose.model('TradingSignal', signalSchema);
