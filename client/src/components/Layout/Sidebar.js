import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiTrendingUp, 
  FiPieChart, 
  FiDollarSign, 
  FiClock,
  FiSettings,
  FiLogOut,
  FiX
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: location.pathname.startsWith('/demo') ? '/demo' : '/app', icon: FiHome, label: 'Dashboard' },
    { path: location.pathname.startsWith('/demo') ? '/demo/signals' : '/app/signals', icon: FiTrendingUp, label: 'Signals' },
    { path: location.pathname.startsWith('/demo') ? '/demo/portfolio' : '/app/portfolio', icon: FiPieChart, label: 'Portfolio' },
    { path: location.pathname.startsWith('/demo') ? '/demo/trade' : '/app/trade', icon: FiDollarSign, label: 'Trade' },
    { path: location.pathname.startsWith('/demo') ? '/demo/history' : '/app/history', icon: FiClock, label: 'History' },
  ];

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <span>P</span>
          </div>
          <div className="logo-text">
            <span className="logo-primary">Pandora</span>
            <span className="logo-secondary">Intel</span>
          </div>
        </div>
        <button className="sidebar-close" onClick={onClose}>
          <FiX size={20} />
        </button>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
        </div>
        <div className="user-info">
          <div className="user-name">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="user-subscription">
            {user?.subscription?.type === 'free' ? 'Free Trial' : user?.subscription?.type}
            {user?.subscription?.daysRemaining && (
              <span className="days-remaining">
                ({user.subscription.daysRemaining}d)
              </span>
            )}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={onClose}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={handleLogout}>
          <FiLogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
