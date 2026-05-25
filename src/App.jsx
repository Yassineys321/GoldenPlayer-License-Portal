import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Store from './pages/Store';
import Playlists from './pages/Playlists';
import AuditLog from './pages/AuditLog';
import SystemHealth from './pages/SystemHealth';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminLogin from './pages/Admin/AdminLogin';
import Layout from './components/Layout';
import Terms from './pages/Legal/Terms';
import Privacy from './pages/Legal/Privacy';
import Refund from './pages/Legal/Refund';
import Contact from './pages/Legal/Contact';
import { LanguageProvider } from './LanguageContext';
import { AlertProvider } from './context/AlertContext';

function App() {
  return (
    <LanguageProvider>
      <AlertProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/store" element={<Store />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/system-health" element={<SystemHealth />} />
            </Route>

            <Route path="/admin" element={<AdminDashboard />} />

            {/* Legal pages — standalone, NO sidebar */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/contact" element={<Contact />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Router>
      </AlertProvider>
    </LanguageProvider>
  );
}

export default App;
