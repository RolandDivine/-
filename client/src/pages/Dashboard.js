import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  FiTrendingUp, 
  FiDollarSign, 
  FiPieChart, 
  FiActivity,
  FiArrowUp,
  FiArrowDown,
  FiRefreshCw
} from 'react-icons/fi';
import { useSocket } from '../contexts/SocketContext';
import { signalsAPI, portfolioAPI, marketAPI } from '../services/api';
import SignalCard from '../components/Signals/SignalCard';
import PerformanceChart from '../components/Charts/PerformanceChart';
import PortfolioSummary from '../components/Portfolio/PortfolioSummary';
import MarketTicker from '../components/Market/MarketTicker';
import './Dashboard.css';

function Dashboard() {
  const { socket } = useSocket();
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  // Fetch dashboard data
  const { data: portfolioData, refetch: refetchPortfolio } = useQuery(
    'portfolio-summary',
    () => portfolioAPI.getSummary(),
    { refetchInterval: 30000 }
  );

  const { data: signalsData, refetch: refetchSignals } = useQuery(
    'active-signals',
    () => signalsAPI.getActiveSignals({ limit: 6 }),
    { refetchInterval: 10000 }
  );

  const { data: marketData } = useQuery(
    'market-overview',
    () => marketAPI.getOverview(),
    { refetchInterval: 60000 }
  );

  // Socket listeners
  useEffect(() => {
    if (socket) {
      socket.on('new-signals', () => {
        refetchSignals();
      });

      socket.on('portfolio-update', () => {
        refetchPortfolio();
      });

      socket.on('market-update', () => {
        // Handle market updates
      });

      return () => {
        socket.off('new-signals');
        socket.off('portfolio-update');
        socket.off('market-update');
      };
    }
  }, [socket, refetchSignals, refetchPortfolio]);

  const portfolio = portfolioData?.data?.summary || {};
  const signals = signalsData?.data?.signals || [];
  const market = marketData?.data || {};

  const stats = [
    {
      title: 'Total Value',
      value: `$${portfolio.totalValue?.toLocaleString() || '0'}`,
      change: portfolio.totalReturn || 0,
      icon: FiDollarSign,
      color: 'primary'
    },
    {
      title: 'Daily P&L',
      value: `$${portfolio.dailyPnL?.toLocaleString() || '0'}`,
      change: portfolio.dailyPnL || 0,
      icon: FiTrendingUp,
      color: portfolio.dailyPnL >= 0 ? 'success' : 'danger'
    },
    {
      title: 'Win Rate',
      value: `${portfolio.winRate || 0}%`,
      change: 0,
      icon: FiPieChart,
      color: 'info'
    },
    {
      title: 'Sharpe Ratio',
      value: portfolio.sharpeRatio || 0,
      change: 0,
      icon: FiActivity,
      color: 'warning'
    }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's your trading overview.</p>
        </div>
        <div className="dashboard-actions">
          <select 
            className="timeframe-select"
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
          >
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
          </select>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              refetchPortfolio();
              refetchSignals();
            }}
          >
            <FiRefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`stat-card stat-card-${stat.color}`}>
              <div className="stat-header">
                <div className="stat-icon">
                  <Icon size={24} />
                </div>
                <div className="stat-title">{stat.title}</div>
              </div>
              <div className="stat-value">{stat.value}</div>
              {stat.change !== 0 && (
                <div className={`stat-change ${stat.change >= 0 ? 'positive' : 'negative'}`}>
                  {stat.change >= 0 ? <FiArrowUp size={16} /> : <FiArrowDown size={16} />}
                  {Math.abs(stat.change).toFixed(2)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="dashboard-content">
        {/* Left Column */}
        <div className="dashboard-left">
          {/* Performance Chart */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Portfolio Performance</h3>
              <div className="card-actions">
                <button className="btn btn-sm btn-secondary">View Details</button>
              </div>
            </div>
            <div className="chart-container">
              <PerformanceChart timeframe={selectedTimeframe} />
            </div>
          </div>

          {/* Recent Signals */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Recent Signals</h3>
              <div className="card-actions">
                <button className="btn btn-sm btn-secondary">View All</button>
              </div>
            </div>
            <div className="signals-list">
              {signals.length > 0 ? (
                signals.map((signal) => (
                  <SignalCard key={signal._id} signal={signal} compact />
                ))
              ) : (
                <div className="empty-state">
                  <p>No active signals at the moment</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-right">
          {/* Portfolio Summary */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Portfolio Summary</h3>
            </div>
            <PortfolioSummary portfolio={portfolio} />
          </div>

          {/* Market Overview */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Market Overview</h3>
            </div>
            <div className="market-overview">
              <div className="market-stats">
                <div className="market-stat">
                  <div className="market-stat-label">Total Market Cap</div>
                  <div className="market-stat-value">
                    ${market.marketCap?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="market-stat">
                  <div className="market-stat-label">24h Volume</div>
                  <div className="market-stat-value">
                    ${market.volume24h?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="market-stat">
                  <div className="market-stat-label">BTC Dominance</div>
                  <div className="market-stat-value">
                    {market.btcDominance?.toFixed(1) || '0'}%
                  </div>
                </div>
              </div>
              <MarketTicker />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="quick-actions">
              <button className="btn btn-primary w-100 mb-2">
                <FiTrendingUp size={16} />
                View All Signals
              </button>
              <button className="btn btn-secondary w-100 mb-2">
                <FiPieChart size={16} />
                Portfolio Analysis
              </button>
              <button className="btn btn-secondary w-100">
                <FiActivity size={16} />
                Trading History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
