// api-integration-layer.js
class APIIntegrationLayer {
    constructor() {
      this.apis = {
        // Market Data
        coingecko: 'https://api.coingecko.com/api/v3',
        binance: 'https://api.binance.com/api/v3',
        coinmarketcap: 'https://pro-api.coinmarketcap.com/v1',
        
        // Sentiment & Social
        lunarCrush: 'https://api.lunarcrush.com/v2',
        alternative: 'https://api.alternative.me',
        
        // On-Chain
        moralis: 'https://deep-index.moralis.io/api/v2',
        etherscan: 'https://api.etherscan.io/api',
        bscscan: 'https://api.bscscan.com/api'
      };
      
      this.cache = new Map();
      this.rateLimits = new Map();
    }
  
    async fetchTopCryptos(limit = 100) {
      try {
        const response = await axios.get(
          `${this.apis.coingecko}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`
        );
        
        return response.data.map(coin => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          current_price: coin.current_price,
          market_cap: coin.market_cap,
          volume_24h: coin.total_volume,
          price_change_24h: coin.price_change_24h,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          sparkline: coin.sparkline_in_7d?.price || [],
          last_updated: coin.last_updated
        }));
      } catch (error) {
        logger.error('Failed to fetch top cryptos:', error);
        return [];
      }
    }
  
    async analyzeCryptoUniverse() {
      const cryptos = await this.fetchTopCryptos(200);
      const analysisPromises = cryptos.map(async (crypto) => {
        try {
          const signal = await tradingEngine.generateSignal(crypto.symbol, 'spot');
          return {
            ...crypto,
            signal,
            score: signal.confidence,
            opportunity: this.calculateOpportunityScore(signal)
          };
        } catch (error) {
          return {
            ...crypto,
            signal: null,
            score: 0,
            opportunity: 0
          };
        }
      });
  
      const results = await Promise.all(analysisPromises);
      
      // Rank by opportunity score
      return results
        .filter(item => item.opportunity > 70)
        .sort((a, b) => b.opportunity - a.opportunity)
        .slice(0, 20); // Top 20 opportunities
    }
  
    calculateOpportunityScore(signal) {
      if (!signal || signal.action === 'HOLD') return 0;
      
      const baseScore = signal.confidence;
      const riskRewardBonus = Math.min(50, (signal.riskReward - 1) * 25);
      const momentumBonus = signal.analysis.momentum * 20;
      
      return Math.min(100, baseScore + riskRewardBonus + momentumBonus);
    }
  }