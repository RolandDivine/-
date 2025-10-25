module.exports = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/pandora-intel',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || '',
  BINANCE_API_KEY: process.env.BINANCE_API_KEY || '',
  BINANCE_SECRET_KEY: process.env.BINANCE_SECRET_KEY || '',
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development'
};
