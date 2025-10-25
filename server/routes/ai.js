const express = require('express');
const { generateAISignals } = require('../services/aiService');
const TradingSignal = require('../models/TradingSignal');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate new AI signals
router.post('/generate-signals', async (req, res) => {
  try {
    const signals = await generateAISignals();
    
    // Save signals to database
    const savedSignals = [];
    for (const signal of signals) {
      const newSignal = new TradingSignal(signal);
      await newSignal.save();
      savedSignals.push(newSignal);
    }
    
    res.json({
      message: 'Signals generated successfully',
      count: savedSignals.length,
      signals: savedSignals
    });
  } catch (error) {
    console.error('Generate AI signals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI model performance
router.get('/performance', async (req, res) => {
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
    
    const signals = await TradingSignal.find({
      createdAt: { $gte: startDate },
      status: { $in: ['executed', 'expired'] }
    });
    
    const performanceByType = {};
    const types = ['quick', 'spot', 'hodl', 'degen'];
    
    for (const type of types) {
      const typeSignals = signals.filter(s => s.type === type);
      
      if (typeSignals.length > 0) {
        const avgConfidence = typeSignals.reduce((sum, s) => sum + s.signal.confidence, 0) / typeSignals.length;
        const avgROI = typeSignals.reduce((sum, s) => sum + (s.signal.expectedROI.min + s.signal.expectedROI.max) / 2, 0) / typeSignals.length;
        
        performanceByType[type] = {
          totalSignals: typeSignals.length,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          avgROI: Math.round(avgROI * 100) / 100,
          modelAccuracy: typeSignals[0]?.aiMetrics?.accuracy || 0,
          backtestWinRate: typeSignals[0]?.aiMetrics?.backtestResults?.winRate || 0
        };
      } else {
        performanceByType[type] = {
          totalSignals: 0,
          avgConfidence: 0,
          avgROI: 0,
          modelAccuracy: 0,
          backtestWinRate: 0
        };
      }
    }
    
    res.json({
      performanceByType,
      timeframe,
      totalSignals: signals.length
    });
  } catch (error) {
    console.error('Get AI performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI model details
router.get('/model-info', async (req, res) => {
  try {
    const latestSignal = await TradingSignal.findOne().sort({ createdAt: -1 });
    
    if (!latestSignal) {
      return res.json({
        modelVersion: 'v1.0.0',
        lastUpdate: null,
        features: [],
        accuracy: 0
      });
    }
    
    res.json({
      modelVersion: latestSignal.aiMetrics.modelVersion,
      lastUpdate: latestSignal.createdAt,
      features: latestSignal.aiMetrics.features,
      accuracy: latestSignal.aiMetrics.accuracy,
      backtestResults: latestSignal.aiMetrics.backtestResults
    });
  } catch (error) {
    console.error('Get AI model info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI signal recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const { riskTolerance = 'medium', maxSignals = 10 } = req.query;
    
    const filter = {
      status: 'active',
      expiresAt: { $gt: new Date() }
    };
    
    // Filter by risk tolerance
    if (riskTolerance === 'low') {
      filter['signal.riskLevel'] = 'low';
      filter['signal.confidence'] = { $gte: 80 };
    } else if (riskTolerance === 'high') {
      filter['signal.riskLevel'] = { $in: ['medium', 'high'] };
      filter['signal.confidence'] = { $gte: 70 };
    } else {
      filter['signal.riskLevel'] = { $in: ['low', 'medium'] };
      filter['signal.confidence'] = { $gte: 75 };
    }
    
    const signals = await TradingSignal.find(filter)
      .sort({ 'signal.confidence': -1, createdAt: -1 })
      .limit(parseInt(maxSignals));
    
    res.json({ recommendations: signals });
  } catch (error) {
    console.error('Get AI recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI signal analysis
router.get('/analysis/:signalId', async (req, res) => {
  try {
    const { signalId } = req.params;
    
    const signal = await TradingSignal.findOne({ signalId });
    
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    
    const analysis = {
      signalId: signal.signalId,
      asset: signal.asset,
      technicalAnalysis: signal.technicalAnalysis,
      marketConditions: signal.marketConditions,
      aiMetrics: signal.aiMetrics,
      riskScore: signal.riskScore,
      confidenceBreakdown: {
        trend: signal.technicalAnalysis.trend,
        momentum: signal.technicalAnalysis.momentum,
        volatility: signal.marketConditions.volatility,
        liquidity: signal.marketConditions.liquidity,
        overall: signal.signal.confidence
      },
      recommendation: {
        action: signal.signal.action,
        reasoning: generateReasoning(signal),
        riskFactors: identifyRiskFactors(signal),
        opportunityFactors: identifyOpportunityFactors(signal)
      }
    };
    
    res.json({ analysis });
  } catch (error) {
    console.error('Get AI signal analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI model training data
router.get('/training-data', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    
    const filter = { status: 'executed' };
    if (type) filter.type = type;
    
    const signals = await TradingSignal.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('type signal.expectedROI signal.confidence technicalAnalysis marketConditions aiMetrics');
    
    res.json({ trainingData: signals });
  } catch (error) {
    console.error('Get AI training data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function generateReasoning(signal) {
  const { technicalAnalysis, marketConditions, signal: signalData } = signal;
  
  let reasoning = [];
  
  // Technical analysis reasoning
  if (technicalAnalysis.trend === 'bullish') {
    reasoning.push('Strong bullish trend detected');
  } else if (technicalAnalysis.trend === 'bearish') {
    reasoning.push('Bearish trend identified');
  }
  
  if (technicalAnalysis.momentum === 'strong') {
    reasoning.push('High momentum indicates strong price movement');
  }
  
  // Market conditions reasoning
  if (marketConditions.liquidity === 'high') {
    reasoning.push('High liquidity ensures good execution');
  }
  
  if (marketConditions.volatility > 70) {
    reasoning.push('High volatility presents both opportunity and risk');
  }
  
  // Confidence reasoning
  if (signalData.confidence > 85) {
    reasoning.push('Very high confidence based on multiple indicators');
  } else if (signalData.confidence > 75) {
    reasoning.push('High confidence with strong signal alignment');
  }
  
  return reasoning.join('. ') + '.';
}

function identifyRiskFactors(signal) {
  const riskFactors = [];
  
  if (signal.signal.riskLevel === 'high') {
    riskFactors.push('High risk level');
  }
  
  if (signal.signal.leverage > 5) {
    riskFactors.push('High leverage increases risk');
  }
  
  if (signal.marketConditions.volatility > 80) {
    riskFactors.push('Extreme market volatility');
  }
  
  if (signal.marketConditions.liquidity === 'low') {
    riskFactors.push('Low liquidity may cause slippage');
  }
  
  if (signal.signal.confidence < 75) {
    riskFactors.push('Lower confidence level');
  }
  
  return riskFactors;
}

function identifyOpportunityFactors(signal) {
  const opportunityFactors = [];
  
  if (signal.signal.expectedROI.max > 50) {
    opportunityFactors.push('High profit potential');
  }
  
  if (signal.technicalAnalysis.momentum === 'strong') {
    opportunityFactors.push('Strong momentum supports price movement');
  }
  
  if (signal.marketConditions.liquidity === 'high') {
    opportunityFactors.push('High liquidity ensures good execution');
  }
  
  if (signal.aiMetrics.accuracy > 80) {
    opportunityFactors.push('High model accuracy');
  }
  
  if (signal.signal.confidence > 85) {
    opportunityFactors.push('Very high confidence level');
  }
  
  return opportunityFactors;
}

module.exports = router;
