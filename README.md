# Pandora Intel - AI Trading Platform

A comprehensive AI-powered cryptocurrency trading platform that provides intelligent trading signals for Quick Futures, Spot Trades, Hodl Trades, and Degen Alerts.

## 🚀 Features

### Core Functionality
- **AI-Powered Signals**: Machine learning algorithms generate high-confidence trading signals
- **Multiple Trading Strategies**: 
  - Quick Futures (4-8 hour timeframes)
  - Spot Trades (1-3 day timeframes) 
  - Hodl Trades (7-30 day timeframes)
  - Degen Alerts (1-6 hour timeframes)
- **Real-time Market Data**: Live cryptocurrency prices and market metrics
- **Portfolio Tracking**: Comprehensive portfolio analytics and performance metrics
- **Risk Management**: Advanced risk assessment and position sizing
- **WebSocket Integration**: Real-time updates and live data streaming

### Technical Features
- **Modern React Frontend**: Built with React 18, React Router, and modern hooks
- **Node.js Backend**: Express server with MongoDB database
- **Real-time Communication**: Socket.io for live updates
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark Theme**: Professional dark UI optimized for trading
- **Authentication**: Secure JWT-based authentication system

## 🛠️ Tech Stack

### Frontend
- React 18
- React Router DOM
- React Query (TanStack Query)
- Socket.io Client
- Recharts (for data visualization)
- Framer Motion (for animations)
- React Hot Toast (for notifications)
- React Icons
- Styled Components

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io
- JWT Authentication
- Bcrypt for password hashing
- Axios for HTTP requests
- Node-cron for scheduled tasks

### External APIs
- CoinGecko API (market data)
- Real-time cryptocurrency prices
- Market metrics and derivatives data

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pandora-intel
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd server
   npm install
   
   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the server directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/pandora-intel
   JWT_SECRET=your-super-secret-jwt-key-here
   CLIENT_URL=http://localhost:3000
   COINGECKO_API_KEY=your-coingecko-api-key
   PORT=5000
   NODE_ENV=development
   ```

4. **Start the development servers**
   ```bash
   # From the root directory
   npm run dev
   ```
   
   This will start both the backend (port 5000) and frontend (port 3000) servers.

## 🏗️ Project Structure

```
pandora-intel/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, Socket, Theme)
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   └── App.js
│   └── package.json
├── server/                 # Node.js backend
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── middleware/        # Custom middleware
│   └── index.js
└── package.json
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Signals
- `GET /api/signals` - Get trading signals
- `GET /api/signals/:id` - Get signal by ID
- `GET /api/signals/type/:type` - Get signals by type
- `GET /api/signals/active/all` - Get active signals
- `GET /api/signals/stats/overview` - Get signal statistics

### Portfolio
- `GET /api/portfolio` - Get user portfolio
- `GET /api/portfolio/performance` - Get performance data
- `GET /api/portfolio/allocation` - Get allocation data
- `GET /api/portfolio/positions` - Get positions

### Trades
- `GET /api/trades` - Get user trades
- `POST /api/trades` - Create new trade
- `POST /api/trades/:id/execute` - Execute trade
- `POST /api/trades/:id/cancel` - Cancel trade

### Market Data
- `GET /api/market/overview` - Get market overview
- `GET /api/market/ticker` - Get ticker data
- `GET /api/market/data` - Get market data
- `GET /api/market/coins/:id` - Get coin details

## 🎨 UI Components

### Layout Components
- `Layout` - Main application layout
- `Sidebar` - Navigation sidebar
- `Header` - Top navigation header

### Trading Components
- `SignalCard` - Trading signal display
- `PortfolioSummary` - Portfolio overview
- `PerformanceChart` - Performance visualization
- `MarketTicker` - Live market ticker

### Authentication
- `Login` - User login page
- `Register` - User registration page
- `ProtectedRoute` - Route protection wrapper

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Helmet.js for security headers

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB database (MongoDB Atlas recommended)
2. Configure environment variables
3. Deploy to your preferred platform (Heroku, AWS, DigitalOcean, etc.)

### Frontend Deployment
1. Build the React application: `npm run build`
2. Deploy to static hosting (Netlify, Vercel, AWS S3, etc.)
3. Update API URLs in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the GitHub repository.

---

**Pandora Intel** - Your gateway to intelligent cryptocurrency trading.
