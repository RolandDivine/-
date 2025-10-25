import React from 'react';
import { useQuery } from 'react-query';
import { portfolioAPI } from '../services/api';
import PortfolioSummary from '../components/Portfolio/PortfolioSummary';
import './Portfolio.css';

function Portfolio() {
  const { data: portfolioData, isLoading } = useQuery(
    'portfolio',
    () => portfolioAPI.getPortfolio()
  );

  const portfolio = portfolioData?.data?.portfolio || {};
  const metrics = portfolioData?.data?.metrics || {};

  if (isLoading) {
    return (
      <div className="portfolio-page">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <h1>Portfolio</h1>
        <p>Track your trading performance and portfolio allocation</p>
      </div>

      <div className="portfolio-content">
        <div className="portfolio-summary-card">
          <PortfolioSummary portfolio={portfolio} />
        </div>
      </div>
    </div>
  );
}

export default Portfolio;
