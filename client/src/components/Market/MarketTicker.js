import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { marketAPI } from '../../services/api';
import './MarketTicker.css';

function MarketTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: tickerData } = useQuery(
    'market-ticker',
    () => marketAPI.getTicker(),
    { refetchInterval: 30000 }
  );

  const tickers = tickerData?.data?.tickerData || [];

  useEffect(() => {
    if (tickers.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % tickers.length);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [tickers.length]);

  const formatPrice = (price) => {
    if (price >= 1) {
      return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatChange = (change) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  if (tickers.length === 0) {
    return (
      <div className="market-ticker">
        <div className="ticker-item">
          <span className="ticker-symbol">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="market-ticker">
      <div className="ticker-container">
        {tickers.slice(0, 5).map((ticker, index) => (
          <div 
            key={ticker.symbol} 
            className={`ticker-item ${index === currentIndex ? 'active' : ''}`}
          >
            <div className="ticker-symbol">{ticker.symbol}</div>
            <div className="ticker-price">{formatPrice(ticker.price)}</div>
            <div className={`ticker-change ${ticker.change24h >= 0 ? 'positive' : 'negative'}`}>
              {formatChange(ticker.change24h)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MarketTicker;
