const axios = require('axios');
const config = require('../config');

const COINGECKO_HEADERS = config.COINGECKO_API_KEY 
  ? { headers: { 'x-cg-demo-api-key': config.COINGECKO_API_KEY } }
  : undefined;

class MarketService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes - increased to reduce API calls
    this.lastRequestTime = 0;
    this.requestInterval = 2000; // 2 seconds between requests
  }

  // Rate limiting helper
  async rateLimitedRequest(url, options = {}) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.requestInterval - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    
    try {
      const response = await axios.get(url, { ...COINGECKO_HEADERS, ...options });
      return response;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('Rate limited, waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        return this.rateLimitedRequest(url, options);
      }
      throw error;
    }
  }

  async getMarketData() {
    const cacheKey = 'market_data';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await this.rateLimitedRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=1h%2C24h%2C7d');
      
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Return cached data if available, otherwise empty array
      return cached?.data || [];
    }
  }

  async getGlobalData() {
    const cacheKey = 'global_data';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await this.rateLimitedRequest('https://api.coingecko.com/api/v3/global');
      
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching global data:', error);
      return cached?.data || null;
    }
  }

  async getDerivativesData() {
    const cacheKey = 'derivatives_data';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await this.rateLimitedRequest('https://api.coingecko.com/api/v3/derivatives');
      
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching derivatives data:', error);
      return cached?.data || [];
    }
  }

  async getCoinDetails(coinId) {
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`, COINGECKO_HEADERS);
      return response.data;
    } catch (error) {
      console.error(`Error fetching coin details for ${coinId}:`, error);
      return null;
    }
  }

  async getCoinChart(coinId, days = 30) {
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`, COINGECKO_HEADERS);
      return response.data;
    } catch (error) {
      console.error(`Error fetching coin chart for ${coinId}:`, error);
      return null;
    }
  }

  async getTickerData() {
    const cacheKey = 'ticker_data';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const marketData = await this.getMarketData();
      const tickerData = marketData.slice(0, 20).map(coin => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        volume: coin.total_volume,
        marketCap: coin.market_cap,
        sparkline: coin.sparkline_in_7d?.price || []
      }));

      this.cache.set(cacheKey, {
        data: tickerData,
        timestamp: Date.now()
      });

      return tickerData;
    } catch (error) {
      console.error('Error getting ticker data:', error);
      return [];
    }
  }

  async getMarketOverview() {
    const cacheKey = 'market_overview';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const [globalData, marketData, derivativesData] = await Promise.all([
        this.getGlobalData(),
        this.getMarketData(),
        this.getDerivativesData()
      ]);

      const overview = {
        global: globalData?.data || {},
        topCoins: marketData.slice(0, 10),
        derivatives: derivativesData.slice(0, 10),
        marketCap: globalData?.data?.total_market_cap?.usd || 0,
        volume24h: globalData?.data?.total_volume?.usd || 0,
        activeCryptocurrencies: globalData?.data?.active_cryptocurrencies || 0,
        btcDominance: globalData?.data?.market_cap_percentage?.btc || 0,
        marketCapChange24h: globalData?.data?.market_cap_change_percentage_24h_usd || 0
      };

      this.cache.set(cacheKey, {
        data: overview,
        timestamp: Date.now()
      });

      return overview;
    } catch (error) {
      console.error('Error getting market overview:', error);
      return null;
    }
  }

  async getFundingRates() {
    try {
      const derivativesData = await this.getDerivativesData();
      return derivativesData.map(derivative => ({
        symbol: derivative.symbol,
        name: derivative.name,
        fundingRate: derivative.funding_rate || 0,
        openInterest: derivative.open_interest || 0,
        volume24h: derivative.volume_24h || 0,
        price: derivative.price || 0,
        change24h: derivative.price_change_percentage_24h || 0
      }));
    } catch (error) {
      console.error('Error getting funding rates:', error);
      return [];
    }
  }

  async getFearGreedIndex() {
    try {
      const response = await axios.get('https://api.alternative.me/fng/');
      return response.data;
    } catch (error) {
      console.error('Error fetching fear & greed index:', error);
      return null;
    }
  }

  async getTrendingCoins() {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/search/trending', COINGECKO_HEADERS);
      return response.data;
    } catch (error) {
      console.error('Error fetching trending coins:', error);
      return { coins: [] };
    }
  }

  async getMarketCapHistory(days = 7) {
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/global/market_cap_chart?vs_currency=usd&days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching market cap history:', error);
      return null;
    }
  }

  async getVolumeHistory(days = 7) {
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/global/volume_chart?vs_currency=usd&days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching volume history:', error);
      return null;
    }
  }

  // Calculate market metrics
  calculateMarketMetrics(marketData) {
    if (!marketData || marketData.length === 0) return {};

    const totalMarketCap = marketData.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
    const totalVolume = marketData.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
    
    const positiveCoins = marketData.filter(coin => (coin.price_change_percentage_24h || 0) > 0).length;
    const negativeCoins = marketData.filter(coin => (coin.price_change_percentage_24h || 0) < 0).length;
    
    const avgChange24h = marketData.reduce((sum, coin) => sum + (coin.price_change_percentage_24h || 0), 0) / marketData.length;
    
    const top5MarketCap = marketData.slice(0, 5).reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
    const top5Concentration = totalMarketCap > 0 ? (top5MarketCap / totalMarketCap) * 100 : 0;
    
    const maxVolatility = Math.max(...marketData.map(coin => Math.abs(coin.price_change_percentage_24h || 0)));
    
    return {
      totalMarketCap,
      totalVolume,
      liquidityRatio: totalMarketCap > 0 ? totalVolume / totalMarketCap : 0,
      positiveCoins,
      negativeCoins,
      bullBearRatio: negativeCoins > 0 ? positiveCoins / negativeCoins : positiveCoins,
      avgChange24h,
      top5Concentration,
      maxVolatility,
      marketHealth: this.calculateMarketHealth(avgChange24h, maxVolatility, top5Concentration)
    };
  }

  calculateMarketHealth(avgChange, volatility, concentration) {
    let healthScore = 50; // Base score
    
    // Adjust based on average change
    if (avgChange > 5) healthScore += 20;
    else if (avgChange > 2) healthScore += 10;
    else if (avgChange < -5) healthScore -= 20;
    else if (avgChange < -2) healthScore -= 10;
    
    // Adjust based on volatility
    if (volatility < 5) healthScore += 10;
    else if (volatility > 15) healthScore -= 15;
    
    // Adjust based on concentration
    if (concentration < 40) healthScore += 10;
    else if (concentration > 70) healthScore -= 10;
    
    return Math.max(0, Math.min(100, healthScore));
  }

  // Get real-time price updates
  async getPriceUpdates(symbols) {
    try {
      const symbolsString = symbols.join(',');
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${symbolsString}&vs_currencies=usd&include_24hr_change=true`, COINGECKO_HEADERS);
      return response.data;
    } catch (error) {
      console.error('Error fetching price updates:', error);
      return {};
    }
  }
}

// Update market data function for cron job
async function updateMarketData() {
  const marketService = new MarketService();
  const overview = await marketService.getMarketOverview();
  const tickerData = await marketService.getTickerData();
  const fundingRates = await marketService.getFundingRates();
  
  return {
    overview,
    tickerData,
    fundingRates,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  MarketService,
  updateMarketData
};
