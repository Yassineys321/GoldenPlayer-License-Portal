import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, LogOut, Menu, User,
  ChevronRight, Zap, Layers, Moon, Sun, ClipboardList, Activity,
  AlertTriangle, Info, Globe
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../LanguageContext';

const Layout = () => {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const mac          = localStorage.getItem('user_mac');
  const shortMac     = mac ? (mac.length > 14 ? mac.slice(0, 14) + '…' : mac) : 'Unknown';
  const [sideOpen, setSideOpen] = useState(false);
  const [device, setDevice] = useState(null);
  const [coins, setCoins] = useState(0);

  useEffect(() => { setSideOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!mac) return;
    import('firebase/database').then(({ ref, onValue }) => {
      import('../firebase').then(({ rtdb }) => {
        const uUnsub = onValue(ref(rtdb, 'users_balance/' + mac), snap => {
          if (snap.exists()) {
            const data = snap.val();
            setCoins(data.coins || 0);
          }
        });
        const dUnsub = onValue(ref(rtdb, 'devices/' + mac), snap => {
          if (snap.exists()) {
            setDevice(snap.val());
          }
        });
        return () => {
          uUnsub();
          dUnsub();
        };
      });
    });
  }, [mac]);

  const handleLogout = () => {
    localStorage.removeItem('user_mac');
    navigate('/login');
  };

  const getPageName = () => {
    const path = location.pathname.slice(1);
    if (path === 'dashboard') return t('dashboard').toUpperCase();
    if (path === 'store') return t('store').toUpperCase();
    if (path === 'playlists') return t('media_registry').toUpperCase();
    if (path === 'audit-log') return t('audit_log').toUpperCase();
    if (path === 'system-health') return t('system_health').toUpperCase();
    return path.toUpperCase();
  };

  const isActive = device?.status === 'Active';
  const expiryDate = device?.expiryDate ? new Date(device.expiryDate) : null;
  const now = new Date();
  const daysLeft = expiryDate && expiryDate > now ? Math.ceil((expiryDate - now) / 86400000) : 0;

  return (
    <div className="app-shell">

      {/* Overlay */}
      {sideOpen && (
        <div
          onClick={() => setSideOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 90 }}
        />
      )}

      {/* Sidebar */}
      <aside className={'sidebar' + (sideOpen ? ' open' : '')}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <Zap size={20} color="#38bdf8" fill="#38bdf8" />
          </div>
          <div className="sidebar-logo-text">
            Golden<span className="sky-title">Player</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-label">NODE MANAGEMENT</span>
          <button
            className={'sidebar-btn' + (location.pathname === '/dashboard' ? ' active' : '')}
            onClick={() => navigate('/dashboard')}
          >
            <div className="sb-icon"><LayoutDashboard size={18} /></div>
            {t('dashboard')}
            {location.pathname === '/dashboard' && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
          </button>
          
          <button
            className={'sidebar-btn' + (location.pathname === '/store' ? ' active' : '')}
            onClick={() => navigate('/store')}
          >
            <div className="sb-icon"><ShoppingBag size={18} /></div>
            {t('store')}
            {location.pathname === '/store' && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
          </button>

          <span className="sidebar-label">DATA REGISTRY</span>
          <button
            className={'sidebar-btn' + (location.pathname === '/playlists' ? ' active' : '')}
            onClick={() => navigate('/playlists')}
          >
            <div className="sb-icon"><Layers size={18} /></div>
            {t('media_registry')}
            {location.pathname === '/playlists' && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
          </button>

          <span className="sidebar-label">COMPLIANCE</span>
          <button
            className={'sidebar-btn' + (location.pathname === '/audit-log' ? ' active' : '')}
            onClick={() => navigate('/audit-log')}
          >
            <div className="sb-icon"><ClipboardList size={18} /></div>
            {t('audit_log')}
            {location.pathname === '/audit-log' && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
          </button>

          <button
            className={'sidebar-btn' + (location.pathname === '/system-health' ? ' active' : '')}
            onClick={() => navigate('/system-health')}
          >
            <div className="sb-icon"><Activity size={18} /></div>
            {t('system_health')}
            {location.pathname === '/system-health' && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
          </button>
        </nav>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
          <div className="user-pill glass" style={{ marginBottom: 0 }}>
            <div className="up-avatar glass"><User size={14} /></div>
            <div className="up-info">
              <span className="up-name">{shortMac}</span>
              <span className="up-status" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className={`status-dot-mini ${isActive ? 'green' : 'red'}`} style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                {isActive ? 'NODE ACTIVE' : 'UNLICENSED'}
              </span>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <LogOut size={14} />
            </button>
          </div>
          
          <div className="sidebar-status-footer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--glass-bg)', borderRadius: 10, border: '1px solid var(--glass-border)', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
            <span className="status-dot green pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span>{t('active_systems')}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.5 }}>v4.1.0</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="mobile-toggle" onClick={() => setSideOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <Menu size={22} />
            </button>
            <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--text-secondary)' }}>SYSTEM / </span>
              <span style={{ color: 'var(--text-primary)' }}>{getPageName()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--input-bg)', padding: '6px 12px', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
              <Globe size={14} color="var(--electric-blue)" />
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 900, outline: 'none', cursor: 'pointer' }}
              >
                <option value="EN" style={{background: 'var(--card-bg)'}}>ENGLISH</option>
                <option value="FR" style={{background: 'var(--card-bg)'}}>FRANÇAIS</option>
                <option value="ES" style={{background: 'var(--card-bg)'}}>ESPAÑOL</option>
                <option value="TR" style={{background: 'var(--card-bg)'}}>TÜRKÇE</option>
              </select>
            </div>

            {/* Premium Theme Toggle */}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? t('theme_light') : t('theme_dark')}
              title={isDark ? t('theme_light') : t('theme_dark')}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                {isDark ? <Moon size={13} style={{ opacity: 0.7 }} /> : <Sun size={13} style={{ opacity: 0.7 }} />}
              </span>
              <span className="toggle-track">
                <span className={`toggle-thumb${isDark ? ' is-dark' : ''}`}>
                  <span className="toggle-icon">
                    {isDark ? <Moon size={10} color="var(--electric-blue)" /> : <Sun size={10} color="#f59e0b" />}
                  </span>
                </span>
              </span>
            </button>

            <button 
              onClick={handleLogout} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                fontSize: '0.75rem', 
                fontWeight: 800,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <LogOut size={16} /> LOGOUT
            </button>
          </div>
        </header>

        <main className="page-wrapper">
          {/* Contextual Alert Banner */}
          {device && (
            <div className="layout-alerts" style={{ marginBottom: 20 }}>
              {!isActive ? (
                <div 
                  className="alert-banner-4k-critical" 
                  onClick={() => navigate('/store')} 
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    padding: '12px 20px', 
                    borderRadius: 12, 
                    background: isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)', 
                    border: '1px solid rgba(239, 68, 68, 0.15)', 
                    color: '#ef4444', 
                    fontSize: '0.78rem', 
                    fontWeight: 700,
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.02)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, letterSpacing: '0.01em' }}>
                    {t('alert_unlicensed')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', opacity: 0.85, fontWeight: 800 }}>
                    RESOLVE NOW <ChevronRight size={12} />
                  </div>
                </div>
              ) : daysLeft <= 30 ? (
                <div 
                  className="alert-banner-4k-warning" 
                  onClick={() => navigate('/store')} 
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    padding: '12px 20px', 
                    borderRadius: 12, 
                    background: isDark ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.03)', 
                    border: '1px solid rgba(245, 158, 11, 0.15)', 
                    color: '#f59e0b', 
                    fontSize: '0.78rem', 
                    fontWeight: 700,
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.02)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, letterSpacing: '0.01em' }}>
                    {t('alert_expiration').replace('{daysLeft}', daysLeft)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', opacity: 0.85, fontWeight: 800 }}>
                    RENEW NOW <ChevronRight size={12} />
                  </div>
                </div>
              ) : coins < 10 ? (
                <div 
                  className="alert-banner-4k-info" 
                  onClick={() => navigate('/store')} 
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    padding: '12px 20px', 
                    borderRadius: 12, 
                    background: isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.03)', 
                    border: '1px solid rgba(99, 102, 241, 0.15)', 
                    color: '#6366f1', 
                    fontSize: '0.78rem', 
                    fontWeight: 700,
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.02)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <Info size={15} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, letterSpacing: '0.01em' }}>
                    {t('alert_low_credit').replace('{coins}', coins)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', opacity: 0.85, fontWeight: 800 }}>
                    TOP UP <ChevronRight size={12} />
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <Outlet />
          <style>{`
            .alert-banner-4k-critical:hover {
              background: ${isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)'} !important;
              border-color: rgba(239, 68, 68, 0.3) !important;
              transform: translateY(-0.5px);
            }
            .alert-banner-4k-warning:hover {
              background: ${isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)'} !important;
              border-color: rgba(245, 158, 11, 0.3) !important;
              transform: translateY(-0.5px);
            }
            .alert-banner-4k-info:hover {
              background: ${isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)'} !important;
              border-color: rgba(99, 102, 241, 0.3) !important;
              transform: translateY(-0.5px);
            }
          `}</style>
        </main>

        <footer className="app-footer" style={{ 
          padding: '20px 40px', 
          borderTop: '1px solid var(--glass-border)', 
          background: 'var(--topbar-bg)',
        }}>
          <div style={{ 
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', opacity: 0.6 }}>
              © 2026 GOLDEN PLAYER TECHNOLOGY. ALL RIGHTS RESERVED.
            </p>
          </div>
        </footer>
      </div>

      {/* Bottom Nav (Mobile) */}
      <nav className="bottom-nav">
        <button className={'bn-item' + (location.pathname === '/dashboard' ? ' active' : '')} onClick={() => navigate('/dashboard')}>
          <div className="bn-icon"><LayoutDashboard size={18} /></div>
          <span>{t('dashboard')}</span>
        </button>
        <button className={'bn-item' + (location.pathname === '/store' ? ' active' : '')} onClick={() => navigate('/store')}>
          <div className="bn-icon"><ShoppingBag size={18} /></div>
          <span>{t('store')}</span>
        </button>
        <button className={'bn-item' + (location.pathname === '/playlists' ? ' active' : '')} onClick={() => navigate('/playlists')}>
          <div className="bn-icon"><Layers size={18} /></div>
          <span>{t('media_registry')}</span>
        </button>
      </nav>

    </div>
  );
};

export default Layout;
