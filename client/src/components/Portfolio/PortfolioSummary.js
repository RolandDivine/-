import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiPieChart } from 'react-icons/fi';
import './PortfolioSummary.css';

function PortfolioSummary({ portfolio }) {
  const allocation = portfolio.allocation || {};
  const exposure = portfolio.exposure || {};

  const allocationData = [
    { name: 'Quick', value: allocation.quick || 0, color: '#f59e0b' },
    { name: 'Spot', value: allocation.spot || 0, color: '#3b82f6' },
    { name: 'Hodl', value: allocation.hodl || 0, color: '#0fcc7f' },
    { name: 'Degen', value: allocation.degen || 0, color: '#e05a5a' }
  ];

  const exposureData = [
    { name: 'BTC', value: exposure.btc || 0, color: '#f7931a' },
    { name: 'ETH', value: exposure.eth || 0, color: '#627eea' },
    { name: 'SOL', value: exposure.sol || 0, color: '#9945ff' },
    { name: 'Other', value: exposure.other || 0, color: '#8a8ebc' }
  ];

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="portfolio-summary">
      {/* Allocation Chart */}
      <div className="summary-section">
        <h4 className="section-title">Allocation</h4>
        <div className="allocation-chart">
          <div className="chart-container">
            <div className="donut-chart">
              <div className="donut-center">
                <div className="donut-value">
                  {allocationData.reduce((sum, item) => sum + item.value, 0).toFixed(0)}%
                </div>
                <div className="donut-label">Allocated</div>
              </div>
            </div>
          </div>
          <div className="allocation-legend">
            {allocationData.map((item, index) => (
              <div key={index} className="legend-item">
                <div 
                  className="legend-color" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="legend-label">{item.name}</span>
                <span className="legend-value">{formatPercentage(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exposure Chart */}
      <div className="summary-section">
        <h4 className="section-title">Exposure</h4>
        <div className="exposure-chart">
          {exposureData.map((item, index) => (
            <div key={index} className="exposure-bar">
              <div className="bar-label">
                <span>{item.name}</span>
                <span>{formatPercentage(item.value)}</span>
              </div>
              <div className="bar-container">
                <div 
                  className="bar-fill" 
                  style={{ 
                    width: `${item.value}%`, 
                    backgroundColor: item.color 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="summary-section">
        <h4 className="section-title">Performance</h4>
        <div className="performance-metrics">
          <div className="metric-item">
            <div className="metric-icon">
              <FiTrendingUp size={16} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Total Return</div>
              <div className="metric-value">
                {portfolio.totalReturn ? `+${portfolio.totalReturn.toFixed(2)}%` : '0%'}
              </div>
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-icon">
              <FiPieChart size={16} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Win Rate</div>
              <div className="metric-value">
                {portfolio.winRate ? `${portfolio.winRate.toFixed(1)}%` : '0%'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioSummary;
