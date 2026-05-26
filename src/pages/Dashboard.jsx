import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rtdb } from '../firebase';
import { ref, onValue, get, update, set } from 'firebase/database';
import {
  ShieldCheck, Coins, Zap, Activity, ChevronRight,
  Layers, Loader2, Wifi, Calendar,
  Clock, Plus, ArrowUpRight, Copy, Check, Download,
  Network, Cpu, Lock, Signal, Search, Sliders, Crown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';


// Simple copy feedback hook
function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return [copied, copy];
}

export default function Dashboard() {
  const [device, setDevice] = useState(null);
  const [coins, setCoins] = useState(0);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [activatingPlan, setActivatingPlan] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Search and filter states for playlist registry
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [copiedMac, copyMac] = useClipboard();
  const [copiedKey, copyKey] = useClipboard();
  const [hoveredPlan, setHoveredPlan] = useState(null);

  const { isDark } = useTheme();
  const { warning, success, error } = useAlert();
  const mac = localStorage.getItem('user_mac');
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mac) { navigate('/login'); return; }
    // ── Single source of truth: devices/${mac} ────────────────────────────────
    const d = onValue(ref(rtdb, 'devices/' + mac), s => {
      if (s.exists()) {
        const data = s.val();
        setDevice(data);
        // Read coins from devices/${mac}/coins (unified path)
        setCoins(data.coins || 0);
      }
    });
    const p = onValue(ref(rtdb, 'playlists/' + mac), s => {
      setPlaylists(s.exists() ? Object.entries(s.val()).map(([id, v]) => ({ id, ...v })) : []);
      setLoading(false);
    });
    const inv = onValue(ref(rtdb, 'invoices'), s => {
      if (s.exists()) {
        const allInvoices = Object.entries(s.val()).map(([id, v]) => ({ id, ...v }));
        const filtered = allInvoices.filter(i => i.mac?.toLowerCase() === mac.toLowerCase());
        filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setInvoices(filtered);
      } else {
        setInvoices([]);
      }
    });
    return () => { d(); p(); inv(); };
  }, [mac, navigate]);

  const handleActivate = async () => {
    if (coins < 10) { warning('Insufficient credits. Activation requires 10 Credits.', 'Insufficient Balance'); return; }
    setActivating(true);
    try {
      const snap = await get(ref(rtdb, 'devices/' + mac));
      if (!snap.exists()) { error('Device not found.', 'Error'); return; }
      const current = snap.val();
      const currentCoins = current.coins || 0;
      if (currentCoins < 10) { warning('Insufficient credits.', 'Insufficient Balance'); return; }

      const now = new Date();
      const existing = current.expiryDate ? new Date(current.expiryDate) : null;
      const newExpiry = existing && existing > now ? new Date(existing) : new Date();
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      await update(ref(rtdb, 'devices/' + mac), {
        status: 'Active',
        coins: currentCoins - 10,
        expiryDate: newExpiry.toISOString(),
        lastPlan: '1YEAR',
      });
      success('License activated successfully!', 'Activated');
    } catch {
      error('Activation failed. Please try again.', 'Error');
    } finally {
      setActivating(false);
    }
  };


  const handleActivatePlan = async (type) => {
    if (!mac) return;
    setActivatingPlan(type);
    try {
      // 1. Check/auto-register device
      let dSnap = await get(ref(rtdb, 'devices/' + mac));
      if (!dSnap.exists()) {
        const autoKey = Math.random().toString(36).substring(2, 8).toUpperCase();
        await set(ref(rtdb, 'devices/' + mac), {
          macAddress: mac, status: 'Expired', coins: 0,
          expiryDate: null, deviceKey: autoKey,
          autoRegistered: true, registeredAt: new Date().toISOString(),
        });
        dSnap = await get(ref(rtdb, 'devices/' + mac));
      }

      // 2. Migrate any legacy users_balance coins → devices/${mac}/coins
      const legacySnap = await get(ref(rtdb, 'users_balance/' + mac));
      if (legacySnap.exists()) {
        const legacyCoins = legacySnap.val()?.coins || 0;
        if (legacyCoins > 0) {
          const currentCoins = dSnap.val()?.coins || 0;
          await update(ref(rtdb, 'devices/' + mac), { coins: currentCoins + legacyCoins });
          // Remove old path
          await set(ref(rtdb, 'users_balance/' + mac), null);
          dSnap = await get(ref(rtdb, 'devices/' + mac));
        }
      }

      const cost = type === 'LIFETIME' ? 20 : 10;
      const currentCoins = dSnap.val()?.coins || 0;

      if (currentCoins < cost) {
        warning(`Insufficient credits. Activation requires ${cost} Credits.`, 'Insufficient Balance');
        setActivatingPlan(null);
        return;
      }

      // 3. Deduct coins from devices/${mac}/coins (unified path)
      await update(ref(rtdb, 'devices/' + mac), { coins: currentCoins - cost });

      const expiryVal = dSnap.val()?.expiryDate;
      const expiryDate = expiryVal ? new Date(expiryVal) : null;
      const now = new Date();
      let newExpiry;

      if (type === 'LIFETIME') {
        const randomYear = Math.floor(Math.random() * (3100 - 3000 + 1)) + 3000;
        newExpiry = new Date(`${randomYear}-12-31T23:59:59Z`);
      } else {
        newExpiry = expiryDate && expiryDate > now ? new Date(expiryDate) : new Date();
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      }

      const existingLicense = dSnap.val()?.licenseKey || dSnap.val()?.deviceKey;
      const licenseKey = existingLicense || `GP-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

      await update(ref(rtdb, 'devices/' + mac), {
        status: 'Active',
        expiryDate: newExpiry.toISOString(),
        lastPlan: type === 'LIFETIME' ? 'LIFETIME' : '1YEAR',
        licenseKey
      });

      success(`${type === 'LIFETIME' ? 'Lifetime Perpetual' : '1-Year Standard'} plan activated successfully!`, 'Activated');
    } catch (e) {
      error('Activation failed. Please try again.', 'Error');
    } finally {
      setActivatingPlan(null);
    }
  };

  const handleDownloadInvoice = async (url, invoiceNumber) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const isActive = device?.status === 'Active';
  const expiryDate = device?.expiryDate ? new Date(device.expiryDate) : null;
  const now = new Date();
  const daysLeft = expiryDate && expiryDate > now ? Math.ceil((expiryDate - now) / 86400000) : 0;
  const onlineCount = playlists.filter(p => p.status === 'Online').length;
  const totalChannels = playlists.reduce((a, p) => a + (p.channels || 0), 0);
  const expiringSoon = daysLeft > 0 && daysLeft <= 30;

  const licenseKey = device?.licenseKey || device?.deviceKey || '';
  const planName = device?.lastPlan || (isActive ? 'LIFETIME ENTERPRISE' : 'UNLICENSED');

  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  // 4K Ultra-Premium Design Tokens
  const styles = {
    cardBg: isDark ? 'rgba(30, 41, 59, 0.45)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    btnPrimaryBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    btnPrimaryHoverBg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    btnSecondaryBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    cardShadow: isDark 
      ? '0 1px 2px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' 
      : '0 1px 3px rgba(15, 23, 42, 0.02), 0 10px 30px rgba(15, 23, 42, 0.04)',
    bgPattern: isDark 
      ? 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)' 
      : 'radial-gradient(rgba(15, 23, 42, 0.015) 1px, transparent 1px)',
  };

  // Playlists filtering logic
  const filteredPlaylists = playlists.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <Loader2 size={44} style={{ animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite', color: '#6366f1' }} />
        <Zap size={18} style={{ position: 'absolute', top: 13, left: 13, color: '#6366f1' }} />
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: styles.textSecondary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Authorizing Node Terminal...
      </span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ 
      maxWidth: 1200, 
      margin: '0 auto', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 24, 
      fontFamily: "'Inter', -apple-system, sans-serif",
      backgroundImage: styles.bgPattern,
      backgroundSize: '20px 20px',
      padding: '4px'
    }}>
      
      {/* ========================================================
          1. TERMINAL WINDOW PROFILE MODULE
      ======================================================== */}
      <div style={{
        borderRadius: 16,
        border: `1px solid ${styles.cardBorder}`,
        background: styles.cardBg,
        boxShadow: styles.cardShadow,
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {/* Terminal Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          background: isDark ? 'rgba(15, 23, 42, 0.3)' : 'rgba(15, 23, 42, 0.02)',
          borderBottom: `1px solid ${styles.cardBorder}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', opacity: 0.85, display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', opacity: 0.85, display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', opacity: 0.85, display: 'inline-block' }} />
            <span style={{ marginLeft: 10, fontSize: '0.62rem', fontFamily: 'monospace', color: styles.textMuted, fontWeight: 500 }}>
              bash ~ secure-terminal --device-node
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot-pulse" style={{ display: 'inline-block' }} />
            <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Node Sync Complete
            </span>
          </div>
        </div>

        {/* Terminal Client Body */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          padding: '36px 40px',
          gap: 32
        }}>
          {/* Left Column: Node Identity, Status, Invoice, and Coins Balance + Buy Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: '1 1 350px', justifyContent: 'space-between' }}>
            
            {/* Node Identity Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(79, 70, 229, 0.05)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.1)'}`,
                boxShadow: isDark ? '0 0 15px rgba(99, 102, 241, 0.1)' : 'none'
              }}>
                <Cpu size={22} className="glowing-icon-cpu" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.45rem', fontWeight: 600, color: styles.textPrimary, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", letterSpacing: '-0.02em' }}>
                    {mac}
                  </span>
                  <button 
                    onClick={() => copyMac(mac)}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
                      border: `1px solid ${styles.cardBorder}`,
                      borderRadius: 6,
                      width: 26,
                      height: 26,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6366f1',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    className="terminal-util-btn"
                    title="Copy MAC Address"
                  >
                    {copiedMac ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                  </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 100,
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    color: isActive ? '#10b981' : '#ef4444',
                    border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: isActive ? '#10b981' : '#ef4444' }} />
                    {isActive ? 'System Active' : 'System Unlicensed'}
                  </span>

                  {/* Repositioned Invoice Button - distinct & premium styled */}
                  {invoices.length > 0 && (
                    <button
                      onClick={() => setShowInvoicesModal(true)}
                      style={{
                        padding: '3px 12px',
                        borderRadius: 100,
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        background: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)',
                        color: '#f59e0b',
                        border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.15)'}`,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      className="download-invoices-badge-btn"
                    >
                      <Download size={11} />
                      Invoice
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Repositioned Coins Total & Buy Button to Bottom-Left Corner */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.12em', color: styles.textMuted }}>
                Credits Balance
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 600, 
                  color: coins === 0 ? '#ef4444' : '#10b981', 
                  textTransform: 'uppercase',
                  fontFamily: "'JetBrains Mono', monospace",
                  background: coins === 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                  padding: '4px 12px',
                  borderRadius: 8,
                  border: coins === 0 ? '1px solid rgba(239, 68, 68, 0.12)' : '1px solid rgba(16, 185, 129, 0.12)'
                }}>
                  {coins} Credits
                </span>
                
                <button
                  onClick={() => navigate('/store')}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 8,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  className="buy-credits-badge-btn"
                >
                  <Coins size={12} />
                  Buy
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Passive Metadata Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, flex: '1.2 1 400px', justifyContent: 'flex-end', alignContent: 'space-between' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 24, width: '100%' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.12em', color: styles.textMuted }}>
                  Active Plan Tier
                </span>
                <span style={{ 
                  fontSize: '0.82rem', 
                  fontWeight: 600, 
                  color: '#6366f1', 
                  textTransform: 'uppercase',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '-0.01em',
                  background: 'rgba(99, 102, 241, 0.05)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(99, 102, 241, 0.12)',
                  display: 'inline-block',
                  width: 'fit-content'
                }}>
                  {planName}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.12em', color: styles.textMuted }}>
                  License Expiry
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ 
                    fontSize: '0.82rem', 
                    fontWeight: 600, 
                    color: expiringSoon ? '#ef4444' : '#10b981', 
                    textTransform: 'uppercase',
                    fontFamily: "'JetBrains Mono', monospace",
                    background: expiringSoon ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: `1px solid ${expiringSoon ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'}`,
                    display: 'inline-block'
                  }}>
                    {expiryDate ? `${expiryDate.getFullYear()} YEAR` : '—'}
                  </span>
                  
                  {!isActive && (
                    <button
                      disabled={coins < 10 || activating}
                      onClick={handleActivate}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        background: coins >= 10 && !activating ? '#10b981' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)'),
                        color: coins >= 10 && !activating ? '#ffffff' : styles.textMuted,
                        border: 'none',
                        cursor: coins >= 10 && !activating ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase',
                        boxShadow: coins >= 10 && !activating ? '0 2px 6px rgba(16, 185, 129, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                      className="activate-badge-btn"
                    >
                      {activating ? '...' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>

              {licenseKey && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.12em', color: styles.textMuted }}>
                    Console Credentials
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: styles.textSecondary, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', padding: '4px 8px', borderRadius: 4 }}>
                      {licenseKey}
                    </code>
                    <button onClick={() => copyKey(licenseKey)} style={{ background: 'none', border: 'none', color: styles.textMuted, cursor: 'pointer', padding: 0 }}>
                      {copiedKey ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.12em', color: styles.textMuted }}>
                  System Time
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: styles.textSecondary, fontFamily: 'monospace', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', padding: '4px 8px', borderRadius: 4 }}>
                  {formattedTime} UTC
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ========================================================
          2. QUICK ACTIVATION SECTION (HORIZONTAL ROW WIDGETS)
      ======================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

        {/* 1-Year Activation Card */}
        <div
          onMouseEnter={() => setHoveredPlan('1YEAR')}
          onMouseLeave={() => setHoveredPlan(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            height: 100,
            borderRadius: 14,
            border: `1px solid ${hoveredPlan === '1YEAR' ? '#6366f1' : styles.cardBorder}`,
            background: styles.cardBg,
            boxShadow: hoveredPlan === '1YEAR'
              ? (isDark
                  ? '0 10px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 18px rgba(99,102,241,0.18)'
                  : '0 10px 30px rgba(15,23,42,0.06), 0 0 18px rgba(99,102,241,0.12)')
              : styles.cardShadow,
            transform: hoveredPlan === '1YEAR' ? 'translateY(-1.5px)' : 'translateY(0)',
            transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            cursor: 'pointer',
            gap: 20,
          }}
        >
          {/* Left Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
            color: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}`,
            boxShadow: hoveredPlan === '1YEAR' ? '0 0 14px rgba(99,102,241,0.3)' : 'none',
            transition: 'all 0.25s',
          }}>
            <Zap size={20} />
          </div>

          {/* Middle Text */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: styles.textPrimary, letterSpacing: '-0.01em', margin: 0 }}>
                1-Year Activation
              </h4>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 600,
                background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
                color: '#6366f1',
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`,
                whiteSpace: 'nowrap',
              }}>
                4 Coins
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: styles.textSecondary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Standard 365-day node coverage
            </p>
          </div>

          {/* Right Button */}
          <button
            disabled={activatingPlan !== null}
            onClick={() => handleActivatePlan('1YEAR')}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff', border: 'none',
              cursor: activatingPlan !== null ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              boxShadow: hoveredPlan === '1YEAR' ? '0 0 16px rgba(99,102,241,0.4)' : '0 2px 8px rgba(99,102,241,0.2)',
              transition: 'all 0.15s ease', flexShrink: 0,
              opacity: activatingPlan !== null ? 0.6 : 1,
            }}
          >
            {activatingPlan === '1YEAR' ? '...' : 'Activate'}
          </button>
        </div>

        {/* Lifetime Activation Card */}
        <div
          onMouseEnter={() => setHoveredPlan('LIFETIME')}
          onMouseLeave={() => setHoveredPlan(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            height: 100,
            borderRadius: 14,
            border: `1px solid ${hoveredPlan === 'LIFETIME' ? '#a855f7' : styles.cardBorder}`,
            background: styles.cardBg,
            boxShadow: hoveredPlan === 'LIFETIME'
              ? (isDark
                  ? '0 10px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 18px rgba(168,85,247,0.18)'
                  : '0 10px 30px rgba(15,23,42,0.06), 0 0 18px rgba(168,85,247,0.12)')
              : styles.cardShadow,
            transform: hoveredPlan === 'LIFETIME' ? 'translateY(-1.5px)' : 'translateY(0)',
            transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            cursor: 'pointer',
            gap: 20,
          }}
        >
          {/* Left Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: isDark ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.07)',
            color: '#a855f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${isDark ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.15)'}`,
            boxShadow: hoveredPlan === 'LIFETIME' ? '0 0 14px rgba(168,85,247,0.3)' : 'none',
            transition: 'all 0.25s',
          }}>
            <Crown size={20} />
          </div>

          {/* Middle Text */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: styles.textPrimary, letterSpacing: '-0.01em', margin: 0 }}>
                Lifetime License
              </h4>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 600,
                background: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.08)',
                color: '#a855f7',
                border: `1px solid ${isDark ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.2)'}`,
                whiteSpace: 'nowrap',
              }}>
                8 Coins
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: styles.textSecondary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Perpetual enterprise plan
            </p>
          </div>

          {/* Right Button */}
          <button
            disabled={activatingPlan !== null}
            onClick={() => handleActivatePlan('LIFETIME')}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
              background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
              color: '#ffffff', border: 'none',
              cursor: activatingPlan !== null ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              boxShadow: hoveredPlan === 'LIFETIME' ? '0 0 16px rgba(168,85,247,0.4)' : '0 2px 8px rgba(168,85,247,0.2)',
              transition: 'all 0.15s ease', flexShrink: 0,
              opacity: activatingPlan !== null ? 0.6 : 1,
            }}
          >
            {activatingPlan === 'LIFETIME' ? '...' : 'Activate'}
          </button>
        </div>

      </div>


      {/* ========================================================
          3. REGISTRY TABLE CONTAINER (4K DESIGN SYSTEM)
      ======================================================== */}
      <div style={{
        borderRadius: 16,
        border: `1px solid ${styles.cardBorder}`,
        background: styles.cardBg,
        overflow: 'hidden',
        boxShadow: styles.cardShadow,
        transition: 'all 0.3s ease'
      }}>
        
        {/* Table Controls Panel */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${styles.cardBorder}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: isDark ? 'rgba(15, 23, 42, 0.1)' : 'rgba(0,0,0,0.005)'
        }}>
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.06em', color: styles.textPrimary }}>
              Playlists Registry
            </h3>
            <p style={{ fontSize: '0.68rem', color: styles.textSecondary, marginTop: 2 }}>
              Map and manage IPTV stream endpoints connected to this hardware node.
            </p>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center',
              width: 220
            }}>
              <Search size={13} style={{ position: 'absolute', left: 10, color: styles.textMuted }} />
              <input 
                type="text"
                placeholder="Search playlist registry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  borderRadius: 8,
                  border: `1px solid ${styles.cardBorder}`,
                  background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff',
                  color: styles.textPrimary,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = styles.cardBorder}
              />
            </div>

            {/* Status Selector pills */}
            <div style={{ 
              display: 'flex', 
              background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', 
              padding: 3, 
              borderRadius: 8,
              border: `1px solid ${styles.cardBorder}`
            }}>
              {['ALL', 'Online', 'Offline'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: statusFilter === filter ? (isDark ? '#6366f1' : '#ffffff') : 'transparent',
                    color: statusFilter === filter ? (isDark ? '#ffffff' : '#6366f1') : styles.textSecondary,
                    boxShadow: statusFilter === filter && !isDark ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate('/playlists')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: '#6366f1',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              className="table-add-btn"
            >
              <Plus size={11} /> Add Playlist
            </button>
          </div>
        </div>

        {/* Table Body Area */}
        {filteredPlaylists.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 14, 
              background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(15, 23, 42, 0.03)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 16px', 
              color: styles.textMuted,
              border: `1px solid ${styles.cardBorder}`
            }}>
              <Layers size={20} />
            </div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: styles.textPrimary }}>No IPTV configurations mapped</h4>
            <p style={{ fontSize: '0.72rem', color: styles.textSecondary, marginTop: 4, marginBottom: 16 }}>
              {searchQuery ? 'No registry items match your current search terms.' : 'Link an M3U playlist file to provision node streams.'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => navigate('/playlists')} 
                style={{ 
                  background: '#6366f1', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '9px 18px', 
                  borderRadius: 8, 
                  fontSize: '0.72rem', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                }}
              >
                Add Playlist
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ 
                  borderBottom: `1px solid ${styles.cardBorder}`, 
                  background: isDark ? 'rgba(15, 23, 42, 0.1)' : 'rgba(0,0,0,0.005)' 
                }}>
                  <th style={{ padding: '14px 24px', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.12em', color: styles.textMuted }}>Playlist Name</th>
                  <th style={{ padding: '14px 24px', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.12em', color: styles.textMuted }}>Type</th>
                  <th style={{ padding: '14px 24px', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.12em', color: styles.textMuted }}>Channels</th>
                  <th style={{ padding: '14px 24px', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', tracking: '0.12em', color: styles.textMuted }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlaylists.slice(0, 10).map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: i < filteredPlaylists.length - 1 ? `1px solid ${styles.cardBorder}` : 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                    className="4k-table-row"
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          background: p.status === 'Online' ? '#10b981' : '#94a3b8',
                          boxShadow: p.status === 'Online' ? '0 0 8px #10b981' : 'none'
                        }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: styles.textPrimary }}>
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.7rem', fontWeight: 700, color: styles.textSecondary, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      {p.type}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.82rem', fontWeight: 600, color: styles.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>
                      {(p.channels || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 10px',
                        borderRadius: 100,
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: p.status === 'Online' ? 'rgba(16, 185, 129, 0.08)' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)'),
                        color: p.status === 'Online' ? '#10b981' : styles.textSecondary,
                        border: `1px solid ${p.status === 'Online' ? 'rgba(16, 185, 129, 0.12)' : 'transparent'}`
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: p.status === 'Online' ? '#10b981' : styles.textMuted }} />
                        {p.status || 'Offline'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPlaylists.length > 10 && (
              <button
                onClick={() => navigate('/playlists')}
                style={{
                  width: '100%',
                  padding: 16,
                  border: 'none',
                  borderTop: `1px solid ${styles.cardBorder}`,
                  background: isDark ? 'rgba(255,255,255,0.005)' : 'rgba(0,0,0,0.005)',
                  color: '#6366f1',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                className="minimal-view-all-hover"
              >
                View all {playlists.length} playlists →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          4. INVOICES HISTORY MODAL
      ======================================================== */}
      {showInvoicesModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '100%',
            maxWidth: 480,
            background: isDark ? 'rgba(30, 41, 59, 0.95)' : '#ffffff',
            borderRadius: 16,
            border: `1px solid ${styles.cardBorder}`,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#f59e0b' }}><Coins size={18} /></span>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: styles.textPrimary, fontFamily: 'monospace' }}>
                  Invoice History
                </h3>
              </div>
              <button 
                onClick={() => setShowInvoicesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: styles.textMuted,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  padding: 4
                }}
              >
                ✕
              </button>
            </div>

            {/* Invoices List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxHeight: 320,
              overflowY: 'auto',
              paddingRight: 4
            }}>
              {invoices.map((inv) => (
                <div 
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1px solid ${styles.cardBorder}`,
                    background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 600, color: styles.textMuted, fontFamily: 'monospace' }}>
                      {inv.invoiceNumber}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: styles.textPrimary }}>
                      {inv.planName || 'Credits Top-Up'}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: styles.textSecondary }}>
                      {new Date(inv.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ 
                      fontSize: '0.78rem', 
                      fontWeight: 600, 
                      color: '#10b981',
                      fontFamily: "'JetBrains Mono', monospace"
                    }}>
                      +{inv.amount} {inv.currency || 'USD'}
                    </span>

                    {inv.invoiceUrl && (
                      <button 
                        onClick={() => handleDownloadInvoice(inv.invoiceUrl, inv.invoiceNumber)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(245,158,11,0.2)',
                          transition: 'all 0.15s ease'
                        }}
                        className="invoice-download-link-btn"
                        title="Download Invoice PDF"
                      >
                        <Download size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => setShowInvoicesModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  color: styles.textPrimary,
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS Style Overlays for premium responsive states & microinteractions */}
      <style>{`
        .download-invoices-badge-btn:hover {
          background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'} !important;
          border-color: rgba(99, 102, 241, 0.3) !important;
          color: #6366f1 !important;
          transform: translateY(-0.5px);
        }
        .invoice-download-link-btn:hover {
          background: #d97706 !important;
          transform: scale(1.06);
          box-shadow: 0 4px 10px rgba(245, 158, 11, 0.35) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Quick activation card hovers */
        .quick-activation-card:hover {
          transform: translateY(-2px);
          border-color: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)'} !important;
          box-shadow: ${isDark 
            ? '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' 
            : '0 4px 20px rgba(15,23,42,0.06)'} !important;
        }
        .quick-act-btn-indigo:hover:not(:disabled) {
          background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%) !important;
          transform: translateY(-0.5px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35) !important;
        }
        .quick-act-btn-purple:hover:not(:disabled) {
          background: linear-gradient(135deg, #c084fc 0%, #7e22ce 100%) !important;
          transform: translateY(-0.5px);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.35) !important;
        }

        /* Badge buttons hover states */
        .buy-credits-badge-btn:hover {
          background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%) !important;
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35) !important;
        }
        .activate-badge-btn:hover:not(:disabled) {
          background: #059669 !important;
          transform: scale(1.04);
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35) !important;
        }

        /* Hover animations for standard buttons */
        .minimal-btn-hover:hover {
          background: ${isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc'} !important;
          border-color: rgba(99, 102, 241, 0.25) !important;
          transform: translateY(-0.5px);
          color: #6366f1 !important;
        }
        .minimal-primary-btn-hover:hover:not(:disabled) {
          background: ${styles.btnPrimaryHoverBg} !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.3) !important;
        }

        /* Monospace Copy and terminal icons */
        .terminal-util-btn:hover {
          background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'} !important;
          color: #818cf8 !important;
          border-color: rgba(99, 102, 241, 0.3) !important;
        }

        /* Table interaction styles */
        .4k-table-row:hover {
          background-color: ${isDark ? 'rgba(255,255,255,0.015)' : 'rgba(15, 23, 42, 0.008)'} !important;
        }
        
        /* Table Add Button states */
        .table-add-btn:hover {
          background: #4f46e5 !important;
          transform: translateY(-0.5px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }

        .minimal-view-all-hover:hover {
          background: ${isDark ? 'rgba(99, 102, 241, 0.06)' : 'rgba(99, 102, 241, 0.02)'} !important;
          color: #4f46e5 !important;
        }

        /* Text Gradients for 4K metrics */
        .metric-gradient-text {
          background: ${isDark ? 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)' : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)'};
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }

        /* Pulsing dot mini for terminal status */
        .status-dot-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #10b981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse-dot 2s infinite;
        }

        @keyframes pulse-dot {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 5px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
      `}</style>

    </div>
  );
}
