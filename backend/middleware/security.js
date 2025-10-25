// Enterprise Security Middleware
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Rate limiting middleware
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// API rate limiting
const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later.'
);

// Trading signals rate limiting (more restrictive)
const signalsRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  20, // 20 requests per window
  'Too many signal requests, please try again later.'
);

// Admin endpoints rate limiting
const adminRateLimit = createRateLimit(
  10 * 60 * 1000, // 10 minutes
  50, // 50 requests per window
  'Too many admin requests, please try again later.'
);

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.coingecko.com", "https://api.geckoterminal.com"],
    },
  },
  crossOriginEmbedderPolicy: false
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://pandora-intel.com',
      'https://www.pandora-intel.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = {
  apiRateLimit,
  signalsRateLimit,
  adminRateLimit,
  securityHeaders,
  cors: cors(corsOptions)
};
