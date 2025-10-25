const express = require('express');
const TradingSignal = require('../models/TradingSignal');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin: Create new trading signal
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const signal = new TradingSignal({ ...req.body });
    await signal.save();
    res.status(201).json({ message: 'Signal created', signal });
  } catch (error) {
    console.error('Create signal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all signals with filters
router.get('/', async (req, res) => {
  try {
    const { type, status, limit = 50, page = 1 } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const signals = await TradingSignal.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await TradingSignal.countDocuments(filter);
    
    res.json({
      signals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get signals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signal by ID
router.get('/:id', async (req, res) => {
  try {
    const signal = await TradingSignal.findOne({ signalId: req.params.id });
    
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    
    res.json({ signal });
  } catch (error) {
    console.error('Get signal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signals by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    if (!['quick', 'spot', 'hodl', 'degen'].includes(type)) {
      return res.status(400).json({ error: 'Invalid signal type' });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const signals = await TradingSignal.find({ 
      type, 
      status: 'active',
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await TradingSignal.countDocuments({ 
      type, 
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    
    res.json({
      signals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get signals by type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active signals
router.get('/active/all', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const signals = await TradingSignal.find({
      status: 'active',
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({ signals });
  } catch (error) {
    console.error('Get active signals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signal statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const [
      totalSignals,
      activeSignals,
      dailySignals,
      weeklySignals,
      typeStats,
      confidenceStats
    ] = await Promise.all([
      TradingSignal.countDocuments(),
      TradingSignal.countDocuments({ 
        status: 'active',
        expiresAt: { $gt: now }
      }),
      TradingSignal.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      TradingSignal.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      TradingSignal.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      TradingSignal.aggregate([
        { $group: { 
          _id: null, 
          avgConfidence: { $avg: '$signal.confidence' },
          maxConfidence: { $max: '$signal.confidence' },
          minConfidence: { $min: '$signal.confidence' }
        }}
      ])
    ]);
    
    res.json({
      totalSignals,
      activeSignals,
      dailySignals,
      weeklySignals,
      typeDistribution: typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      confidence: confidenceStats[0] || { avgConfidence: 0, maxConfidence: 0, minConfidence: 0 }
    });
  } catch (error) {
    console.error('Get signal stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top performing signals
router.get('/performance/top', async (req, res) => {
  try {
    const { type, timeframe = '7d', limit = 10 } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '1d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
    }
    
    const filter = { ...dateFilter };
    if (type) filter.type = type;
    
    const signals = await TradingSignal.find(filter)
      .sort({ 'signal.confidence': -1, createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({ signals });
  } catch (error) {
    console.error('Get top performing signals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signal feed (real-time updates)
router.get('/feed/live', authenticateToken, async (req, res) => {
  try {
    const { types = 'quick,spot,hodl,degen', minConfidence = 70 } = req.query;
    
    const typeArray = types.split(',');
    const confidenceFilter = parseInt(minConfidence);
    
    const signals = await TradingSignal.find({
      type: { $in: typeArray },
      status: 'active',
      expiresAt: { $gt: new Date() },
      'signal.confidence': { $gte: confidenceFilter }
    })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ signals });
  } catch (error) {
    console.error('Get signal feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search signals
router.get('/search', async (req, res) => {
  try {
    const { q, type, minConfidence, maxConfidence } = req.query;
    
    const filter = { status: 'active' };
    
    if (q) {
      filter.$or = [
        { 'asset.symbol': { $regex: q, $options: 'i' } },
        { 'asset.name': { $regex: q, $options: 'i' } }
      ];
    }
    
    if (type) filter.type = type;
    if (minConfidence) filter['signal.confidence'] = { $gte: parseInt(minConfidence) };
    if (maxConfidence) {
      filter['signal.confidence'] = { 
        ...filter['signal.confidence'], 
        $lte: parseInt(maxConfidence) 
      };
    }
    
    const signals = await TradingSignal.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({ signals });
  } catch (error) {
    console.error('Search signals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update signal status (admin only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    
    if (!['active', 'executed', 'expired', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const signal = await TradingSignal.findOneAndUpdate(
      { signalId: id },
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    
    res.json({ signal });
  } catch (error) {
    console.error('Update signal status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
