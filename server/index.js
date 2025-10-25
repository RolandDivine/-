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
const logger = require('./utils/logger');
const { swaggerUi, specs } = require('./utils/swagger');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const signalRoutes = require('./routes/signals');
const portfolioRoutes = require('./routes/portfolio');
const tradeRoutes = require('./routes/trades');
const marketRoutes = require('./routes/market');
const aiRoutes = require('./routes/ai');

const TradingSignal = require('./models/TradingSignal');
const User = require('./models/User');
const Portfolio = require('./models/Portfolio');
const Trade = require('./models/Trade');

const { generateAISignals } = require('./services/aiService');
const { updateMarketData } = require('./services/marketService');
const { calculatePortfolioMetrics } = require('./services/portfolioService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pandora-intel', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('MongoDB connected'))
.catch(err => logger.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Pandora Intel API Documentation'
}));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
  });

  // Join signal room for real-time updates
  socket.on('join-signals', () => {
    socket.join('signals');
  });

  // Join market data room
  socket.on('join-market', () => {
    socket.join('market');
  });

  socket.on('disconnect', () => {
    logger.info('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Scheduled tasks - DISABLED to prevent rate limiting issues
// Uncomment these when you have proper API keys and want to enable them

// // Generate new AI signals every 5 minutes
// cron.schedule('*/5 * * * *', async () => {
//   try {
//     logger.info('Generating new AI signals...');
//     const signals = await generateAISignals();
//     
//     // Save signals to database
//     for (const signal of signals) {
//       const newSignal = new TradingSignal(signal);
//       await newSignal.save();
//     }
//     
//     // Emit to all connected clients
//     io.to('signals').emit('new-signals', signals);
//     logger.info(`Generated ${signals.length} new signals`);
//   } catch (error) {
//     logger.error('Error generating signals:', error);
//   }
// });

// // Update market data every 30 seconds
// cron.schedule('*/30 * * * * *', async () => {
//   try {
//     const marketData = await updateMarketData();
//     io.to('market').emit('market-update', marketData);
//   } catch (error) {
//     logger.error('Error updating market data:', error);
//   }
// });

// // Update portfolio metrics every minute
// cron.schedule('* * * * *', async () => {
//   try {
//     const users = await User.find({});
//     for (const user of users) {
//       const portfolio = await Portfolio.findOne({ userId: user._id });
//       if (portfolio) {
//         const metrics = await calculatePortfolioMetrics(portfolio);
//         io.to(`user-${user._id}`).emit('portfolio-update', metrics);
//       }
//     }
//   } catch (error) {
//     logger.error('Error updating portfolio metrics:', error);
//   }
// });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Pandora Intel server running on port ${PORT}`);
});
