import React, { useState, useEffect, useRef } from 'react';
import { rtdb, auth } from '../../firebase';
import { ref, onValue, update, get, remove, set, push } from 'firebase/database';
import {
  Search, Plus, Trash2, LogOut, ShieldCheck, Database,
  History, CheckCircle, Clock, X, Download, Key,
  FileText, Eye, AlertTriangle, ChevronDown, ExternalLink,
  BarChart2, Filter, Package, Users, TrendingUp, Coins
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// ── Small helpers ─────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const s = (status || '').toLowerCase();
  let cls = 'status-pill ';
  if (s.includes('active') || s === 'approved') cls += 'approved';
  else if (s.includes('approved')) cls += 'approved';
  else if (s.includes('pending')) cls += 'pending';
  else if (s === 'declined' || s.includes('declined') || s.includes('expired')) cls += 'declined';
  else cls += 'expired';
  return <span className={cls}>{status}</span>;
};

const StatCard = ({ icon, label, value, color = 'var(--electric-blue)' }) => (
  <div className="adm-stat-card glass">
    <div className="adm-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
    <div>
      <div className="adm-stat-val" style={{ color }}>{value}</div>
      <div className="adm-stat-label">{label}</div>
    </div>
  </div>
);

// ── Screenshot Lightbox ───────────────────────────────────────────────────────
const Lightbox = ({ src, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
  }}>
    <img src={src} alt="Receipt" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }} />
    <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
  </div>
);

const generateDeterministicDeviceKey = (macAddress) => {
  const salt = "GoldenPlayer2026SecretSalt";
  const input = macAddress.trim().toUpperCase() + salt;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  let unsignedHash = hash >>> 0;
  for (let i = 0; i < 6; i++) {
    const index = unsignedHash % chars.length;
    key += chars[index];
    unsignedHash = Math.floor(unsignedHash / chars.length);
  }
  return key;
};

// ── Admin Dashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [devices, setDevices]         = useState([]);
  const [manualReqs, setManualReqs]   = useState([]);
  const [autoPayments, setAutoPayments] = useState([]);
  const [invoices, setInvoices]       = useState([]);
  const [search, setSearch]           = useState('');
  const [newMac, setNewMac]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('db');
  const [lightbox, setLightbox]       = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [billingSearch, setBillingSearch] = useState('');
  const [recentlyActioned, setRecentlyActioned] = useState([]);
  const [pdfGenerating, setPdfGenerating] = useState({});
  const navigate = useNavigate();

  const downloadOrGenerateInvoice = async (target) => {
    // target can be an invoice object or a request object
    const isRequest = !target.invoiceNumber && target.mac;
    const key = target.id;
    
    // If it has invoiceUrl already, just open it!
    const existingUrl = isRequest ? getInvoiceForRequest(target) : target.invoiceUrl;
    if (existingUrl) {
      window.open(existingUrl, '_blank');
      return;
    }

    // Otherwise, generate on-demand
    setPdfGenerating(prev => ({ ...prev, [key]: true }));
    try {
      const payload = isRequest 
        ? { requestId: target.id, db: target._db }
        : { invoiceId: target.id };

      const res = await fetch(`${BACKEND_URL}/api/admin/generate-invoice-pdf-on-demand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
      } else {
        alert('Failed to generate PDF: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error connecting to backend: ' + err.message);
    } finally {
      setPdfGenerating(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, u => { if (!u) navigate('/admin/login'); });
    const unsubDevs = onValue(ref(rtdb, 'devices'), snap => {
      setDevices(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
      setLoading(false);
    });
    const unsubAuto = onValue(ref(rtdb, 'pending_payments'), snap => {
      setAutoPayments(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, _db: 'rtdb', ...v })) : []);
    });
    const unsubManual = onValue(ref(rtdb, 'payment_requests'), snap => {
      setManualReqs(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, _db: 'rtdb_manual', ...v })) : []);
    });
    const unsubInvoices = onValue(ref(rtdb, 'invoices'), snap => {
      setInvoices(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).reverse() : []);
    });
    return () => { unsubAuth(); unsubDevs(); unsubAuto(); unsubManual(); unsubInvoices(); };
  }, [navigate]);

  // Helper to resolve invoice PDF from either direct invoiceUrl or state fallback
  const getInvoiceForRequest = (req) => {
    if (req.invoiceUrl) return req.invoiceUrl;
    // Fallback: search in invoices state
    const matched = invoices.find(inv => 
      inv.mac === req.mac && 
      Math.abs(Number(inv.amount) - Number(req.amount)) < 0.01 &&
      Math.abs(new Date(inv.date || inv.timestamp) - new Date(req.timestamp)) < 24 * 60 * 60 * 1000
    );
    return matched ? matched.invoiceUrl : null;
  };

  // All requests for Ledger tab
  const allRequests = [...manualReqs, ...autoPayments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  // Only pending manual (plus recently actioned in current session) for Order Review tab
  const pendingManual = manualReqs.filter(r => r.status === 'Pending' || recentlyActioned.includes(r.id));

  const stats = {
    total: devices.length,
    active: devices.filter(d => d.status === 'Active').length,
    pendingCount: pendingManual.length,
    invoiceCount: invoices.length,
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const addDevice = async () => {
    const macTrimmed = newMac.trim();
    if (!macTrimmed) return;
    const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    if (!macRegex.test(macTrimmed)) {
      alert("Invalid MAC Address format. Must be exactly XX:XX:XX:XX:XX:XX");
      return;
    }
    const clean = macTrimmed.toUpperCase();
    await set(ref(rtdb, 'devices/' + clean), {
      macAddress: clean,
      status: 'Expired',
      coins: 0,
      expiryDate: null,
      deviceKey: generateDeterministicDeviceKey(clean)
    });
    setNewMac('');
  };

  const approveRequest = async (req) => {
    setActionLoading(req.id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/approve-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, db: req._db })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Error: ' + data.message);
      } else {
        setRecentlyActioned(prev => [...prev, req.id]);
      }
    } catch (err) {
      alert('Cannot connect to backend: ' + err.message);
    } finally {
      setActionLoading('');
    }
  };

  const declineRequest = async (req) => {
    setActionLoading(req.id + '_d');
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/decline-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, db: req._db })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Error: ' + data.message);
      } else {
        setRecentlyActioned(prev => [...prev, req.id]);
      }
    } catch (err) {
      alert('Cannot connect to backend: ' + err.message);
    } finally {
      setActionLoading('');
    }
  };

  // ── CSV Export ───────────────────────────────────────────────────────────────
  const exportInvoicesCSV = () => {
    const rows = [
      ['Invoice #', 'Date', 'Customer', 'Email', 'MAC', 'Plan', 'Amount', 'Currency', 'Method', 'Status', 'Invoice URL'],
      ...invoices.map(inv => [
        inv.invoiceNumber || inv.id,
        inv.date ? new Date(inv.date).toLocaleDateString() : '',
        inv.fullName || '',
        inv.email || '',
        inv.mac || '',
        inv.planName || '',
        inv.amount || '',
        inv.currency || '',
        inv.paymentMethod || '',
        inv.status || '',
        inv.invoiceUrl || ''
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!billingSearch) return true;
    const q = billingSearch.toLowerCase();
    return (inv.invoiceNumber || '').toLowerCase().includes(q)
      || (inv.mac || '').toLowerCase().includes(q)
      || (inv.fullName || '').toLowerCase().includes(q)
      || (inv.email || '').toLowerCase().includes(q);
  });

  if (loading) return <div style={{ background: 'var(--bg-deep)', height: '100vh' }} />;

  return (
    <div className="admin-root">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {/* ── SIDEBAR ── */}
      <nav className="admin-sidebar">
        <div className="side-header">
          <div className="side-logo-box glass"><ShieldCheck size={20} color="var(--electric-blue)" /></div>
          <h2>Admin Panel</h2>
        </div>
        <div className="side-nav">
          <button className={`side-btn ${activeTab === 'db' ? 'active' : ''}`} onClick={() => setActiveTab('db')}>
            <Database size={18} /> Registry
          </button>
          <button className={`side-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <Package size={18} /> Order Review
            {stats.pendingCount > 0 && <span className="p-badge">{stats.pendingCount}</span>}
          </button>
          <button className={`side-btn ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
            <History size={18} /> Ledger
          </button>
          <button className={`side-btn ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
            <FileText size={18} /> Billing & Export
            {stats.invoiceCount > 0 && <span className="p-badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>{stats.invoiceCount}</span>}
          </button>
        </div>
        <div className="side-footer">
          <button className="side-btn text-secondary" onClick={() => signOut(auth)}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="admin-main">
        {/* Header */}
        <header className="main-header">
          <h1>
            {activeTab === 'db' ? 'Node Registry'
              : activeTab === 'orders' ? 'Order Review'
              : activeTab === 'ledger' ? 'Transaction Ledger'
              : 'Billing & Export'}
          </h1>
          <div className="header-stats">
            <StatCard icon={<Database size={16}/>} label="TOTAL NODES" value={stats.total} />
            <StatCard icon={<CheckCircle size={16}/>} label="ACTIVE" value={stats.active} color="#10b981" />
            {stats.pendingCount > 0 && <StatCard icon={<Clock size={16}/>} label="PENDING" value={stats.pendingCount} color="#f59e0b" />}
          </div>
        </header>

        <AnimatePresence mode="wait">

          {/* ── REGISTRY TAB ── */}
          {activeTab === 'db' && (
            <motion.div key="db" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="panel-content">
              <div className="search-bar card">
                <Search size={18} className="text-secondary" />
                <input placeholder="Search node registry..." value={search} onChange={e => setSearch(e.target.value)} />
                <div className="add-group">
                  <input placeholder="NEW MAC" value={newMac} onChange={e => setNewMac(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDevice()} />
                  <button className="btn btn-primary" onClick={addDevice}>DEPLOY NODE</button>
                </div>
              </div>
              <div className="table-card card">
                <table className="node-table">
                  <thead>
                    <tr>
                      <th>NODE IDENTIFIER</th>
                      <th>STATUS</th>
                      <th>BALANCE</th>
                      <th>EXPIRY</th>
                      <th>DEVICE KEY</th>
                      <th className="text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.filter(d => !search || (d.macAddress || d.id || '').toLowerCase().includes(search.toLowerCase())).map(d => (
                      <tr key={d.id}>
                        <td><code style={{ fontSize: '0.8rem' }}>{d.macAddress || d.id}</code></td>
                        <td><StatusPill status={d.status || 'Expired'} /></td>
                        <td><span style={{ color: 'var(--electric-blue)', fontWeight: 600 }}>{d.coins || 0} CR</span></td>
                        <td style={{ fontSize: '0.8rem' }}>{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          {d.deviceKey
                            ? <code style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: 6 }}>{d.deviceKey}</code>
                            : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td className="text-right">
                          <button className="act-btn glass" title="Delete" onClick={() => remove(ref(rtdb, 'devices/' + d.id))}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── ORDER REVIEW TAB ── */}
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="panel-content" style={{ gap: 24 }}>

              {/* ── PENDING ORDERS ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <Clock size={16} color="#f59e0b" />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending Review</span>
                  {manualReqs.filter(r => r.status === 'Pending').length > 0 && (
                    <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 8 }}>
                      {manualReqs.filter(r => r.status === 'Pending').length}
                    </span>
                  )}
                </div>

                {manualReqs.filter(r => r.status === 'Pending').length === 0 ? (
                  <div className="card" style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-muted)' }}>
                    <CheckCircle size={22} color="#10b981" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>All caught up — no pending requests.</span>
                  </div>
                ) : (
                  <div className="table-card card">
                    <table className="node-table">
                      <thead>
                        <tr>
                          <th>CUSTOMER</th>
                          <th>MAC</th>
                          <th>PLAN</th>
                          <th>AMOUNT</th>
                          <th>SUBMITTED</th>
                          <th style={{ textAlign: 'center' }}>RECEIPT</th>
                          <th style={{ textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualReqs.filter(r => r.status === 'Pending').map(r => (
                          <tr key={r.id}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{r.fullName || '—'}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--electric-blue)', marginTop: 2 }}>{r.email || ''}</div>
                            </td>
                            <td><code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.mac}</code></td>
                            <td>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{r.method}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--electric-blue)', fontWeight: 600 }}>{r.coins} CR</div>
                            </td>
                            <td><span style={{ fontWeight: 600, color: '#10b981', fontSize: '0.9rem' }}>{r.amount} EUR</span></td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(r.timestamp).toLocaleDateString()}<br/>
                              <span style={{ fontSize: '0.68rem' }}>{new Date(r.timestamp).toLocaleTimeString()}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {r.imageUrl ? (
                                <button
                                  className="act-btn glass"
                                  onClick={() => setLightbox(r.imageUrl)}
                                  title="View Receipt"
                                  style={{ color: 'var(--electric-blue)' }}
                                >
                                  <Eye size={15} />
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => approveRequest(r)}
                                  disabled={actionLoading === r.id}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '6px 14px', borderRadius: 9, border: 'none',
                                    background: 'rgba(16,185,129,0.12)', color: '#10b981',
                                    fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                                    transition: 'all 0.2s', opacity: actionLoading === r.id ? 0.6 : 1
                                  }}
                                >
                                  <CheckCircle size={13} />
                                  {actionLoading === r.id ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => declineRequest(r)}
                                  disabled={actionLoading === r.id + '_d'}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '6px 14px', borderRadius: 9, border: 'none',
                                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                    fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                                    transition: 'all 0.2s', opacity: actionLoading === r.id + '_d' ? 0.6 : 1
                                  }}
                                >
                                  <X size={13} />
                                  {actionLoading === r.id + '_d' ? '...' : 'Decline'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── HISTORY SECTION ── */}
              {manualReqs.filter(r => r.status !== 'Pending').length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <History size={16} color="var(--text-muted)" />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>History</span>
                    <span style={{ background: 'var(--glass-bg)', color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                      {manualReqs.filter(r => r.status !== 'Pending').length}
                    </span>
                  </div>
                  <div className="table-card card">
                    <table className="node-table">
                      <thead>
                        <tr>
                          <th>CUSTOMER</th>
                          <th>MAC</th>
                          <th>AMOUNT</th>
                          <th>DATE</th>
                          <th>STATUS</th>
                          <th style={{ textAlign: 'right' }}>PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualReqs
                          .filter(r => r.status !== 'Pending')
                          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                          .map(r => (
                          <tr key={r.id}>
                            <td>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.fullName || '—'}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.email || ''}</div>
                            </td>
                            <td><code style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.mac}</code></td>
                            <td><span style={{ fontWeight: 600, color: '#10b981', fontSize: '0.85rem' }}>{r.amount} EUR</span></td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(r.timestamp).toLocaleDateString()}</td>
                            <td>
                              <StatusPill status={r.status === 'Pending' ? 'Pending' : r.status?.includes('Approved') ? 'Approved' : 'Declined'} />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {(r.status?.includes('Approved')) && (
                                <button
                                  disabled={pdfGenerating[r.id]}
                                  onClick={() => downloadOrGenerateInvoice(r)}
                                  className="act-btn glass"
                                  title="Download Invoice PDF"
                                  style={{ color: 'var(--electric-blue)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Download size={14} className={pdfGenerating[r.id] ? 'animate-spin' : ''} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* ── LEDGER TAB ── */}
          {activeTab === 'ledger' && (
            <motion.div key="ledger" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="panel-content">
              <div className="ledger-stack">
                {allRequests.length === 0 && (
                  <div className="empty-state card"><History size={36} /><h3>No Transactions Yet</h3></div>
                )}
                {allRequests.map(r => (
                  <div key={r.id} className="ledger-item card">
                    {r.imageUrl && (
                      <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', background: '#000' }} onClick={() => setLightbox(r.imageUrl)}>
                        <img src={r.imageUrl} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div className="li-info">
                        <h4>{r.fullName || r.mac}</h4>
                        <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{r.mac} • {r.method} • {new Date(r.timestamp).toLocaleString()}</span>
                        {r.email && <div style={{ fontSize: '0.75rem', color: 'var(--electric-blue)', marginTop: 4 }}>{r.email}</div>}
                        <div style={{ marginTop: 6, fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
                          {r.coins} Coins {r.amount && `• ${r.amount} ${r.method?.includes('Crypto') ? 'USDT' : 'EUR'}`}
                        </div>
                      </div>
                      <div className="li-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <StatusPill status={r.status} />
                        {r.status?.startsWith('Pending') && !r.status?.includes('Auto') && (
                          <button className="btn btn-primary btn-sm" disabled={!!actionLoading} onClick={() => approveRequest(r)}>
                            {actionLoading === r.id ? '...' : 'APPROVE'}
                          </button>
                        )}
                        {(r.status === 'Approved' || r.status?.includes('Approved') || r.status?.includes('Auto')) && (
                          <button
                            disabled={pdfGenerating[r.id]}
                            onClick={() => downloadOrGenerateInvoice(r)}
                            className="btn btn-primary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: 'rgba(56,189,248,0.15)',
                              border: '1px solid rgba(56,189,248,0.3)',
                              color: 'var(--electric-blue)',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Download size={12} className={pdfGenerating[r.id] ? "animate-spin" : ""} />
                            {pdfGenerating[r.id] ? "PDF..." : "PDF"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── BILLING & EXPORT TAB ── */}
          {activeTab === 'billing' && (
            <motion.div key="billing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="panel-content">
              <div className="search-bar card" style={{ marginBottom: 24 }}>
                <Search size={18} className="text-secondary" />
                <input
                  placeholder="Search by Invoice #, MAC, Name, or Email…"
                  value={billingSearch}
                  onChange={e => setBillingSearch(e.target.value)}
                />
                <button className="btn btn-primary" onClick={exportInvoicesCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Download size={16} /> Export CSV
                </button>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="empty-state card">
                  <FileText size={40} color="var(--text-muted)" />
                  <h3>No Invoices Yet</h3>
                  <p className="text-secondary">Invoices are generated automatically upon payment approval.</p>
                </div>
              ) : (
                <div className="table-card card">
                  <table className="node-table">
                    <thead>
                      <tr>
                        <th>INVOICE #</th>
                        <th>DATE</th>
                        <th>CUSTOMER</th>
                        <th>MAC</th>
                        <th>PLAN</th>
                        <th>AMOUNT</th>
                        <th>STATUS</th>
                        <th className="text-right">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td><code style={{ color: 'var(--electric-blue)', fontSize: '0.8rem' }}>{inv.invoiceNumber || inv.id.slice(0, 8)}</code></td>
                          <td style={{ fontSize: '0.8rem' }}>{inv.date ? new Date(inv.date).toLocaleDateString() : '—'}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{inv.fullName || '—'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inv.email || ''}</div>
                          </td>
                          <td><code style={{ fontSize: '0.75rem' }}>{inv.mac || '—'}</code></td>
                          <td style={{ fontSize: '0.8rem', maxWidth: 180 }}>{inv.planName || '—'}</td>
                          <td style={{ fontWeight: 600, color: '#10b981' }}>{inv.amount} {inv.currency}</td>
                          <td><StatusPill status={inv.status || 'Paid'} /></td>
                          <td className="text-right">
                            <button
                              disabled={pdfGenerating[inv.id]}
                              onClick={() => downloadOrGenerateInvoice(inv)}
                              className="act-btn glass"
                              title="Download PDF"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                textDecoration: 'none',
                                cursor: 'pointer',
                                background: pdfGenerating[inv.id] ? 'rgba(56,189,248,0.12)' : 'none'
                              }}
                            >
                              <Download size={14} className={pdfGenerating[inv.id] ? "animate-spin" : ""} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <style>{`
        /* ── Layout ── */
        .admin-root { display: flex; min-height: calc(100vh - 140px); background: transparent; margin: -20px -20px; border-radius: 20px; overflow: hidden; border: 1px solid var(--glass-border); }
        .admin-sidebar { width: 260px; background: var(--card-bg); border-right: 1px solid var(--glass-border); padding: 32px 16px; display: flex; flex-direction: column; flex-shrink: 0; }
        .side-header { display: flex; align-items: center; gap: 16px; margin-bottom: 48px; padding-left: 12px; }
        .side-logo-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .side-header h2 { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
        .side-nav { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .side-btn { padding: 13px 16px; border-radius: 14px; background: none; border: none; color: var(--text-secondary); font-size: 0.88rem; font-weight: 700; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; text-align: left; }
        .side-btn:hover { background: var(--glass-bg); color: var(--electric-blue); }
        .side-btn.active { background: var(--electric-blue); color: var(--bg-deep); }
        .p-badge { margin-left: auto; background: rgba(56,189,248,0.18); color: var(--electric-blue); font-size: 0.65rem; padding: 2px 8px; border-radius: 8px; font-weight: 900; }
        .side-footer { padding-top: 16px; border-top: 1px solid var(--glass-border); }
        .admin-main { flex: 1; padding: 48px; background: var(--bg-deep); overflow-y: auto; }
        .main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .main-header h1 { font-size: 1.8rem; font-weight: 900; color: var(--text-primary); }
        .header-stats { display: flex; gap: 12px; flex-wrap: wrap; }
        .panel-content { display: flex; flex-direction: column; gap: 24px; }

        /* ── Stat Cards ── */
        .adm-stat-card { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-radius: 14px; }
        .adm-stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .adm-stat-val { font-size: 1.2rem; font-weight: 900; line-height: 1; }
        .adm-stat-label { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 3px; }

        /* ── Search/Toolbar ── */
        .search-bar { padding: 12px 20px; display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .search-bar input { flex: 1; background: none; border: none; color: var(--text-primary); font-weight: 600; outline: none; font-family: inherit; font-size: 0.9rem; }
        .add-group { display: flex; gap: 10px; padding-left: 16px; border-left: 1px solid var(--glass-border); align-items: center; }
        .add-group input { width: 170px; padding: 8px 14px; background: var(--input-bg); border-radius: 10px; font-size: 0.8rem; border: 1px solid var(--glass-border); color: var(--text-primary); outline: none; }

        /* ── Table ── */
        .table-card { padding: 0; overflow: auto; }
        .node-table { width: 100%; border-collapse: collapse; }
        .node-table th { text-align: left; padding: 14px 20px; font-size: 0.68rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--glass-border); white-space: nowrap; }
        .node-table td { padding: 14px 20px; font-size: 0.85rem; font-weight: 600; border-bottom: 1px solid var(--glass-border); color: var(--text-primary); }
        .node-table tr:last-child td { border-bottom: none; }
        .node-table tr:hover td { background: var(--glass-bg); }
        .text-right { text-align: right !important; }

        /* ── Status Pills ── */
        .status-pill { padding: 4px 12px; border-radius: 20px; font-size: 0.65rem; font-weight: 900; display: inline-block; text-transform: uppercase; letter-spacing: 0.04em; }
        .status-pill.active, .status-pill.approved { background: rgba(16,185,129,0.12); color: #10b981; }
        .status-pill.expired, .status-pill.declined { background: rgba(239,68,68,0.12); color: #ef4444; }
        .status-pill.pending { background: rgba(245,158,11,0.12); color: #f59e0b; }

        /* ── Action Buttons ── */
        .act-btn { padding: 8px 10px; border-radius: 10px; cursor: pointer; border: none; color: var(--text-secondary); display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .act-btn:hover { background: var(--glass-bg); filter: brightness(1.2); }
        .btn-danger { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; padding: 10px 20px; border-radius: 12px; font-weight: 800; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .btn-danger:hover { background: rgba(239,68,68,0.2); }
        .btn-sm { font-size: 0.75rem; padding: 6px 14px; border-radius: 8px; }

        /* ── Ledger ── */
        .ledger-stack { display: flex; flex-direction: column; gap: 12px; }
        .ledger-item { padding: 20px 24px; display: flex; gap: 20px; align-items: center; }
        .li-info h4 { font-size: 0.95rem; font-weight: 800; margin-bottom: 4px; color: var(--text-primary); }
        .li-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

        /* ── Order Review (compact table layout) ── */
        .order-info-grid { display: flex; flex-direction: column; gap: 8px; }
        .order-info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--glass-bg); border-radius: 10px; }
        .oi-label { font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .oi-val { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
        .order-actions { display: flex; gap: 12px; }
        .order-actions .btn { flex: 1; justify-content: center; }

        /* ── Empty State ── */
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 80px 40px; text-align: center; color: var(--text-muted); }
        .empty-state h3 { font-size: 1.2rem; font-weight: 800; color: var(--text-secondary); }

        @media (max-width: 900px) {
          .admin-sidebar { width: 220px; }
          .admin-main { padding: 24px; }
          .order-stack { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .admin-root { flex-direction: column; }
          .admin-sidebar { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
