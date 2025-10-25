const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const Redis = require('ioredis');
const redisAdapter = require('socket.io-redis');

// Security & Monitoring
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const responseTime = require('response-time');

const logger = require('./utils/logger');
const { swaggerUi, specs } = require('./utils/swagger');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const validateEnv = require('./utils/envValidator');

require('dotenv').config();

// Validate required environment variables
validateEnv();

const authRoutes = require('./routes/auth');
const signalRoutes = require('./routes/signals');
const portfolioRoutes = require('./routes/portfolio');
const tradeRoutes = require('./routes/trades');
const marketRoutes = require('./routes/market');
const aiRoutes = require('./routes/ai');

// Clustering for better performance in production
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  const numCPUs = os.cpus().length;
  logger.info(`Master ${process.pid} is running. Forking ${numCPUs} workers...`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died. Forking new worker...`);
    cluster.fork();
  });
  
  return;
}

const app = express();
const server = http.createServer(app);

// Redis configuration for Socket.IO scaling
let redisClient;
let io;

try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    
    io = socketIo(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      adapter: redisAdapter({
        pubClient: redisClient,
        subClient: redisClient.duplicate()
      })
    });
    
    logger.info('Redis adapter configured for Socket.IO');
  } else {
    io = socketIo(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    logger.info('Using in-memory Socket.IO adapter');
  }
} catch (error) {
  logger.error('Socket.IO initialization error:', error);
  process.exit(1);
}

// Enhanced Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(responseTime()); // Response time tracking

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting with different strategies
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // stricter limit for auth endpoints
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/', generalLimiter);

// Body parsing with limits
app.use(express.json({ 
  limit: process.env.MAX_JSON_SIZE || '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_URLENCODED_SIZE || '10mb'
}));

// Security middleware
app.use(mongoSanitize()); // NoSQL injection protection
app.use(xss()); // XSS protection
app.use(hpp()); // HTTP parameter pollution protection

// Request logging
app.use(requestLogger);

// Database connection with enhanced options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  bufferMaxEntries: 0
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pandora-intel', mongooseOptions)
.then(() => {
  logger.info('MongoDB connected successfully');
  
  // Set mongoose debug mode based on environment
  mongoose.set('debug', process.env.NODE_ENV === 'development');
})
.catch(err => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server first to stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed.');
    });
    
    // Close Socket.IO connections
    if (io) {
      io.close(() => {
        logger.info('Socket.IO server closed.');
      });
    }
    
    // Close Redis connection if exists
    if (redisClient) {
      redisClient.disconnect();
      logger.info('Redis connection closed.');
    }
    
    // Close MongoDB connection
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed.');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Listen for shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ai', aiRoutes);

// Enhanced Health check
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisClient ? redisClient.status : 'not_configured'
  };
  
  // If database is not connected, return 503
  if (mongoose.connection.readyState !== 1) {
    healthCheck.status = 'ERROR';
    return res.status(503).json(healthCheck);
  }
  
  res.json(healthCheck);
});

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Pandora Intel API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true,
  index: false
}));

// Catch all handler for SPA
app.get('*', (req, res) => {
  // Don't serve HTML for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0'
  });
});

// Socket.IO connection handling with authentication
io.use(require('./middleware/socketAuth')); // Add socket authentication middleware

io.on('connection', (socket) => {
  logger.info('User connected:', socket.id, socket.userId ? `User: ${socket.userId}` : '');

  // Join user to their personal room if authenticated
  if (socket.userId) {
    socket.join(`user-${socket.userId}`);
  }

  // Join signal room for real-time updates
  socket.on('join-signals', () => {
    socket.join('signals');
  });

  // Join market data room
  socket.on('join-market', () => {
    socket.join('market');
  });

  // Handle socket errors
  socket.on('error', (error) => {
    logger.error('Socket error:', error);
  });

  socket.on('disconnect', (reason) => {
    logger.info(`User disconnected: ${socket.id}, Reason: ${reason}`);
  });
});

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  req.redis = redisClient;
  next();
});

// Enhanced cron jobs with error handling and locking
if (process.env.ENABLE_CRON_JOBS === 'true') {
  // Generate new AI signals every 5 minutes with distributed lock
  cron.schedule('*/5 * * * *', async () => {
    try {
      if (redisClient) {
        // Use Redis lock to prevent multiple workers from running the same job
        const lockKey = 'cron:generateAISignals';
        const lock = await redisClient.set(lockKey, 'locked', 'PX', 60000, 'NX'); // 1 minute lock
        
        if (!lock) {
          logger.debug('AI signals generation skipped - already running in another worker');
          return;
        }
      }
      
      logger.info('Generating new AI signals...');
      const signals = await generateAISignals();
      
      // Save signals to database
      for (const signal of signals) {
        const newSignal = new TradingSignal(signal);
        await newSignal.save();
      }
      
      // Emit to all connected clients
      io.to('signals').emit('new-signals', signals);
      logger.info(`Generated ${signals.length} new signals`);
      
    } catch (error) {
      logger.error('Error generating signals:', error);
    }
  }, {
    timezone: "UTC"
  });

  // Update market data every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const marketData = await updateMarketData();
      io.to('market').emit('market-update', marketData);
    } catch (error) {
      logger.error('Error updating market data:', error);
    }
  }, {
    timezone: "UTC"
  });
}

// Global error handler (should be last middleware)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`Pandora Intel server (Worker ${process.pid}) running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = { app, server, io }; // For testing