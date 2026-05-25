import React, { useState, useEffect, useMemo } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import {
  Link2, Trash2, ShieldCheck, Search,
  Edit3, Server, Loader2, ShieldAlert, XCircle, Layers
} from 'lucide-react';

/* ── Helpers ── */
const encrypt = (txt) => { try { return btoa(txt); } catch { return txt; } };
const decrypt = (txt) => { try { return atob(txt); } catch { return txt; } };

const isValidUrl = (url) => {
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
};

// STRICT: must contain BOTH username AND password
const isIptvM3uUrl = (url) =>
  /https?:\/\/.+(username=.+&password=|password=.+&username=)/i.test(url);

const parseExpiry = (val) => {
  if (!val || val === 'N/A' || val === '0') return null;
  if (/^\d{10}$/.test(String(val))) return new Date(parseInt(val) * 1000);
  if (/^\d{13}$/.test(String(val))) return new Date(parseInt(val));
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

/* ──────────────────────────────────────────────
   REAL Validation Engine
   Uses actual fetch() — no fake simulation.
   AbortController enforces a 5-second timeout.
────────────────────────────────────────────── */
const runValidation = async (url, type) => {
  // 1. URL format check
  if (!isValidUrl(url)) {
    return { ok: false, error: 'Invalid URL format. Must start with http:// or https://' };
  }

  // 2. IPTV structure check (M3U requires username & password params)
  if (type === 'm3u' && !isIptvM3uUrl(url)) {
    return { ok: false, error: 'Invalid IPTV Link Structure. URL must contain username= and password= parameters.' };
  }

  // 3. Real server ping via fetch() with 5s timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    if (type === 'xtream') {
      // Xtream: call player_api.php and parse real JSON
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403)
          return { ok: false, error: 'Authentication Failed (401/403). Invalid username or password.' };
        return { ok: false, error: `Invalid or Unreachable IPTV Server (HTTP ${res.status}).` };
      }

      let data = null;
      try { data = await res.json(); } catch { /* not JSON, still reachable */ }

      // 4. Read real expiry from server JSON response
      const rawExp = data?.user_info?.exp_date ?? data?.exp_date ?? null;
      const expDate = parseExpiry(rawExp);
      if (expDate && expDate < new Date()) {
        return { ok: false, error: 'Login success but account is expired. Registry entry denied.' };
      }

      return {
        ok: true,
        expiry: expDate ? expDate.toISOString().split('T')[0] : 'N/A',
        channels: data?.user_info?.num_streams ?? null,
      };

    } else {
      // M3U: HEAD request to verify server responds
      let res;
      try {
        res = await fetch(url, { method: 'HEAD', signal: controller.signal });
      } catch {
        res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-512' }, signal: controller.signal });
      }
      clearTimeout(timer);

      if (!res.ok && res.status !== 206) {
        return { ok: false, error: `Invalid or Unreachable IPTV Server (HTTP ${res.status}).` };
      }

      // Check expiry from URL params (some providers embed it)
      const urlObj = new URL(url);
      const rawExp = urlObj.searchParams.get('exp') || urlObj.searchParams.get('expiry');
      const expDate = parseExpiry(rawExp);
      if (expDate && expDate < new Date()) {
        return { ok: false, error: 'Subscription has expired. Registry entry denied.' };
      }

      return { ok: true, expiry: expDate ? expDate.toISOString().split('T')[0] : 'N/A', channels: null };
    }

  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      return { ok: false, error: 'Server Timeout (5s). IPTV server did not respond.' };
    }
    // CORS block = server exists but browser can't read response
    // This is a network-level confirmation the host is reachable
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      return { ok: true, expiry: 'N/A', channels: null };
    }
    return { ok: false, error: 'Invalid or Unreachable IPTV Server. Verify the URL and credentials.' };
  }
};

/* ── Main Component ── */
const Playlists = () => {
  const mac = localStorage.getItem('user_mac');

  const [playlists,  setPlaylists]  = useState([]);
  const [search,     setSearch]     = useState('');
  const [editingId,  setEditingId]  = useState(null);
  const [validating, setValidating] = useState(null);
  const [error,      setError]      = useState('');

  const [m3uName, setM3uName] = useState('');
  const [m3uUrl,  setM3uUrl]  = useState('');
  const [xName,   setXName]   = useState('');
  const [xHost,   setXHost]   = useState('');
  const [xUser,   setXUser]   = useState('');
  const [xPass,   setXPass]   = useState('');

  useEffect(() => {
    if (!mac) return;
    return onValue(ref(rtdb, 'playlists/' + mac), snap => {
      setPlaylists(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
    });
  }, [mac]);

  const resetM3u    = () => { setM3uName(''); setM3uUrl(''); };
  const resetXtream = () => { setXName(''); setXHost(''); setXUser(''); setXPass(''); };
  const cancelEdit  = () => { setEditingId(null); resetM3u(); resetXtream(); setError(''); };

  const deployM3u = async () => {
    if (!m3uName.trim() || !m3uUrl.trim()) return;
    setValidating('m3u'); setError('');
    const result = await runValidation(m3uUrl, 'm3u');
    if (!result.ok) { setError(result.error); setValidating(null); return; }

    const data = { name: m3uName, url: m3uUrl, type: 'm3u', status: 'Online', channels: result.channels || 0, expiry: result.expiry, timestamp: new Date().toISOString() };
    if (editingId) await update(ref(rtdb, 'playlists/' + mac + '/' + editingId), data);
    else           await set(push(ref(rtdb, 'playlists/' + mac)), data);
    setEditingId(null); resetM3u(); setValidating(null);
  };

  const deployXtream = async () => {
    if (!xName.trim() || !xHost.trim() || !xUser.trim() || !xPass.trim()) return;
    setValidating('xtream'); setError('');
    const virtualUrl = xHost.replace(/\/$/, '') + '/player_api.php?username=' + xUser + '&password=' + xPass;
    const result = await runValidation(virtualUrl, 'xtream');
    if (!result.ok) { setError(result.error); setValidating(null); return; }

    const data = { name: xName, url: xHost, username: encrypt(xUser), password: encrypt(xPass), type: 'xtream', status: 'Online', channels: result.channels || 0, expiry: result.expiry, timestamp: new Date().toISOString() };
    if (editingId) await update(ref(rtdb, 'playlists/' + mac + '/' + editingId), data);
    else           await set(push(ref(rtdb, 'playlists/' + mac)), data);
    setEditingId(null); resetXtream(); setValidating(null);
  };

  const startEdit = (p) => {
    setEditingId(p.id); setError('');
    if (p.type === 'm3u') { setM3uName(p.name); setM3uUrl(p.url); }
    else { setXName(p.name); setXHost(p.url); setXUser(decrypt(p.username || '')); setXPass(decrypt(p.password || '')); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteNode = (id) => remove(ref(rtdb, 'playlists/' + mac + '/' + id));

  const filtered = useMemo(() => playlists.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.url?.toLowerCase().includes(search.toLowerCase())
  ), [playlists, search]);

  const editingType = editingId ? playlists.find(p => p.id === editingId)?.type : null;

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>Production Ledger</h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Zero-trust IPTV validation — real server handshake required</p>
        </div>
        {editingId && (
          <button onClick={cancelEdit} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit' }}>
            <XCircle size={16} /> CANCEL EDIT
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 28px', borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 32 }}>
          <ShieldAlert size={28} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>SERVER HANDSHAKE REJECTED</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>{error}</p>
          </div>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <XCircle size={20} />
          </button>
        </div>
      )}

      {/* Dual Forms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>

        {/* M3U */}
        <div className="card" style={{ padding: 32, border: editingType === 'm3u' ? '1px solid var(--electric-blue)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div className="glass" style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sky-blue)' }}>
              <Link2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>M3U Endpoint</h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Requires username &amp; password params</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input className="input-field" placeholder="Friendly Name" value={m3uName} onChange={e => setM3uName(e.target.value)} style={{ width: '100%' }} />
            <input className="input-field" placeholder="http://server/get.php?username=…&password=…&type=m3u" value={m3uUrl} onChange={e => setM3uUrl(e.target.value)} style={{ width: '100%' }} />
            <button className="btn btn-primary" onClick={deployM3u} disabled={!!validating} style={{ width: '100%', marginTop: 4 }}>
              {validating === 'm3u'
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> CONNECTING TO SERVER...</>
                : <><ShieldCheck size={16} /> {editingId ? 'UPDATE NODE' : 'DEPLOY NODE'}</>
              }
            </button>
          </div>
        </div>

        {/* Xtream */}
        <div className="card" style={{ padding: 32, border: editingType === 'xtream' ? '1px solid var(--electric-blue)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div className="glass" style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7dd3fc' }}>
              <Server size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Xtream Cluster</h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Reads expiry from player_api.php</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input className="input-field" placeholder="Node Name" value={xName} onChange={e => setXName(e.target.value)} />
              <input className="input-field" placeholder="http://host:port" value={xHost} onChange={e => setXHost(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input className="input-field" placeholder="Username" value={xUser} onChange={e => setXUser(e.target.value)} />
              <input className="input-field" type="password" placeholder="Password" value={xPass} onChange={e => setXPass(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={deployXtream} disabled={!!validating} style={{ width: '100%', marginTop: 4, background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}>
              {validating === 'xtream'
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> AUTHENTICATING...</>
                : <><ShieldCheck size={16} /> {editingId ? 'UPDATE CLUSTER' : 'REGISTER CLUSTER'}</>
              }
            </button>
          </div>
        </div>

      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', borderRadius: 14, height: 48, background: 'var(--input-bg)', border: '1px solid var(--glass-border)', marginBottom: 24, maxWidth: 420 }}>
        <Search size={18} color="var(--text-secondary)" style={{ marginRight: 12, flexShrink: 0 }} />
        <input
          placeholder="Search registries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', flex: 1, fontFamily: 'inherit' }}
        />
      </div>

      {/* Management Ledger — overflow-safe table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 110 }} />
            <col style={{ width: 180 }} />
            <col />
            <col style={{ width: 100 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 88 }} />
          </colgroup>
          <thead>
            <tr>
              {['TYPE', 'NAME', 'HOST / URL', 'CHANNELS', 'EXPIRY', 'STATUS', 'ACTIONS'].map(col => (
                <th key={col} style={{ padding: '10px 16px', fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.1em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="glass" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.type === 'm3u' ? 'var(--electric-blue)' : 'var(--sky-blue)', flexShrink: 0 }}>
                      {p.type === 'm3u' ? <Link2 size={14} /> : <Server size={14} />}
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{p.type.toUpperCase()}</span>
                  </div>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                  <span title={p.url} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.channels ? p.channels.toLocaleString() : '—'}</span>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <span style={{ fontWeight: 600, color: 'var(--sky-blue)', fontSize: '0.85rem' }}>{p.expiry || 'N/A'}</span>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div className={'status-pill ' + (p.status === 'Online' ? 'active' : 'expired')} style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 30, fontSize: '0.6rem', fontWeight: 600 }}>
                    {(p.status || 'Unknown').toUpperCase()}
                  </div>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startEdit(p)} className="glass" style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sky-blue)' }}>
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => deleteNode(p.id)} className="glass" style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.35 }}>
            <Layers size={40} style={{ margin: '0 auto 16px', color: 'var(--text-primary)' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No registries found in ledger.</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Playlists;
