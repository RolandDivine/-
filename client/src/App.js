import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Signals from './pages/Signals';
import Portfolio from './pages/Portfolio';
import Trade from './pages/Trade';
import History from './pages/History';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';

// Styles
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <div className="App">
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#1a1d3a',
                      color: '#e5e7fa',
                      border: '1px solid #23274a',
                    },
                    success: {
                      iconTheme: {
                        primary: '#0fcc7f',
                        secondary: '#1a1d3a',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#e05a5a',
                        secondary: '#1a1d3a',
                      },
                    },
                  }}
                />
                
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Public Demo Routes - No Auth Required */}
                  <Route path="/demo" element={
                    <Layout />
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="signals" element={<Signals />} />
                    <Route path="portfolio" element={<Portfolio />} />
                    <Route path="trade" element={<Trade />} />
                    <Route path="history" element={<History />} />
                    <Route path="profile" element={<Profile />} />
                  </Route>
                  
                  {/* Protected Routes */}
                  <Route path="/app" element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="signals" element={<Signals />} />
                    <Route path="portfolio" element={<Portfolio />} />
                    <Route path="trade" element={<Trade />} />
                    <Route path="history" element={<History />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="admin" element={<AdminPanel />} />
                  </Route>
                </Routes>
              </div>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
