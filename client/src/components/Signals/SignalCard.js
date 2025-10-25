import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiClock, FiZap, FiShield } from 'react-icons/fi';
import './SignalCard.css';

function SignalCard({ signal, compact = false }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'quick': return FiZap;
      case 'spot': return FiTrendingUp;
      case 'hodl': return FiShield;
      case 'degen': return FiZap;
      default: return FiTrendingUp;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'quick': return '#f59e0b';
      case 'spot': return '#3b82f6';
      case 'hodl': return '#0fcc7f';
      case 'degen': return '#e05a5a';
      default: return '#8a8ebc';
    }
  };

  const getActionColor = (action) => {
    return action === 'buy' ? '#0fcc7f' : action === 'sell' ? '#e05a5a' : '#8a8ebc';
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return '#0fcc7f';
      case 'medium': return '#f59e0b';
      case 'high': return '#e05a5a';
      default: return '#8a8ebc';
    }
  };

  const formatTimeframe = (timeframe) => {
    const { min, max, unit } = timeframe;
    return `${min}-${max} ${unit}`;
  };

  const formatROI = (roi) => {
    return `${roi.min}-${roi.max}%`;
  };

  const TypeIcon = getTypeIcon(signal.type);

  if (compact) {
    return (
      <div className="signal-card-compact">
        <div className="signal-header">
          <div className="signal-asset">
            <span className="asset-symbol">{signal.asset.symbol}</span>
            <span className="asset-name">{signal.asset.name}</span>
          </div>
          <div className="signal-type" style={{ color: getTypeColor(signal.type) }}>
            <TypeIcon size={14} />
            {signal.type}
          </div>
        </div>
        <div className="signal-metrics">
          <div className="signal-confidence">
            <span className="confidence-label">Confidence</span>
            <span className="confidence-value">{signal.signal.confidence}%</span>
          </div>
          <div className="signal-roi">
            <span className="roi-label">ROI</span>
            <span className="roi-value">{formatROI(signal.signal.expectedROI)}</span>
          </div>
        </div>
        <div className="signal-footer">
          <div className="signal-action" style={{ color: getActionColor(signal.signal.action) }}>
            {signal.signal.action.toUpperCase()}
          </div>
          <div className="signal-timeframe">
            <FiClock size={12} />
            {formatTimeframe(signal.signal.timeframe)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signal-card">
      <div className="signal-header">
        <div className="signal-asset">
          <div className="asset-info">
            <span className="asset-symbol">{signal.asset.symbol}</span>
            <span className="asset-name">{signal.asset.name}</span>
          </div>
          <div className="asset-price">${signal.asset.price.toLocaleString()}</div>
        </div>
        <div className="signal-type" style={{ color: getTypeColor(signal.type) }}>
          <TypeIcon size={16} />
          {signal.type.toUpperCase()}
        </div>
      </div>

      <div className="signal-metrics">
        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">Confidence</span>
            <span className="metric-value">{signal.signal.confidence}%</span>
          </div>
          <div className="metric">
            <span className="metric-label">Expected ROI</span>
            <span className="metric-value">{formatROI(signal.signal.expectedROI)}</span>
          </div>
        </div>
        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">Timeframe</span>
            <span className="metric-value">{formatTimeframe(signal.signal.timeframe)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Risk Level</span>
            <span 
              className="metric-value" 
              style={{ color: getRiskColor(signal.signal.riskLevel) }}
            >
              {signal.signal.riskLevel.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="signal-analysis">
        <div className="analysis-item">
          <span className="analysis-label">Trend:</span>
          <span className="analysis-value">{signal.technicalAnalysis.trend}</span>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">Momentum:</span>
          <span className="analysis-value">{signal.technicalAnalysis.momentum}</span>
        </div>
        <div className="analysis-item">
          <span className="analysis-label">Leverage:</span>
          <span className="analysis-value">{signal.signal.leverage}x</span>
        </div>
      </div>

      <div className="signal-actions">
        <button 
          className={`btn btn-sm ${signal.signal.action === 'buy' ? 'btn-success' : 'btn-danger'}`}
        >
          {signal.signal.action === 'buy' ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
          {signal.signal.action.toUpperCase()}
        </button>
        <button className="btn btn-sm btn-secondary">
          View Details
        </button>
      </div>
    </div>
  );
}

export default SignalCard;
