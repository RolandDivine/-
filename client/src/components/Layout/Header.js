import React, { useState } from 'react';
import { FiMenu, FiBell, FiSearch, FiSettings } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import './Header.css';

function Header({ onMenuClick }) {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuClick}>
          <FiMenu size={20} />
        </button>
        
        <form className="header-search" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search signals, assets, or strategies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </form>
      </div>

      <div className="header-right">
        <div className="header-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          <span className="status-text">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <button className="header-btn">
          <FiBell size={20} />
          <span className="notification-badge">3</span>
        </button>

        <button className="header-btn">
          <FiSettings size={20} />
        </button>

        <div className="header-user">
          <div className="user-avatar">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="user-info">
            <div className="user-name">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="user-subscription">
              {user?.subscription?.type === 'free' ? 'Free Trial' : user?.subscription?.type}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
