import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { FiFilter, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { signalsAPI } from '../services/api';
import SignalCard from '../components/Signals/SignalCard';
import './Signals.css';

function Signals() {
  const [filters, setFilters] = useState({
    type: 'all',
    minConfidence: 70,
    search: ''
  });

  const { data: signalsData, isLoading, refetch } = useQuery(
    ['signals', filters],
    () => signalsAPI.getSignals({
      type: filters.type !== 'all' ? filters.type : undefined,
      minConfidence: filters.minConfidence,
      search: filters.search || undefined
    }),
    { refetchInterval: 30000 }
  );

  const signals = signalsData?.data?.signals || [];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const signalTypes = [
    { value: 'all', label: 'All Signals' },
    { value: 'quick', label: 'Quick Futures' },
    { value: 'spot', label: 'Spot Trades' },
    { value: 'hodl', label: 'Hodl Trades' },
    { value: 'degen', label: 'Degen Alerts' }
  ];

  return (
    <div className="signals-page">
      <div className="signals-header">
        <div className="page-title">
          <h1>Trading Signals</h1>
          <p>AI-powered trading signals for maximum profits</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <FiRefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="signals-filters">
        <div className="filter-group">
          <label className="filter-label">Signal Type</label>
          <select
            className="filter-select"
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            {signalTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Min Confidence</label>
          <select
            className="filter-select"
            value={filters.minConfidence}
            onChange={(e) => handleFilterChange('minConfidence', parseInt(e.target.value))}
          >
            <option value={60}>60%+</option>
            <option value={70}>70%+</option>
            <option value={80}>80%+</option>
            <option value={90}>90%+</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Search</label>
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search assets or strategies..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="signals-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading signals...</p>
          </div>
        ) : signals.length > 0 ? (
          <div className="signals-grid">
            {signals.map((signal) => (
              <SignalCard key={signal._id} signal={signal} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No signals found</h3>
            <p>Try adjusting your filters or check back later for new signals.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Signals;
