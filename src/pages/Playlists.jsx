import React, { useState, useEffect, useMemo } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import {
  Link2, Trash2, CheckCircle2, Search,
  Edit3, Server, Plus, XCircle, Layers, Save
} from 'lucide-react';

/* ── Helpers ── */
const encrypt = (txt) => { try { return btoa(txt); } catch { return txt; } };
const decrypt = (txt) => { try { return atob(txt); } catch { return txt; } };

/* ── Main Component ── */
const Playlists = () => {
  const mac = localStorage.getItem('user_mac');

  const [playlists,  setPlaylists]  = useState([]);
  const [search,     setSearch]     = useState('');
  const [editingId,  setEditingId]  = useState(null);
  const [saving,     setSaving]     = useState(null); // 'm3u' | 'xtream' | null

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
  const cancelEdit  = () => { setEditingId(null); resetM3u(); resetXtream(); };

  /* ── Save M3U — no server validation ── */
  const saveM3u = async () => {
    if (!m3uName.trim() || !m3uUrl.trim()) return;
    setSaving('m3u');
    const data = {
      name: m3uName.trim(),
      url: m3uUrl.trim(),
      type: 'm3u',
      status: 'Online',
      channels: 0,
      expiry: 'N/A',
      timestamp: new Date().toISOString(),
    };
    if (editingId) await update(ref(rtdb, 'playlists/' + mac + '/' + editingId), data);
    else           await set(push(ref(rtdb, 'playlists/' + mac)), data);
    setEditingId(null); resetM3u(); setSaving(null);
  };

  /* ── Save Xtream — no server validation ── */
  const saveXtream = async () => {
    if (!xName.trim() || !xHost.trim() || !xUser.trim() || !xPass.trim()) return;
    setSaving('xtream');
    const data = {
      name: xName.trim(),
      url: xHost.trim(),
      username: encrypt(xUser.trim()),
      password: encrypt(xPass.trim()),
      type: 'xtream',
      status: 'Online',
      channels: 0,
      expiry: 'N/A',
      timestamp: new Date().toISOString(),
    };
    if (editingId) await update(ref(rtdb, 'playlists/' + mac + '/' + editingId), data);
    else           await set(push(ref(rtdb, 'playlists/' + mac)), data);
    setEditingId(null); resetXtream(); setSaving(null);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
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

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>Media Registry</h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Add your M3U or Xtream playlists — they sync instantly to your device</p>
        </div>
        {editingId && (
          <button onClick={cancelEdit} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit' }}>
            <XCircle size={16} /> CANCEL EDIT
          </button>
        )}
      </div>

      {/* ── Dual Add Forms ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>

        {/* M3U Form */}
        <div className="card" style={{ padding: 32, border: editingType === 'm3u' ? '1px solid var(--electric-blue)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div className="glass" style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sky-blue)' }}>
              <Link2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>M3U Endpoint</h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Paste your M3U URL with username &amp; password</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              className="input-field"
              placeholder="Playlist Name (e.g. My IPTV)"
              value={m3uName}
              onChange={e => setM3uName(e.target.value)}
              style={{ width: '100%' }}
            />
            <input
              className="input-field"
              placeholder="http://server/get.php?username=…&password=…&type=m3u"
              value={m3uUrl}
              onChange={e => setM3uUrl(e.target.value)}
              style={{ width: '100%' }}
            />
            <button
              className="btn btn-primary"
              onClick={saveM3u}
              disabled={!!saving || !m3uName.trim() || !m3uUrl.trim()}
              style={{ width: '100%', marginTop: 4, opacity: (!m3uName.trim() || !m3uUrl.trim()) ? 0.5 : 1 }}
            >
              {saving === 'm3u'
                ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> SAVING...</>
                : <><Save size={16} /> {editingId ? 'UPDATE PLAYLIST' : 'ADD PLAYLIST'}</>
              }
            </button>
          </div>
        </div>

        {/* Xtream Form */}
        <div className="card" style={{ padding: 32, border: editingType === 'xtream' ? '1px solid var(--electric-blue)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div className="glass" style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7dd3fc' }}>
              <Server size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Xtream Codes</h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Enter your Xtream server, username &amp; password</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input className="input-field" placeholder="Playlist Name" value={xName} onChange={e => setXName(e.target.value)} />
              <input className="input-field" placeholder="http://host:port" value={xHost} onChange={e => setXHost(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input className="input-field" placeholder="Username" value={xUser} onChange={e => setXUser(e.target.value)} />
              <input className="input-field" type="password" placeholder="Password" value={xPass} onChange={e => setXPass(e.target.value)} />
            </div>
            <button
              className="btn btn-primary"
              onClick={saveXtream}
              disabled={!!saving || !xName.trim() || !xHost.trim() || !xUser.trim() || !xPass.trim()}
              style={{ width: '100%', marginTop: 4, background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', opacity: (!xName.trim() || !xHost.trim() || !xUser.trim() || !xPass.trim()) ? 0.5 : 1 }}
            >
              {saving === 'xtream'
                ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> SAVING...</>
                : <><Plus size={16} /> {editingId ? 'UPDATE PLAYLIST' : 'ADD PLAYLIST'}</>
              }
            </button>
          </div>
        </div>

      </div>

      {/* ── Search ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', borderRadius: 14, height: 48, background: 'var(--input-bg)', border: '1px solid var(--glass-border)', marginBottom: 24, maxWidth: 420 }}>
        <Search size={18} color="var(--text-secondary)" style={{ marginRight: 12, flexShrink: 0 }} />
        <input
          placeholder="Search playlists..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', flex: 1, fontFamily: 'inherit' }}
        />
      </div>

      {/* ── Playlists Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 110 }} />
            <col style={{ width: 180 }} />
            <col />
            <col style={{ width: 110 }} />
            <col style={{ width: 88 }} />
          </colgroup>
          <thead>
            <tr>
              {['TYPE', 'NAME', 'HOST / URL', 'STATUS', 'ACTIONS'].map(col => (
                <th key={col} style={{ padding: '10px 16px', fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.1em', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr
                key={p.id}
                style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="glass" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.type === 'm3u' ? 'var(--electric-blue)' : 'var(--sky-blue)', flexShrink: 0 }}>
                      {p.type === 'm3u' ? <Link2 size={14} /> : <Server size={14} />}
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{p.type?.toUpperCase()}</span>
                  </div>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                  <span title={p.url} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</span>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 30, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
                    <CheckCircle2 size={11} />
                    ADDED
                  </div>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => startEdit(p)}
                      className="glass"
                      style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sky-blue)' }}
                      title="Edit"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => deleteNode(p.id)}
                      className="glass"
                      style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                      title="Delete"
                    >
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
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No playlists added yet.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>Use the forms above to add your M3U or Xtream playlist.</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Playlists;
