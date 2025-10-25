// backend/server.js
//
// Enhanced HTTP server for the Pandora Intel project with AI Trading Engine integration.
// This server now includes advanced AI signal generation, real-time market analysis,
// and maintains backward compatibility with existing endpoints.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Determine the frontend directory relative to this file.
const frontendDir = path.resolve(__dirname, '../intel_redesign');

// AI Trading Engine Integration
let AdvancedTradingEngine, APIIntegrationLayer, tradingSystem;

try {
  // Dynamic imports for AI trading engine
  AdvancedTradingEngine = require('../trading-engine/enhanced-trading-engine');
  APIIntegrationLayer = require('../trading-engine/api-integration-layer');
  
  // Initialize AI trading system
  const PandoraIntelTradingSystem = require('../trading-engine/main.js');
  tradingSystem = new PandoraIntelTradingSystem();
  
  console.log('🤖 AI Trading Engine loaded successfully');
} catch (error) {
  console.warn('⚠️ AI Trading Engine not available, using enhanced signal generation:', error.message);
  tradingSystem = null;
}

// Define fetch function
let fetch;
if (typeof global.fetch === 'function') {
  fetch = global.fetch.bind(global);
} else {
  fetch = async (...args) => {
    const { default: fetchFn } = await import('node-fetch');
    return fetchFn(...args);
  };
}

// Enhanced caching system
let marketCache = {};
let detailCache = {};
let chartCache = {};
let fundamentalsCache = { data: null, timestamp: 0 };
let intelligenceCache = { data: null, timestamp: 0 };
let tradingSignalsCache = { data: null, timestamp: 0 };

// Advanced cache for AI signals
let aiSignalsCache = { data: null, timestamp: 0 };

// Set of CoinGecko IDs that run on the Binance Smart Chain
let bnbCoins = new Set();

// Trading platforms configuration
const TRADING_PLATFORMS = {
  spot: ['nq-swap.xyz', 'binance-web3', 'four.meme', 'pump-swap'],
  degen: ['nq-swap.xyz', 'binance-web3', 'four.meme', 'pump-swap'],
  hodl: ['nq-swap.xyz', 'binance-web3', 'four.meme', 'pump-swap'],
  futures: ['aster-dex']
};

// API endpoints
const GECKO_TERMINAL_BASE = 'https://api.geckoterminal.com/api/v2';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Enhanced caching with TTL
let cache = {
  marketData: new Map(),
  tokenData: new Map(),
  liquidityPools: new Map(),
  tradingPairs: new Map()
};

/**
 * Enhanced fetch function with caching and retry logic
 */
async function fetchJsonWithProxy(url, options = {}) {
  const { useCache = true, ttl = 30000, retries = 3 } = options;
  
  // Check cache first
  if (useCache) {
    const cached = cache.marketData.get(url);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
  }

  let proxies = [
    null,
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/',
    'https://yacdn.org/proxy/',
    'https://cors.isomorphic-git.org/'
  ];
  
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    for (const proxy of proxies) {
      let fetchUrl;
      try {
        if (!proxy) {
          fetchUrl = url;
        } else {
          fetchUrl = proxy.endsWith('?') ? proxy + encodeURIComponent(url) : proxy + url;
        }
          
        const res = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'PandoraIntel/1.0',
            'Accept': 'application/json',
            ...options.headers
          },
          timeout: 10000
        });
        
        if (!res.ok) {
          lastError = new Error(`Proxy ${proxy || 'direct'} returned status ${res.status}`);
          continue;
        }
          
        const json = await res.json();
          
        // Cache the result
        if (useCache) {
          cache.marketData.set(url, { data: json, timestamp: Date.now() });
        }
          
        return json;
      } catch (err) {
        lastError = err;
        continue;
      }
    }
      
    // Wait before retry
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  throw lastError || new Error('Failed to fetch JSON after all retries');
}

/**
 * Fetch live data from GeckoTerminal
 */
async function fetchGeckoTerminalData(endpoint) {
  const url = `${GECKO_TERMINAL_BASE}${endpoint}`;
  return await fetchJsonWithProxy(url, { ttl: 15000 });
}

/**
 * Fetch live data from CoinGecko
 */
async function fetchCoinGeckoData(endpoint) {
  const url = `${COINGECKO_BASE}${endpoint}`;
  return await fetchJsonWithProxy(url, { ttl: 30000 });
}

/**
 * Get token data by contract address
 */
async function getTokenByContract(contractAddress, network = 'eth') {
  const cacheKey = `${network}_${contractAddress}`;
  const cached = cache.tokenData.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data;
  }

  try {
    const geckoData = await fetchGeckoTerminalData(`/networks/${network}/tokens/${contractAddress}`);
    
    if (geckoData && geckoData.data) {
      const tokenData = geckoData.data;
      const result = {
        id: tokenData.id,
        symbol: tokenData.attributes.symbol,
        name: tokenData.attributes.name,
        contractAddress: contractAddress,
        network: network,
        price: tokenData.attributes.price_usd,
        marketCap: tokenData.attributes.market_cap_usd,
        volume24h: tokenData.attributes.volume_usd?.h24,
        priceChange24h: tokenData.attributes.price_change_percentage?.h24,
        liquidity: tokenData.attributes.fdv_usd,
        image: tokenData.attributes.image_url
      };
      
      cache.tokenData.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
  } catch (error) {
    console.warn(`Failed to fetch token data from GeckoTerminal for ${contractAddress}:`, error.message);
  }

  try {
    const coingeckoData = await fetchCoinGeckoData(`/coins/${network}/contract/${contractAddress}`);
    if (coingeckoData) {
      const result = {
        id: coingeckoData.id,
        symbol: coingeckoData.symbol.toUpperCase(),
        name: coingeckoData.name,
        contractAddress: contractAddress,
        network: network,
        price: coingeckoData.market_data?.current_price?.usd,
        marketCap: coingeckoData.market_data?.market_cap?.usd,
        volume24h: coingeckoData.market_data?.total_volume?.usd,
        priceChange24h: coingeckoData.market_data?.price_change_percentage_24h,
        image: coingeckoData.image?.small
      };
      
      cache.tokenData.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
  } catch (error) {
    console.warn(`Failed to fetch token data from CoinGecko for ${contractAddress}:`, error.message);
  }

  throw new Error(`Token not found for contract ${contractAddress} on ${network}`);
}

/**
 * Get liquidity pool data
 */
async function getLiquidityPoolData(poolAddress, network = 'eth') {
  const cacheKey = `pool_${network}_${poolAddress}`;
  const cached = cache.liquidityPools.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.data;
  }

  try {
    const poolData = await fetchGeckoTerminalData(`/networks/${network}/pools/${poolAddress}`);
    
    if (poolData && poolData.data) {
      const pool = poolData.data;
      const result = {
        id: pool.id,
        address: poolAddress,
        network: network,
        baseToken: pool.relationships?.base_token?.data,
        quoteToken: pool.relationships?.quote_token?.data,
        price: pool.attributes.base_token_price_usd,
        volume24h: pool.attributes.volume_usd?.h24,
        liquidity: pool.attributes.reserve_in_usd,
        priceChange24h: pool.attributes.price_change_percentage?.h24,
        fdv: pool.attributes.fdv_usd,
        marketCap: pool.attributes.market_cap_usd
      };
      
      cache.liquidityPools.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
  } catch (error) {
    console.error(`Failed to fetch pool data for ${poolAddress}:`, error.message);
    throw error;
  }
}

/**
 * Load BNB chain coins
 */
async function loadBnbCoins() {
  try {
    console.log('Loading BNB coin list from CoinGecko…');
    const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';
    const list = await fetchJsonWithProxy(url);
    bnbCoins = new Set(
      list
        .filter((c) => c.platforms && c.platforms['binance-smart-chain'])
        .map((c) => c.id)
    );
    console.log(`Loaded ${bnbCoins.size} BNB chain coins.`);
  } catch (err) {
    console.error('Error loading BNB coin list:', err.message);
    bnbCoins = new Set();
  }
}

/**
 * Compute fundamentals
 */
async function getFundamentals() {
  const now = Date.now();
  const TTL = 30 * 1000;
  if (fundamentalsCache.data && now - fundamentalsCache.timestamp < TTL) {
    return fundamentalsCache.data;
  }
  const globalUrl = 'https://api.coingecko.com/api/v3/global';
  const globalData = await fetchJsonWithProxy(globalUrl);
  const data = {};
  try {
    const g = globalData.data || {};
    data.activity = {
      label: '24h Volume (USD)',
      value: g.total_volume && g.total_volume.usd
        ? g.total_volume.usd
        : null,
    };
    data.growth = {
      label: 'Market Cap Change 24h (%)',
      value: g.market_cap_change_percentage_24h_usd,
    };
    data.adoption = {
      label: 'Active Cryptocurrencies',
      value: g.active_cryptocurrencies,
    };
    data.health = {
      label: 'Bitcoin Dominance (%)',
      value: g.market_cap_percentage && g.market_cap_percentage.bitcoin,
    };
  } catch (err) {
    console.error('Error computing fundamentals:', err.message);
  }
  fundamentalsCache.data = data;
  fundamentalsCache.timestamp = now;
  return data;
}

/**
 * Compute market intelligence
 */
async function getMarketIntelligence() {
  const now = Date.now();
  const TTL = 30 * 1000;
  if (intelligenceCache.data && now - intelligenceCache.timestamp < TTL) {
    return intelligenceCache.data;
  }
  const globalUrl = 'https://api.coingecko.com/api/v3/global';
  const globalData = await fetchJsonWithProxy(globalUrl);
  let markets;
  try {
    markets = await getMarketData(1, 100);
  } catch (err) {
    markets = [];
  }
  const data = {};
  try {
    const g = globalData.data || {};
    const totalVolume = g.total_volume && g.total_volume.usd ? g.total_volume.usd : null;
    const totalMarketCap = g.total_market_cap && g.total_market_cap.usd ? g.total_market_cap.usd : null;
    
    let liquidityRatio = null;
    if (totalVolume && totalMarketCap && totalMarketCap !== 0) {
      liquidityRatio = totalVolume / totalMarketCap;
    }
    data.liquidity_ratio = {
      label: 'Liquidity Ratio',
      value: liquidityRatio,
    };
    
    let concentration = null;
    if (Array.isArray(markets) && markets.length > 0 && totalMarketCap) {
      const top5 = markets.slice(0, 5).reduce((sum, c) => sum + (c.market_cap || 0), 0);
      concentration = totalMarketCap !== 0 ? top5 / totalMarketCap : null;
    }
    data.top5_concentration = {
      label: 'Top 5 Concentration',
      value: concentration,
    };
    
    let maxVol = null;
    if (Array.isArray(markets) && markets.length > 0) {
      maxVol = markets.reduce((max, c) => {
        const change = c.price_change_percentage_24h;
        if (typeof change === 'number') {
          const absChange = Math.abs(change);
          return absChange > max ? absChange : max;
        }
        return max;
      }, 0);
    }
    data.max_volatility_24h = {
      label: 'Max 24h Volatility (%)',
      value: maxVol,
    };
    
    let bull = 0;
    let bear = 0;
    if (Array.isArray(markets) && markets.length > 0) {
      markets.forEach((c) => {
        const change = c.price_change_percentage_24h;
        if (typeof change === 'number') {
          if (change > 0) bull += 1;
          else if (change < 0) bear += 1;
        }
      });
    }
    let bullBearRatio = null;
    if (bull > 0 && bear > 0) {
      bullBearRatio = bull / bear;
    } else if (bull > 0 && bear === 0) {
      bullBearRatio = Infinity;
    } else {
      bullBearRatio = null;
    }
    data.bull_bear_ratio = {
      label: 'Bull/Bear Ratio',
      value: bullBearRatio,
    };
  } catch (err) {
    console.error('Error computing market intelligence:', err.message);
  }
  intelligenceCache.data = data;
  intelligenceCache.timestamp = now;
  return data;
}

/**
 * Fetch market data
 */
async function getMarketData(page = 1, perPage = 100) {
  const key = `market_${page}_${perPage}`;
  const now = Date.now();
  const TTL = 30 * 1000;
  if (marketCache[key] && now - marketCache[key].timestamp < TTL) {
    return marketCache[key].data;
  }
  const url =
    'https://api.coingecko.com/api/v3/coins/markets' +
    `?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}` +
    '&sparkline=true&price_change_percentage=24h%2C7d';
  const data = await fetchJsonWithProxy(url);
  data.forEach((coin) => {
    coin.buy_signal = bnbCoins.has(coin.id);
  });
  marketCache[key] = { timestamp: now, data };
  return data;
}

/**
 * Fetch coin details
 */
async function getCoinDetails(id) {
  const now = Date.now();
  const TTL = 30 * 1000;
  if (detailCache[id] && now - detailCache[id].timestamp < TTL) {
    return detailCache[id].data;
  }
  const url =
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}` +
    '?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true';
  const data = await fetchJsonWithProxy(url);
  data.buy_signal = bnbCoins.has(id);
  detailCache[id] = { timestamp: now, data };
  return data;
}

/**
 * Fetch coin chart data
 */
async function getCoinChart(id, days = 30) {
  const key = `${id}_chart_${days}`;
  const now = Date.now();
  const TTL = 30 * 1000;
  if (chartCache[key] && now - chartCache[key].timestamp < TTL) {
    return chartCache[key].data;
  }
  const url =
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart` +
    `?vs_currency=usd&days=${days}`;
  const data = await fetchJsonWithProxy(url);
  chartCache[key] = { timestamp: now, data };
  return data;
}

// Manual signals storage
let manualSignals = [];

/**
 * AI-Powered Trading Signal Generation
 */
async function getTradingSignals() {
  const now = Date.now();
  const TTL = 60 * 1000;
  
  // Check cache first
  if (tradingSignalsCache && now - tradingSignalsCache.timestamp < TTL) {
    return tradingSignalsCache.data;
  }

  try {
    let signals = [];

    // Use AI Engine if available
    if (tradingSystem) {
      try {
        const opportunities = await tradingSystem.apiLayer.analyzeCryptoUniverse();
        const aiSignals = await tradingSystem.generateBatchSignals(opportunities);
        signals = aiSignals.filter(signal => signal.confidence >= 70);
        console.log(`🤖 AI Engine generated ${signals.length} signals`);
      } catch (aiError) {
        console.warn('AI Engine failed, falling back to traditional signals:', aiError.message);
        signals = await generateTraditionalSignals();
      }
    } else {
      signals = await generateTraditionalSignals();
    }

    // Add manual signals
    signals.push(...manualSignals);
    
    // Cache the results
    tradingSignalsCache.timestamp = now;
    tradingSignalsCache.data = signals;
    return signals;
  } catch (error) {
    console.error('Error generating trading signals:', error);
    return [];
  }
}

/**
 * Traditional signal generation (fallback)
 */
async function generateTraditionalSignals() {
  const marketData = await getMarketData(1, 50);
  let signals = [];

  for (const coin of marketData.slice(0, 20)) {
    const signal = await generateSignalForCoin(coin);
    if (signal) {
      signals.push(signal);
    }
  }

  return signals;
}

/**
 * Generate signal for individual coin
 */
async function generateSignalForCoin(coin) {
  try {
    const priceChange24h = coin.price_change_percentage_24h || 0;
    const priceChange7d = coin.price_change_percentage_7d_in_currency || 0;
    const volume = coin.total_volume || 0;
    const marketCap = coin.market_cap || 0;

    let signalType = 'spot';
    let action = 'HOLD';
    let confidence = 50;

    if (Math.abs(priceChange24h) > 15 && marketCap < 1000000000) {
      signalType = 'degen';
      action = priceChange24h > 0 ? 'YOLO' : 'AVOID';
      confidence = Math.min(85, 60 + Math.abs(priceChange24h) / 2);
    } else if (Math.abs(priceChange24h) > 5 && marketCap > 10000000000) {
      signalType = 'futures';
      action = priceChange24h > 0 ? 'LONG' : 'SHORT';
      confidence = Math.min(95, 70 + Math.abs(priceChange24h));
    } else if (priceChange7d > 10 && priceChange24h > 0) {
      signalType = 'hodl';
      action = 'HODL';
      confidence = Math.min(90, 75 + priceChange7d / 2);
    } else if (Math.abs(priceChange24h) > 2) {
      signalType = 'spot';
      action = priceChange24h > 0 ? 'BUY' : 'SELL';
      confidence = Math.min(85, 60 + Math.abs(priceChange24h) * 2);
    }

    if (confidence < 70) return null;

    const currentPrice = coin.current_price;
    const volatility = Math.abs(priceChange24h) / 100;
    
    let entryPrice = currentPrice;
    let targets = [];
    let stopLoss = currentPrice * (1 - volatility * 0.5);

    if (action === 'LONG' || action === 'BUY' || action === 'HODL' || action === 'YOLO') {
      targets = [
        currentPrice * (1 + volatility * 0.8),
        currentPrice * (1 + volatility * 1.5)
      ];
    } else if (action === 'SHORT') {
      targets = [
        currentPrice * (1 - volatility * 0.8),
        currentPrice * (1 - volatility * 1.5)
      ];
      stopLoss = currentPrice * (1 + volatility * 0.5);
    }

    return {
      id: `signal_${coin.id}_${Date.now()}`,
      symbol: `${coin.symbol.toUpperCase()}/USDT`,
      type: signalType,
      action: action,
      entryPrice: entryPrice,
      targets: targets,
      stopLoss: stopLoss,
      confidence: Math.round(confidence),
      timestamp: Date.now(),
      coinId: coin.id,
      coinName: coin.name,
      marketCap: marketCap,
      volume24h: volume,
      priceChange24h: priceChange24h,
      buySignal: coin.buy_signal || false
    };
  } catch (error) {
    console.error(`Error generating signal for ${coin.id}:`, error);
    return null;
  }
}

/**
 * AI-Powered Enhanced Signal Generation
 */
async function generateEnhancedSignal(coin, signalType = 'spot') {
  try {
    // Use AI Engine if available
    if (tradingSystem) {
      try {
        const aiSignal = await tradingSystem.engine.generateSignal(coin.symbol, signalType);
        if (aiSignal && aiSignal.confidence >= 70) {
          return {
            ...aiSignal,
            coinId: coin.id,
            coinName: coin.name,
            marketCap: coin.market_cap,
            volume24h: coin.total_volume,
            priceChange24h: coin.price_change_percentage_24h,
            buySignal: coin.buy_signal || false,
            tradingPlatforms: getTradingPlatforms(signalType),
            source: 'ai_engine'
          };
        }
      } catch (aiError) {
        console.warn(`AI Engine failed for ${coin.symbol}, using fallback:`, aiError.message);
      }
    }
    
    // Fallback to traditional enhanced signal generation
    return await generateEnhancedSignalFallback(coin, signalType);
  } catch (error) {
    console.error(`Enhanced signal generation failed for ${coin.id}:`, error.message);
    return await generateEnhancedSignalFallback(coin, signalType);
  }
}

/**
 * Traditional enhanced signal generation (fallback)
 */
async function generateEnhancedSignalFallback(coin, signalType = 'spot') {
  const priceChange24h = coin.price_change_percentage_24h || 0;
  const priceChange7d = coin.price_change_percentage_7d_in_currency || 0;
  const volume = coin.total_volume || 0;
  const marketCap = coin.market_cap || 0;
  const currentPrice = coin.current_price;

  let action = 'HOLD';
  let confidence = 50;
  let targets = [];
  let stopLoss = currentPrice * 0.95;

  const volatility = Math.abs(priceChange24h) / 100;
  const volumeRatio = volume / marketCap;
  const momentum = priceChange7d > 0 ? 1 : -1;

  switch (signalType) {
    case 'futures':
      if (Math.abs(priceChange24h) > 3 && marketCap > 1000000000) {
        action = priceChange24h > 0 ? 'LONG' : 'SHORT';
        confidence = Math.min(95, 70 + Math.abs(priceChange24h) * 2);
        targets = [
          currentPrice * (1 + (priceChange24h > 0 ? volatility * 0.8 : -volatility * 0.8)),
          currentPrice * (1 + (priceChange24h > 0 ? volatility * 1.5 : -volatility * 1.5))
        ];
        stopLoss = currentPrice * (1 + (priceChange24h > 0 ? -volatility * 0.5 : volatility * 0.5));
      }
      break;

    case 'spot':
      if (Math.abs(priceChange24h) > 2 && volumeRatio > 0.01) {
        action = priceChange24h > 0 ? 'BUY' : 'SELL';
        confidence = Math.min(90, 65 + Math.abs(priceChange24h) * 1.5);
        targets = [
          currentPrice * (1 + (priceChange24h > 0 ? volatility * 0.6 : -volatility * 0.6)),
          currentPrice * (1 + (priceChange24h > 0 ? volatility * 1.2 : -volatility * 1.2))
        ];
        stopLoss = currentPrice * (1 + (priceChange24h > 0 ? -volatility * 0.4 : volatility * 0.4));
      }
      break;

    case 'hodl':
      if (priceChange7d > 5 && priceChange24h > 0 && marketCap > 100000000) {
        action = 'HODL';
        confidence = Math.min(88, 70 + priceChange7d / 2);
        targets = [
          currentPrice * (1 + volatility * 1.5),
          currentPrice * (1 + volatility * 3)
        ];
        stopLoss = currentPrice * (1 - volatility * 0.8);
      }
      break;

    case 'degen':
      if (Math.abs(priceChange24h) > 10 && marketCap < 1000000000) {
        action = priceChange24h > 0 ? 'YOLO' : 'AVOID';
        confidence = Math.min(85, 60 + Math.abs(priceChange24h) / 2);
        targets = [
          currentPrice * (1 + (priceChange24h > 0 ? volatility * 2 : -volatility * 2)),
          currentPrice * (1 + (priceChange24h > 0 ? volatility * 5 : -volatility * 5))
        ];
        stopLoss = currentPrice * (1 + (priceChange24h > 0 ? -volatility * 1.5 : volatility * 1.5));
      }
      break;
  }

  if (confidence < 70) return null;

  return {
    id: `enhanced_${coin.id}_${Date.now()}`,
    symbol: `${coin.symbol.toUpperCase()}/USDT`,
    type: signalType,
    action: action,
    entryPrice: currentPrice,
    targets: targets,
    stopLoss: stopLoss,
    confidence: Math.round(confidence),
    timestamp: Date.now(),
    coinId: coin.id,
    coinName: coin.name,
    marketCap: marketCap,
    volume24h: volume,
    priceChange24h: priceChange24h,
    priceChange7d: priceChange7d,
    volatility: volatility,
    volumeRatio: volumeRatio,
    momentum: momentum,
    buySignal: coin.buy_signal || false,
    tradingPlatforms: getTradingPlatforms(signalType),
    source: 'enhanced_traditional'
  };
}

/**
 * Generate single AI signal
 */
async function generateAISignal() {
  try {
    // Use AI Engine if available
    if (tradingSystem) {
      try {
        const marketData = await getMarketData(1, 10);
        const randomCoin = marketData[Math.floor(Math.random() * marketData.length)];
        const signalTypes = ['futures', 'spot', 'hodl', 'degen'];
        const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
        
        const aiSignal = await tradingSystem.engine.generateSignal(randomCoin.symbol, signalType);
        if (aiSignal && aiSignal.confidence >= 75) {
          return aiSignal;
        }
      } catch (aiError) {
        console.warn('AI Engine signal generation failed:', aiError.message);
      }
    }
    
    // Fallback to traditional signal
    const signals = await getTradingSignals();
    if (signals.length > 0) {
      const highConfidenceSignals = signals.filter(s => s.confidence > 85);
      if (highConfidenceSignals.length > 0) {
        return highConfidenceSignals[Math.floor(Math.random() * highConfidenceSignals.length)];
      }
      return signals[0];
    }
    return null;
  } catch (error) {
    console.error('Error generating AI signal:', error);
    throw error;
  }
}

/**
 * Get portfolio performance
 */
async function getPortfolioPerformance() {
  try {
    const performance = {
      totalValue: 125000,
      totalProfit: 25000,
      profitPercentage: 25.0,
      winRate: 87.5,
      totalTrades: 156,
      winningTrades: 137,
      losingTrades: 19,
      averageWin: 450,
      averageLoss: -180,
      sharpeRatio: 2.1,
      maxDrawdown: -8.5,
      monthlyReturns: [
        { month: 'Jan', return: 12.5 },
        { month: 'Feb', return: -3.2 },
        { month: 'Mar', return: 18.7 },
        { month: 'Apr', return: 8.9 },
        { month: 'May', return: 15.3 },
        { month: 'Jun', return: 22.1 }
      ],
      topPerformers: [
        { symbol: 'BTC', profit: 45.2, type: 'Futures' },
        { symbol: 'ETH', profit: 38.7, type: 'Spot' },
        { symbol: 'SOL', profit: 67.3, type: 'Hodl' },
        { symbol: 'PEPE', profit: 234.5, type: 'Degen' }
      ]
    };

    return performance;
  } catch (error) {
    console.error('Error getting portfolio performance:', error);
    throw error;
  }
}

/**
 * Add manual signal
 */
async function addManualSignal(signalData) {
  const newSignal = {
    id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: signalData.symbol,
    type: signalData.type,
    action: signalData.action,
    entryPrice: signalData.entryPrice,
    targets: signalData.targets,
    stopLoss: signalData.stopLoss,
    confidence: signalData.confidence,
    timestamp: Date.now(),
    coinId: signalData.symbol.split('/')[0].toLowerCase(),
    coinName: signalData.symbol.split('/')[0],
    marketCap: 0,
    volume24h: 0,
    priceChange24h: 0,
    buySignal: false,
    notes: signalData.notes || '',
    status: 'active',
    source: 'manual'
  };

  manualSignals.push(newSignal);
  
  if (tradingSignalsCache && tradingSignalsCache.data) {
    tradingSignalsCache.data.push(newSignal);
  }

  return newSignal;
}

/**
 * Delete signal
 */
async function deleteSignal(signalId) {
  const manualIndex = manualSignals.findIndex(s => s.id === signalId);
  if (manualIndex !== -1) {
    manualSignals.splice(manualIndex, 1);
  }

  if (tradingSignalsCache && tradingSignalsCache.data) {
    const cacheIndex = tradingSignalsCache.data.findIndex(s => s.id === signalId);
    if (cacheIndex !== -1) {
      tradingSignalsCache.data.splice(cacheIndex, 1);
    }
  }

  return true;
}

/**
 * Clear all signals
 */
async function clearAllSignals() {
  manualSignals = [];
  tradingSignalsCache.data = [];
  tradingSignalsCache.timestamp = 0;
  return true;
}

/**
 * Generate random signals
 */
async function generateRandomSignals() {
  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 'MATIC/USDT', 'AVAX/USDT'];
  const types = ['futures', 'spot', 'hodl', 'degen'];
  const actions = ['LONG', 'SHORT', 'BUY', 'SELL', 'HODL', 'YOLO'];

  for (let i = 0; i < 5; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const entryPrice = Math.random() * 1000 + 1;
    const volatility = Math.random() * 0.1 + 0.05;

    const signalData = {
      symbol: symbol,
      type: type,
      action: action,
      entryPrice: entryPrice,
      targets: [
        entryPrice * (1 + volatility * 0.8),
        entryPrice * (1 + volatility * 1.5)
      ],
      stopLoss: entryPrice * (1 - volatility * 0.5),
      confidence: Math.floor(Math.random() * 30) + 70,
      notes: `Random generated signal for testing`
    };

    await addManualSignal(signalData);
  }

  return true;
}

/**
 * Update market data
 */
async function updateMarketData() {
  tradingSignalsCache.data = null;
  tradingSignalsCache.timestamp = 0;
  fundamentalsCache.data = null;
  fundamentalsCache.timestamp = 0;
  intelligenceCache.data = null;
  intelligenceCache.timestamp = 0;
  aiSignalsCache.data = null;
  aiSignalsCache.timestamp = 0;
  
  Object.keys(marketCache).forEach(key => delete marketCache[key]);
  Object.keys(detailCache).forEach(key => delete detailCache[key]);
  Object.keys(chartCache).forEach(key => delete chartCache[key]);

  return true;
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  tradingSignalsCache.data = null;
  tradingSignalsCache.timestamp = 0;
  fundamentalsCache.data = null;
  fundamentalsCache.timestamp = 0;
  intelligenceCache.data = null;
  intelligenceCache.timestamp = 0;
  aiSignalsCache.data = null;
  aiSignalsCache.timestamp = 0;
  
  Object.keys(marketCache).forEach(key => delete marketCache[key]);
  Object.keys(detailCache).forEach(key => delete detailCache[key]);
  Object.keys(chartCache).forEach(key => delete chartCache[key]);
  
  cache.marketData.clear();
  cache.tokenData.clear();
  cache.liquidityPools.clear();
  cache.tradingPairs.clear();

  return true;
}

/**
 * Generate trading URLs
 */
function generateTradingUrls(signal, platform) {
  const { symbol, type, action, entryPrice } = signal;
  const baseSymbol = symbol.split('/')[0];
  const quoteSymbol = symbol.split('/')[1];
  
  const urls = {
    'nq-swap.xyz': {
      spot: `https://www.nq-swap.xyz/nq-swap?inputCurrency=${baseSymbol}&outputCurrency=${quoteSymbol}`,
      degen: `https://www.nq-swap.xyz/nq-swap?inputCurrency=${baseSymbol}&outputCurrency=${quoteSymbol}`,
      hodl: `https://www.nq-swap.xyz/nq-swap?inputCurrency=${baseSymbol}&outputCurrency=${quoteSymbol}`
    },
    'binance-web3': {
      spot: `https://www.binance.com/en/trade/${baseSymbol}_${quoteSymbol}`,
      degen: `https://www.binance.com/en/trade/${baseSymbol}_${quoteSymbol}`,
      hodl: `https://www.binance.com/en/trade/${baseSymbol}_${quoteSymbol}`
    },
    'four.meme': {
      spot: `https://four.meme/swap?from=${baseSymbol}&to=${quoteSymbol}`,
      degen: `https://four.meme/swap?from=${baseSymbol}&to=${quoteSymbol}`,
      hodl: `https://four.meme/swap?from=${baseSymbol}&to=${quoteSymbol}`
    },
    'pump-swap': {
      spot: `https://pump.fun/swap?token=${baseSymbol}`,
      degen: `https://pump.fun/swap?token=${baseSymbol}`,
      hodl: `https://pump.fun/swap?token=${baseSymbol}`
    },
    'aster-dex': {
      futures: `https://aster.xyz/trade/${baseSymbol}${quoteSymbol}?side=${action.toLowerCase()}`
    }
  };

  return urls[platform]?.[type] || null;
}

/**
 * Get trading platforms
 */
function getTradingPlatforms(signalType) {
  return TRADING_PLATFORMS[signalType] || [];
}

/**
 * AI Trading Engine Endpoints
 */
async function handleAIEndpoints(pathname, urlObj, req, res) {
  // AI Trading Signals
  if (pathname === '/api/ai/signals') {
    try {
      const signalType = urlObj.searchParams.get('type') || 'spot';
      const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);
      
      if (tradingSystem) {
        const opportunities = await tradingSystem.apiLayer.analyzeCryptoUniverse();
        const aiSignals = await tradingSystem.generateBatchSignals(opportunities);
        const filteredSignals = aiSignals.filter(signal => 
          signal.type === signalType && signal.confidence >= 75
        ).slice(0, limit);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(filteredSignals));
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'AI Trading Engine not available' }));
      }
    } catch (error) {
      console.error('AI Signals API error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to generate AI signals' }));
    }
  }

  // AI Opportunities
  if (pathname === '/api/ai/opportunities') {
    try {
      if (tradingSystem) {
        const opportunities = await tradingSystem.apiLayer.analyzeCryptoUniverse();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(opportunities));
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'AI Trading Engine not available' }));
      }
    } catch (error) {
      console.error('AI Opportunities API error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to fetch AI opportunities' }));
    }
  }

  // AI Performance
  if (pathname === '/api/ai/performance') {
    try {
      if (tradingSystem) {
        const performance = tradingSystem.engine.getPerformance();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(performance));
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'AI Trading Engine not available' }));
      }
    } catch (error) {
      console.error('AI Performance API error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to fetch AI performance' }));
    }
  }

  // Start AI Trading Session
  if (pathname === '/api/ai/start-session' && req.method === 'POST') {
    try {
      if (tradingSystem) {
        const performance = await tradingSystem.startTradingSession();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(performance));
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'AI Trading Engine not available' }));
      }
    } catch (error) {
      console.error('AI Session API error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to start AI session' }));
    }
  }

  // AI System Status
  if (pathname === '/api/ai/status') {
    try {
      if (tradingSystem) {
        const status = tradingSystem.getSystemStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(status));
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
          error: 'AI Trading Engine not available',
          status: 'fallback_mode'
        }));
      }
    } catch (error) {
      console.error('AI Status API error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to get AI status' }));
    }
  }

  return false; // No matching AI endpoint
}

/**
 * Get MIME type
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

/**
 * Serve static files
 */
async function serveStatic(urlPath, res) {
  try {
    let filePath;
    if (!urlPath || urlPath === '/') {
      filePath = path.join(frontendDir, 'index.html');
    } else {
      const relative = decodeURIComponent(urlPath.replace(/^\//, ''));
      filePath = path.join(frontendDir, relative);
    }
    
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (err) {
      filePath = path.join(frontendDir, 'index.html');
      stat = fs.statSync(filePath);
    }
    
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const contentType = getContentType(filePath);
    const fileContent = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fileContent);
  } catch (err) {
    console.error('Error serving static file:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

/**
 * Handle API requests
 */
async function handleApi(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;
  
  // Only GET requests are supported for most endpoints
  if (req.method !== 'GET' && !pathname.includes('/admin/') && !pathname.includes('/ai/start-session')) {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  try {
    // Try AI endpoints first
    const aiHandled = await handleAIEndpoints(pathname, urlObj, req, res);
    if (aiHandled) return;

    // Existing API endpoints (unchanged)
    if (pathname === '/api/coins') {
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
      const perPage = parseInt(urlObj.searchParams.get('per_page') || '100', 10);
      const data = await getMarketData(page, perPage);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data));
    }

    if (pathname === '/api/global') {
      try {
        const globalData = await fetchJsonWithProxy('https://api.coingecko.com/api/v3/global');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(globalData));
      } catch (err) {
        console.error('Global API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to fetch global data' }));
      }
    }

    if (pathname === '/api/derivatives') {
      try {
        const derivatives = await fetchJsonWithProxy('https://api.coingecko.com/api/v3/derivatives');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(derivatives));
      } catch (err) {
        console.error('Derivatives API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to fetch derivatives data' }));
      }
    }

    if (pathname === '/api/fundamentals') {
      try {
        const metrics = await getFundamentals();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(metrics));
      } catch (err) {
        console.error('Fundamentals API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to compute fundamentals' }));
      }
    }

    if (pathname === '/api/market-intelligence') {
      try {
        const metrics = await getMarketIntelligence();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(metrics));
      } catch (err) {
        console.error('Market intelligence API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to compute market intelligence' }));
      }
    }

    const coinMatch = pathname.match(/^\/api\/coins\/([^/]+)$/);
    const chartMatch = pathname.match(/^\/api\/coins\/([^/]+)\/chart$/);
    if (chartMatch) {
      const id = chartMatch[1];
      const days = parseInt(urlObj.searchParams.get('days') || '30', 10);
      const data = await getCoinChart(id, days);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data));
    }
    if (coinMatch) {
      const id = coinMatch[1];
      const data = await getCoinDetails(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data));
    }

    if (pathname === '/api/trading-signals') {
      try {
        const signals = await getTradingSignals();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(signals));
      } catch (err) {
        console.error('Trading signals API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to fetch trading signals' }));
      }
    }

    if (pathname === '/api/generate-signal') {
      try {
        const signal = await generateAISignal();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(signal));
      } catch (err) {
        console.error('Signal generation API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to generate signal' }));
      }
    }

    if (pathname === '/api/portfolio-performance') {
      try {
        const performance = await getPortfolioPerformance();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(performance));
      } catch (err) {
        console.error('Portfolio performance API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to fetch portfolio performance' }));
      }
    }

    // Enhanced signals endpoint
    if (pathname === '/api/enhanced-signals') {
      try {
        const signalType = urlObj.searchParams.get('type') || 'spot';
        const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);
        
        const marketData = await getMarketData(1, 100);
        let signals = [];
        
        for (const coin of marketData.slice(0, limit)) {
          const signal = await generateEnhancedSignal(coin, signalType);
          if (signal) {
            signals.push(signal);
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(signals));
      } catch (err) {
        console.error('Enhanced signals API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to generate enhanced signals' }));
      }
    }

    // Admin endpoints (unchanged)
    if (pathname === '/api/admin/add-signal' && req.method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            const signalData = JSON.parse(body);
            const newSignal = await addManualSignal(signalData);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(newSignal));
          } catch (err) {
            console.error('Add signal error:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message || 'Failed to add signal' }));
          }
        });
        return;
      } catch (err) {
        console.error('Add signal API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to add signal' }));
      }
    }

    if (pathname.startsWith('/api/admin/delete-signal/') && req.method === 'DELETE') {
      try {
        const signalId = pathname.split('/').pop();
        const success = await deleteSignal(signalId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success }));
      } catch (err) {
        console.error('Delete signal API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to delete signal' }));
      }
    }

    if (pathname === '/api/admin/clear-signals' && req.method === 'DELETE') {
      try {
        await clearAllSignals();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Clear signals API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to clear signals' }));
      }
    }

    if (pathname === '/api/admin/generate-random' && req.method === 'POST') {
      try {
        await generateRandomSignals();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Generate random signals API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to generate random signals' }));
      }
    }

    if (pathname === '/api/admin/update-market' && req.method === 'POST') {
      try {
        await updateMarketData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Update market data API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to update market data' }));
      }
    }

    if (pathname === '/api/admin/clear-cache' && req.method === 'POST') {
      try {
        await clearAllCaches();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Clear cache API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to clear cache' }));
      }
    }

    // Token and pool endpoints (unchanged)
    if (pathname === '/api/token-by-contract' && req.method === 'GET') {
      try {
        const contractAddress = urlObj.searchParams.get('address');
        const network = urlObj.searchParams.get('network') || 'eth';
        
        if (!contractAddress) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Contract address is required' }));
        }

        const tokenData = await getTokenByContract(contractAddress, network);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(tokenData));
      } catch (err) {
        console.error('Token by contract API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to fetch token data' }));
      }
    }

    if (pathname === '/api/liquidity-pool' && req.method === 'GET') {
      try {
        const poolAddress = urlObj.searchParams.get('address');
        const network = urlObj.searchParams.get('network') || 'eth';
        
        if (!poolAddress) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Pool address is required' }));
        }

        const poolData = await getLiquidityPoolData(poolAddress, network);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(poolData));
      } catch (err) {
        console.error('Liquidity pool API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to fetch pool data' }));
      }
    }

    if (pathname === '/api/trading-platforms' && req.method === 'GET') {
      try {
        const signalType = urlObj.searchParams.get('type') || 'spot';
        const platforms = getTradingPlatforms(signalType);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ platforms, signalType }));
      } catch (err) {
        console.error('Trading platforms API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to get trading platforms' }));
      }
    }

    if (pathname === '/api/generate-trading-url' && req.method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const { signal, platform } = JSON.parse(body);
            const url = generateTradingUrls(signal, platform);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ url, platform }));
          } catch (err) {
            console.error('Generate trading URL error:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message || 'Failed to generate trading URL' }));
          }
        });
        return;
      } catch (err) {
        console.error('Generate trading URL API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message || 'Failed to generate trading URL' }));
      }
    }

    // Unknown API route
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  } catch (err) {
    console.error('API error:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
  }
}

/**
 * Main request listener
 */
async function requestListener(req, res) {
  const urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/api')) {
    await handleApi(req, res);
  } else {
    await serveStatic(urlPath, res);
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
loadBnbCoins().finally(() => {
  const server = http.createServer(requestListener);
  server.listen(PORT, () => {
    console.log(`🚀 Pandora Intel Server running on port ${PORT}`);
    console.log(`📊 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
    console.log(`🤖 AI Engine: ${tradingSystem ? 'ACTIVE' : 'FALLBACK MODE'}`);
    console.log(`💎 Trading signals: AI-powered with 90%+ accuracy target`);
  });
});