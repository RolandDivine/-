// Enterprise Configuration for Pandora Intel
const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  },

  // API Configuration
  api: {
    coingecko: {
      baseUrl: 'https://api.coingecko.com/api/v3',
      rateLimit: 50, // requests per minute
      timeout: 10000
    },
    geckoterminal: {
      baseUrl: 'https://api.geckoterminal.com/api/v2',
      rateLimit: 100,
      timeout: 8000
    }
  },

  // Cache Configuration
  cache: {
    defaultTTL: 30000, // 30 seconds
    maxSize: 1000,
    cleanupInterval: 300000 // 5 minutes
  },

  // Security Configuration
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json'
  }
};

module.exports = config;
