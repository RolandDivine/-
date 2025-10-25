// Fixed Pandora Intel Backend Server
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Frontend directory
const frontendDir = path.resolve(__dirname, '../intel_redesign');

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

// Enhanced cache for live data
let cache = {
  marketData: new Map(),
  tokenData: new Map(),
  priceData: new Map(),
  lastUpdate: 0
};

// CoinGecko API configuration
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 30000; // 30 seconds

// GeckoTerminal API configuration
const GECKOTERMINAL_BASE = 'https://api.geckoterminal.com/api/v2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Serve static files
async function serveStatic(urlPath, res) {
  let filePath;
  
  if (urlPath === '/' || urlPath === '/index.html') {
    filePath = path.join(frontendDir, 'index.html');
  } else if (urlPath === '/enterprise-dashboard.html') {
    filePath = path.join(frontendDir, 'enterprise-dashboard.html');
  } else {
    filePath = path.join(frontendDir, urlPath);
  }
  
  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    let contentType = 'text/html';
    if (ext === '.css') contentType = 'text/css';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.json') contentType = 'application/json';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - File Not Found</h1>');
  }
}

// Fetch live data from CoinGecko
async function fetchCoinGeckoData(endpoint, useCache = true) {
  const cacheKey = endpoint;
  const now = Date.now();
  
  // Check cache first
  if (useCache && cache.marketData.has(cacheKey)) {
    const cached = cache.marketData.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }
  
  try {
    const url = `${COINGECKO_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PandoraIntel/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    cache.marketData.set(cacheKey, {
      data: data,
      timestamp: now
    });
    
    return data;
  } catch (error) {
    console.error('CoinGecko fetch error:', error);
    // Return cached data if available, even if stale
    if (cache.marketData.has(cacheKey)) {
      return cache.marketData.get(cacheKey).data;
    }
    throw error;
  }
}

// Fetch price from GeckoTerminal
async function fetchPriceFromGeckoTerminal(symbolOrContract) {
  try {
    // Try as a symbol first; GeckoTerminal often needs contract address or pool address
    // For now, handle as Ethereum address or common pool structure (demo logic)
    // Replace pool/contract logic as your asset list structure grows
    const url = `${GECKOTERMINAL_BASE}/search?query=${symbolOrContract}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed GeckoTerminal');
    const data = await res.json();
    if (data && data.data && data.data.length > 0) {
      const token = data.data.find(x => x.type === 'token' && x.attributes?.symbol?.toUpperCase() === symbolOrContract.toUpperCase());
      if (token && token.attributes) {
        return {
          symbol: token.attributes.symbol,
          price: token.attributes.price_usd ? Number(token.attributes.price_usd) : undefined,
          marketCap: token.attributes.market_cap_usd ? Number(token.attributes.market_cap_usd) : undefined,
          volume24h: token.attributes.volume_usd_h24 ? Number(token.attributes.volume_usd_h24) : undefined,
          change24h: token.attributes.price_percent_change_h24 ? Number(token.attributes.price_percent_change_h24) : undefined,
        };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Get live market data
async function getLiveMarketData() {
  try {
    const [globalData, trendingData] = await Promise.all([
      fetchCoinGeckoData('/global'),
      fetchCoinGeckoData('/search/trending')
    ]);
    
    return {
      totalMarketCap: globalData.data.total_market_cap.usd,
      totalVolume: globalData.data.total_volume.usd,
      activeCryptocurrencies: globalData.data.active_cryptocurrencies,
      marketCapChange24h: globalData.data.market_cap_change_percentage_24h_usd,
      volumeChange24h: globalData.data.total_volume.usd / globalData.data.total_volume.usd_24h_percentage,
      fearGreedIndex: globalData.data.fear_greed_index || 50,
      trending: trendingData.coins.slice(0, 5).map(coin => ({
        id: coin.item.id,
        name: coin.item.name,
        symbol: coin.item.symbol,
        marketCap: coin.item.market_cap_rank,
        priceChange24h: coin.item.price_change_percentage_24h
      }))
    };
  } catch (error) {
    console.error('Error fetching live market data:', error);
    return null;
  }
}

// Get live token prices
async function getLiveTokenPrices(symbols = ['bitcoin','ethereum','solana','cardano','polkadot']) {
  const result = [];
  const notFoundSymbols = [];
  try {
    const ids = symbols.join(',');
    const cgData = await fetchCoinGeckoData(`/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`);
    for (const s of symbols) {
      if (cgData[s]) {
        result.push({
          id: s,
          symbol: s.toUpperCase(),
          price: cgData[s].usd,
          change24h: cgData[s].usd_24h_change,
          marketCap: cgData[s].usd_market_cap,
          volume24h: cgData[s].usd_24h_vol
        });
      } else {
        notFoundSymbols.push(s);
      }
    }
  } catch (e) {
    // If CG fails, try everything on GT below
    notFoundSymbols.push(...symbols);
  }
  // Fetch missing from GeckoTerminal
  for (const s of notFoundSymbols) {
    const gt = await fetchPriceFromGeckoTerminal(s);
    if (gt) result.push(gt);
    else result.push({ symbol: s.toUpperCase(), price: null, change24h: null, marketCap: null, volume24h: null });
  }
  return result;
}

// API endpoints
async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  try {
    // Health check
    if (pathname === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }));
      return;
    }
    
    // Portfolio performance
    if (pathname === '/api/portfolio-performance') {
      try {
        const liveData = await getLiveMarketData();
        const data = {
          totalValue: 125000,
          totalProfit: 25000,
          winRate: 78.5,
          totalTrades: 156,
          profitLoss: 25000,
          returnPercentage: 25.0,
          accuracy: 87.3,
          marketCap: liveData?.totalMarketCap || 2500000000000,
          volume24h: liveData?.totalVolume || 150000000000,
          fearGreedIndex: liveData?.fearGreedIndex || 65
        };
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      } catch (error) {
        // Fallback to static data
        const data = {
          totalValue: 125000,
          totalProfit: 25000,
          winRate: 78.5,
          totalTrades: 156,
          profitLoss: 25000,
          returnPercentage: 25.0,
          accuracy: 87.3
        };
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }
    }
    
    // Trading signals
    if (pathname === '/api/trading-signals') {
      try {
        const signals = await generateTradingSignals();
        res.writeHead(200);
        res.end(JSON.stringify(signals));
        return;
      } catch (error) {
        console.error('Error generating trading signals:', error);
        const signals = generateStaticSignals();
        res.writeHead(200);
        res.end(JSON.stringify(signals));
        return;
      }
    }
    
    // Market overview
    if (pathname === '/api/market-overview') {
      try {
        const liveData = await getLiveMarketData();
        const data = {
          totalMarketCap: liveData?.totalMarketCap || 2500000000000,
          totalVolume: liveData?.totalVolume || 150000000000,
          activeCryptocurrencies: liveData?.activeCryptocurrencies || 8500,
          marketCapChange24h: liveData?.marketCapChange24h || 2.5,
          volumeChange24h: liveData?.volumeChange24h || 5.2,
          fearGreedIndex: liveData?.fearGreedIndex || 65,
          trending: liveData?.trending || []
        };
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      } catch (error) {
        // Fallback to static data
        const data = {
          totalMarketCap: 2500000000000,
          totalVolume: 150000000000,
          activeCryptocurrencies: 8500,
          marketCapChange24h: 2.5,
          volumeChange24h: 5.2
        };
        res.writeHead(200);
        res.end(JSON.stringify(data));
        return;
      }
    }

    // Live asset metrics for dashboard, hero, etc.
    if (pathname === '/api/asset-metrics') {
      try {
        // Accept ?symbols=bitcoin,ethereum,solana (default major assets)
        const query = url.searchParams;
        const symbols = query.get('symbols') ? query.get('symbols').split(',') : ['bitcoin','ethereum','solana','cardano','polkadot'];
        const prices = await getLiveTokenPrices(symbols);
        res.writeHead(200);
        res.end(JSON.stringify(prices));
        return;
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({error:'Failed to fetch asset metrics'}));
        return;
      }
    }

    // Simulated portfolio endpoint
    if (pathname === '/api/portfolio') {
      // In production, use authenticated user session and persistent db...
      // For demo, simulate a portfolio with current and historic trades:
      const portfolio = {
        balance: 25000,
        trades: [
          {
            id: 1,
            asset: 'BTC/USDT',
            type: 'futures',
            direction: 'LONG',
            entry: 41000,
            entryTime: Date.now()-3*24*3600*1000, // 3d ago
            exit: 45150,
            exitTime: Date.now()-1*24*3600*1000,
            result: 'win',
            pnl: 4150,
          },
          {
            id: 2,
            asset: 'ETH/USDT',
            type: 'spot',
            direction: 'BUY',
            entry: 3200,
            entryTime: Date.now()-7*24*3600*1000,
            exit: 3385,
            exitTime: Date.now()-2*24*3600*1000,
            result: 'win',
            pnl: 185,
          },
          {
            id: 3,
            asset: 'SOL/USDT',
            type: 'degen',
            direction: 'YOLO',
            entry: 88,
            entryTime: Date.now()-2*24*3600*1000,
            exit: null,
            exitTime: null,
            result: 'open',
            pnl: null,
          }
        ]
      };
      res.writeHead(200);
      res.end(JSON.stringify(portfolio));
      return;
    }
    
    // Fundamentals
    if (pathname === '/api/fundamentals') {
      const data = {
        totalMarketCap: 2500000000000,
        totalVolume: 150000000000,
        activeCryptocurrencies: 8500,
        marketCapChange24h: 2.5,
        volumeChange24h: 5.2,
        fearGreedIndex: 65,
        dominance: {
          bitcoin: 45.2,
          ethereum: 18.7,
          others: 36.1
        }
      };
      res.writeHead(200);
      res.end(JSON.stringify(data));
      return;
    }
    
    // Analytics
    if (pathname === '/api/analytics') {
      const data = {
        totalSignals: 245,
        successfulSignals: 214,
        accuracy: 87.3,
        profitLoss: 25000,
        totalProfit: 35000,
        totalLoss: 10000,
        winRate: 78.5,
        avgReturn: 12.5,
        sharpeRatio: 1.8,
        maxDrawdown: -8.2
      };
      res.writeHead(200);
      res.end(JSON.stringify(data));
      return;
    }
    
    // AI Performance
    if (pathname === '/api/ai/performance') {
      const data = {
        totalSignals: 245,
        successfulSignals: 214,
        accuracy: 87.3,
        profitLoss: 25000,
        totalProfit: 35000,
        totalLoss: 10000,
        models: [
          { name: 'trend', status: 'active' },
          { name: 'volatility', status: 'active' },
          { name: 'sentiment', status: 'active' },
          { name: 'risk', status: 'active' }
        ]
      };
      res.writeHead(200);
      res.end(JSON.stringify(data));
      return;
    }
    
    // Market intelligence
    if (pathname === '/api/market-intelligence') {
      const data = {
        fearGreedIndex: 65,
        marketSentiment: 'bullish',
        volatility: 'medium',
        trend: 'upward'
      };
      res.writeHead(200);
      res.end(JSON.stringify(data));
      return;
    }
    
    // 404 for unknown API endpoints
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
    
  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Generate trading signals with live prices
async function generateTradingSignals() {
  try {
    const livePrices = await getLiveTokenPrices(['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot']);
    const signals = [];
    const types = ['futures', 'spot', 'hodl', 'degen'];
    const actions = ['LONG', 'SHORT', 'BUY', 'SELL', 'HODL', 'YOLO'];
    
    for (let i = 0; i < 10; i++) {
      const token = livePrices[i % livePrices.length];
      const entryPrice = token?.price || (45000 + (Math.random() - 0.5) * 1000);
      const priceChange = token?.change24h || 0;
      
      signals.push({
        id: `signal_${Date.now()}_${i}`,
        symbol: `${token?.symbol || 'BTC'}/USDT`,
        type: types[i % types.length],
        action: actions[i % actions.length],
        entryPrice: entryPrice,
        targets: [entryPrice * 1.02, entryPrice * 1.05],
        stopLoss: entryPrice * 0.98,
        confidence: Math.max(70, 100 + priceChange), // Higher confidence for positive price changes
        timestamp: Date.now() - Math.random() * 3600000,
        status: 'active',
        priceChange24h: priceChange,
        marketCap: token?.marketCap,
        volume24h: token?.volume24h
      });
    }
    
    return signals;
  } catch (error) {
    console.error('Error generating signals with live data:', error);
    // Fallback to static signals
    return generateStaticSignals();
  }
}

// Fallback static signal generation
function generateStaticSignals() {
  const signals = [];
  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'DOT/USDT'];
  const types = ['futures', 'spot', 'hodl', 'degen'];
  const actions = ['LONG', 'SHORT', 'BUY', 'SELL', 'HODL', 'YOLO'];
  
  for (let i = 0; i < 10; i++) {
    signals.push({
      id: `signal_${Date.now()}_${i}`,
      symbol: symbols[i % symbols.length],
      type: types[i % types.length],
      action: actions[i % actions.length],
      entryPrice: 45000 + (Math.random() - 0.5) * 1000,
      targets: [46000, 47000],
      stopLoss: 44000,
      confidence: 70 + Math.random() * 30,
      timestamp: Date.now() - Math.random() * 3600000,
      status: 'active'
    });
  }
  
  return signals;
}

// Main request handler
async function requestListener(req, res) {
  const urlPath = req.url.split('?')[0];
  
  if (urlPath.startsWith('/api')) {
    await handleApi(req, res);
  } else {
    await serveStatic(urlPath, res);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
const server = http.createServer(requestListener);

server.listen(PORT, () => {
  console.log(`🚀 Pandora Intel Server running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;
