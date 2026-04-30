import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Mic, Scan, History, AlertCircle } from 'lucide-react';

import Conversation from './pages/Conversation';
import CameraTranslation from './pages/CameraTranslation';
import DealLog from './pages/DealLog';
import LandingPage from './pages/LandingPage';

export const BottomNav = () => null;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('auth_token') === 'true');
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    // Catch-all for those annoying extension errors in the screenshot
    window.onerror = (msg) => {
      if (msg.includes('background service worker') || msg.includes('GF_GET_POPUP_CONFIG')) return;
      console.log("Caught:", msg);
    };
  }, []);

  const handleUnlock = () => {
    localStorage.setItem('auth_token', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div style={{ minHeight: '100vh', width: '100%', background: '#F8F9FA' }}>
        {globalError && (
          <div style={{ position: 'fixed', top: 20, left: '20px', right: '20px', background: '#FFEBEE', color: '#C62828', padding: '12px', borderRadius: 12, zIndex: 10000, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <AlertCircle size={18}/>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{globalError}</span>
            <button onClick={() => setGlobalError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontWeight: 900 }}>✕</button>
          </div>
        )}
        
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/chat" replace /> : <LandingPage onUnlock={handleUnlock} />} />
          <Route path="/*" element={
            isAuthenticated ? (
              <Routes>
                <Route path="/chat" element={<Conversation onLogout={handleLogout} />} />
                <Route path="/camera" element={<CameraTranslation />} />
                <Route path="/log" element={<DealLog />} />
                <Route path="*" element={<Navigate to="/chat" replace />} />
              </Routes>
            ) : (
              <Navigate to="/login" replace />
            )
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
