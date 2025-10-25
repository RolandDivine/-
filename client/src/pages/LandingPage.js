import React from 'react';
import { Link } from 'react-router-dom';
import { FiZap, FiTrendingUp, FiShield } from 'react-icons/fi';
import './LandingPage.css';

function LandingPage() {
  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <div className="logo-icon">
                <span>P</span>
              </div>
              <div className="logo-text">
                <span className="logo-primary">Pandora</span>
                <span className="logo-secondary">Intel</span>
              </div>
            </div>
            <nav className="header-nav">
              <Link to="/demo" className="nav-link">Demo</Link>
              <Link to="/login" className="nav-link">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                <FiZap className="hero-icon" />
                Pandora Intel
                <span className="hero-subtitle">Callers</span>
              </h1>
              <p className="hero-description">
                Institutional-grade AI trading signals in your pocket. 
                Maximize your crypto profits with our advanced machine learning algorithms.
              </p>
              <div className="hero-actions">
                <Link to="/register" className="btn btn-primary btn-lg">
                  Start Free Trial
                </Link>
                <Link to="/demo" className="btn btn-secondary btn-lg">
                  View Demo
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">
                  Sign In
                </Link>
              </div>
            </div>
            <div className="hero-visual">
              <div className="trading-dashboard">
                <div className="dashboard-header">
                  <div className="dashboard-title">Live Trading Signals</div>
                  <div className="status-indicator">
                    <div className="status-dot"></div>
                    <span>Live</span>
                  </div>
                </div>
                <div className="signal-cards">
                  <div className="signal-card">
                    <div className="signal-header">
                      <span className="signal-asset">BTC</span>
                      <span className="signal-type">Quick</span>
                    </div>
                    <div className="signal-metrics">
                      <div className="signal-confidence">92%</div>
                      <div className="signal-roi">+25%</div>
                    </div>
                  </div>
                  <div className="signal-card">
                    <div className="signal-header">
                      <span className="signal-asset">ETH</span>
                      <span className="signal-type">Spot</span>
                    </div>
                    <div className="signal-metrics">
                      <div className="signal-confidence">88%</div>
                      <div className="signal-roi">+15%</div>
                    </div>
                  </div>
                  <div className="signal-card">
                    <div className="signal-header">
                      <span className="signal-asset">SOL</span>
                      <span className="signal-type">Degen</span>
                    </div>
                    <div className="signal-metrics">
                      <div className="signal-confidence">85%</div>
                      <div className="signal-roi">+45%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Trading Strategies</h2>
            <p className="section-subtitle">
              Choose from our AI-powered trading strategies designed for different risk profiles
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FiZap size={32} />
              </div>
              <h3 className="feature-title">Quick Futures</h3>
              <div className="feature-metric">30%</div>
              <p className="feature-description">High-frequency trading signals for quick profits</p>
              <ul className="feature-list">
                <li>4-8 hour timeframes</li>
                <li>3-5x leverage</li>
                <li>High accuracy rate</li>
              </ul>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FiTrendingUp size={32} />
              </div>
              <h3 className="feature-title">Spot Trades</h3>
              <div className="feature-metric">3%</div>
              <p className="feature-description">Conservative spot trading with steady returns</p>
              <ul className="feature-list">
                <li>1-3 day timeframes</li>
                <li>No leverage</li>
                <li>Low risk profile</li>
              </ul>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FiShield size={32} />
              </div>
              <h3 className="feature-title">Hodl Trades</h3>
              <div className="feature-metric">300-700%</div>
              <p className="feature-description">Long-term investments for maximum growth</p>
              <ul className="feature-list">
                <li>7-30 day timeframes</li>
                <li>Compound growth</li>
                <li>Blue chip assets</li>
              </ul>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FiZap size={32} />
              </div>
              <h3 className="feature-title">Degen Alerts</h3>
              <div className="feature-metric">10-30x</div>
              <p className="feature-description">High-risk, high-reward opportunities</p>
              <ul className="feature-list">
                <li>1-6 hour timeframes</li>
                <li>5-10x leverage</li>
                <li>Meme coins & alts</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Market Ticker */}
      <section className="market-ticker">
        <div className="container">
          <div className="ticker-content">
            <div className="ticker-item">
              <span className="ticker-symbol">BTC</span>
              <span className="ticker-price">$45,230</span>
              <span className="ticker-change positive">+2.5%</span>
            </div>
            <div className="ticker-item">
              <span className="ticker-symbol">ETH</span>
              <span className="ticker-price">$3,210</span>
              <span className="ticker-change positive">+1.8%</span>
            </div>
            <div className="ticker-item">
              <span className="ticker-symbol">SOL</span>
              <span className="ticker-price">$142</span>
              <span className="ticker-change positive">+5.8%</span>
            </div>
            <div className="ticker-item">
              <span className="ticker-symbol">UNI</span>
              <span className="ticker-price">$12.45</span>
              <span className="ticker-change negative">-0.8%</span>
            </div>
            <div className="ticker-item">
              <span className="ticker-symbol">AAVE</span>
              <span className="ticker-price">$98.50</span>
              <span className="ticker-change positive">+3.2%</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Start Trading?</h2>
            <p className="cta-description">
              Join thousands of traders using Pandora Intel to maximize their crypto profits
            </p>
            <div className="cta-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Start Free Trial
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <div className="logo-icon">
                <span>P</span>
              </div>
              <div className="logo-text">
                <span className="logo-primary">Pandora</span>
                <span className="logo-secondary">Intel</span>
              </div>
            </div>
            <div className="footer-links">
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Terms of Service</a>
              <a href="#" className="footer-link">Contact</a>
            </div>
            <div className="footer-text">
              <p>&copy; 2024 Pandora Intel. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
