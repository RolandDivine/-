const express = require('express');
const { MarketService } = require('../services/marketService');

const router = express.Router();
const marketService = new MarketService();

// Get market overview
router.get('/overview', async (req, res) => {
  try {
    const overview = await marketService.getMarketOverview();
    res.json(overview);
  } catch (error) {
    console.error('Get market overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ticker data
router.get('/ticker', async (req, res) => {
  try {
    const tickerData = await marketService.getTickerData();
    res.json({ tickerData });
  } catch (error) {
    console.error('Get ticker data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get market data
router.get('/data', async (req, res) => {
  try {
    const { page = 1, per_page = 100 } = req.query;
    const marketData = await marketService.getMarketData();
    
    const startIndex = (page - 1) * per_page;
    const endIndex = startIndex + per_page;
    const paginatedData = marketData.slice(startIndex, endIndex);
    
    res.json({
      data: paginatedData,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page),
        total: marketData.length,
        pages: Math.ceil(marketData.length / per_page)
      }
    });
  } catch (error) {
    console.error('Get market data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get global data
router.get('/global', async (req, res) => {
  try {
    const globalData = await marketService.getGlobalData();
    res.json(globalData);
  } catch (error) {
    console.error('Get global data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get derivatives data
router.get('/derivatives', async (req, res) => {
  try {
    const derivativesData = await marketService.getDerivativesData();
    res.json(derivativesData);
  } catch (error) {
    console.error('Get derivatives data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get funding rates
router.get('/funding-rates', async (req, res) => {
  try {
    const fundingRates = await marketService.getFundingRates();
    res.json({ fundingRates });
  } catch (error) {
    console.error('Get funding rates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get coin details
router.get('/coins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const coinDetails = await marketService.getCoinDetails(id);
    
    if (!coinDetails) {
      return res.status(404).json({ error: 'Coin not found' });
    }
    
    res.json({ coin: coinDetails });
  } catch (error) {
    console.error('Get coin details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get coin chart
router.get('/coins/:id/chart', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    const chartData = await marketService.getCoinChart(id, parseInt(days));
    
    if (!chartData) {
      return res.status(404).json({ error: 'Chart data not found' });
    }
    
    res.json({ chart: chartData });
  } catch (error) {
    console.error('Get coin chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fear & greed index
router.get('/fear-greed', async (req, res) => {
  try {
    const fearGreedData = await marketService.getFearGreedIndex();
    res.json(fearGreedData);
  } catch (error) {
    console.error('Get fear & greed index error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending coins
router.get('/trending', async (req, res) => {
  try {
    const trendingData = await marketService.getTrendingCoins();
    res.json(trendingData);
  } catch (error) {
    console.error('Get trending coins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get market cap history
router.get('/market-cap/history', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const history = await marketService.getMarketCapHistory(parseInt(days));
    res.json({ history });
  } catch (error) {
    console.error('Get market cap history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get volume history
router.get('/volume/history', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const history = await marketService.getVolumeHistory(parseInt(days));
    res.json({ history });
  } catch (error) {
    console.error('Get volume history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get price updates
router.get('/prices', async (req, res) => {
  try {
    const { symbols } = req.query;
    
    if (!symbols) {
      return res.status(400).json({ error: 'Symbols parameter is required' });
    }
    
    const symbolArray = symbols.split(',');
    const priceUpdates = await marketService.getPriceUpdates(symbolArray);
    res.json({ prices: priceUpdates });
  } catch (error) {
    console.error('Get price updates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search coins
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const marketData = await marketService.getMarketData();
    const filteredCoins = marketData
      .filter(coin => 
        coin.name.toLowerCase().includes(q.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(q.toLowerCase())
      )
      .slice(0, parseInt(limit));
    
    res.json({ coins: filteredCoins });
  } catch (error) {
    console.error('Search coins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get market metrics
router.get('/metrics', async (req, res) => {
  try {
    const marketData = await marketService.getMarketData();
    const metrics = marketService.calculateMarketMetrics(marketData);
    res.json({ metrics });
  } catch (error) {
    console.error('Get market metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
