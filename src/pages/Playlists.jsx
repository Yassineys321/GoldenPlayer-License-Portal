import React, { useState, useEffect, useMemo } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import {
  Link2, Trash2, CheckCircle2, Search,
  Edit3, Server, Plus, XCircle, Layers, Save
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';

/* ── Helpers ── */
const encrypt = (txt) => { try { return btoa(txt); } catch { return txt; } };
const decrypt = (txt) => { try { return atob(txt); } catch { return txt; } };

/* ── Main Component ── */
const Playlists = () => {
  const mac = localStorage.getItem('user_mac');
  const { success, error, warning } = useAlert();

  const [playlists,  setPlaylists]  = useState([]);
  const [search,     setSearch]     = useState('');
  const [editingId,  setEditingId]  = useState(null);
  const [saving,     setSaving]     = useState(null); // 'm3u' | 'xtream' | null
  const [activeTab,  setActiveTab]  = useState('m3u'); // 'm3u' | 'xtream'

  const [m3uName, setM3uName] = useState('');
  const [m3uUrl,  setM3uUrl]  = useState('');
  const [urlValidationError, setUrlValidationError] = useState('');

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

  const resetM3u    = () => { setM3uName(''); setM3uUrl(''); setUrlValidationError(''); };
  const resetXtream = () => { setXName(''); setXHost(''); setXUser(''); setXPass(''); };
  const cancelEdit  = () => { setEditingId(null); resetM3u(); resetXtream(); };

  /* ── Auto-Validate M3U URL ── */
  const handleM3uUrlChange = (val) => {
    setM3uUrl(val);
    if (!val.trim()) {
      setUrlValidationError('');
    } else {
      try {
        new URL(val.trim());
        setUrlValidationError('');
      } catch {
        setUrlValidationError('Please enter a valid URL (e.g., http://server.com/get.php...)');
      }
    }
  };

  /* ── Save M3U ── */
  const saveM3u = async () => {
    if (!m3uName.trim() || !m3uUrl.trim() || urlValidationError) return;
    
    try {
      new URL(m3uUrl.trim());
    } catch {
      error("Invalid URL format. Please enter a valid HTTP/HTTPS URL.", "Validation Error");
      return;
    }

    setSaving('m3u');
    try {
      const data = {
        name: m3uName.trim(),
        url: m3uUrl.trim(),
        type: 'm3u',
        status: 'Online',
        channels: 0,
        expiry: 'N/A',
        timestamp: new Date().toISOString(),
      };
      if (editingId) {
        await update(ref(rtdb, 'playlists/' + mac + '/' + editingId), data);
        success("M3U playlist updated successfully!", "Playlist Saved");
      } else {
        await set(push(ref(rtdb, 'playlists/' + mac)), data);
        success("M3U playlist added successfully!", "Playlist Added");
      }
      setEditingId(null);
      resetM3u();
    } catch (err) {
      error("Failed to save playlist: " + err.message, "Database Error");
    } finally {
      setSaving(null);
    }
  };

  /* ── Save Xtream ── */
  const saveXtream = async () => {
    if (!xName.trim() || !xHost.trim() || !xUser.trim() || !xPass.trim()) return;

    let formattedHost = xHost.trim();
    if (!formattedHost.startsWith('http://') && !formattedHost.startsWith('https://')) {
      error("Server URL must start with http:// or https://", "Validation Error");
      return;
    }

    setSaving('xtream');
    try {
      const data = {
        name: xName.trim(),
        url: formattedHost,
        username: encrypt(xUser.trim()),
        password: encrypt(xPass.trim()),
        type: 'xtream',
        status: 'Online',
        channels: 0,
        expiry: 'N/A',
        timestamp: new Date().toISOString(),
      };
      if (editingId) {
        await update(ref(rtdb, 'playlists/' + mac + '/' + editingId), data);
        success("Xtream playlist updated successfully!", "Playlist Saved");
      } else {
        await set(push(ref(rtdb, 'playlists/' + mac)), data);
        success("Xtream playlist added successfully!", "Playlist Added");
      }
      setEditingId(null);
      resetXtream();
    } catch (err) {
      error("Failed to save playlist: " + err.message, "Database Error");
    } finally {
      setSaving(null);
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    if (p.type === 'm3u') {
      setActiveTab('m3u');
      setM3uName(p.name);
      setM3uUrl(p.url);
      setUrlValidationError('');
    } else {
      setActiveTab('xtream');
      setXName(p.name);
      setXHost(p.url);
      setXUser(decrypt(p.username || ''));
      setXPass(decrypt(p.password || ''));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteNode = async (id) => {
    try {
      await remove(ref(rtdb, 'playlists/' + mac + '/' + id));
      success("Playlist deleted successfully!", "Playlist Removed");
    } catch (err) {
      error("Failed to delete playlist: " + err.message, "Database Error");
    }
  };

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

      {/* ── Tab Switcher ── */}
      <div style={{
        display: 'flex',
        background: 'var(--input-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14,
        padding: 4,
        maxWidth: 320,
        marginBottom: 32,
        position: 'relative'
      }}>
        {['m3u', 'xtream'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); cancelEdit(); }}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                background: isActive ? 'var(--electric-blue)' : 'transparent',
                color: isActive ? '#0b1120' : 'var(--text-secondary)',
                borderRadius: 10,
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: isActive ? '0 4px 15px rgba(99, 102, 241, 0.35)' : 'none'
              }}
            >
              {tab === 'm3u' ? <Link2 size={15} /> : <Server size={15} />}
              {tab === 'm3u' ? 'M3U Endpoint' : 'Xtream Codes'}
            </button>
          );
        })}
      </div>

      {/* ── Active Form Card ── */}
      <div style={{ maxWidth: 600, margin: '0 auto 40px' }}>
        {activeTab === 'm3u' ? (
          /* M3U Form Card */
          <div className="card" style={{
            padding: 32,
            border: editingType === 'm3u' ? '1.5px solid var(--electric-blue)' : '1px solid var(--glass-border)',
            background: 'var(--card-bg)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            borderRadius: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div className="glass" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sky-blue)', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <Link2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>M3U Endpoint</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Paste your M3U URL containing your credentials</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Playlist Name</label>
                <input
                  className="input-field"
                  placeholder="e.g. My IPTV Premium"
                  value={m3uName}
                  onChange={e => setM3uName(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>M3U Playlist URL</label>
                <input
                  className="input-field"
                  placeholder="http://server.com/get.php?username=your_user&password=your_password&type=m3u"
                  value={m3uUrl}
                  onChange={e => handleM3uUrlChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: urlValidationError ? '1.5px solid #ef4444' : '1px solid var(--glass-border)'
                  }}
                />
                {urlValidationError && (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <XCircle size={12} /> {urlValidationError}
                  </span>
                )}
                {!urlValidationError && m3uUrl.trim() && (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <CheckCircle2 size={12} /> Valid URL format
                  </span>
                )}
              </div>

              <button
                className="btn btn-primary"
                onClick={saveM3u}
                disabled={!!saving || !m3uName.trim() || !m3uUrl.trim() || !!urlValidationError}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '14px 0',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  borderRadius: 16,
                  border: 'none',
                  cursor: (!!saving || !m3uName.trim() || !m3uUrl.trim() || !!urlValidationError) ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, var(--electric-blue) 0%, #4f46e5 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.25)',
                  transition: 'all 0.25s ease',
                  opacity: (!!saving || !m3uName.trim() || !m3uUrl.trim() || !!urlValidationError) ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {saving === 'm3u' ? (
                  <>
                    <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Verifying & Saving...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {editingId ? 'Update Playlist' : 'Add Playlist'}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Xtream Form Card */
          <div className="card" style={{
            padding: 32,
            border: editingType === 'xtream' ? '1.5px solid var(--electric-blue)' : '1px solid var(--glass-border)',
            background: 'var(--card-bg)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            borderRadius: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div className="glass" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <Server size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Xtream Codes</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Enter your server address, username &amp; password</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Playlist Name</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Xtream IPTV"
                    value={xName}
                    onChange={e => setXName(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Server URL (Host:Port)</label>
                  <input
                    className="input-field"
                    placeholder="http://host:port"
                    value={xHost}
                    onChange={e => setXHost(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }}
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                    Format: <code>http://domain.com:8080</code> or <code>http://ip:port</code>
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Username</label>
                  <input
                    className="input-field"
                    placeholder="Enter Username"
                    value={xUser}
                    onChange={e => setXUser(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="Enter Password"
                    value={xPass}
                    onChange={e => setXPass(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={saveXtream}
                disabled={!!saving || !xName.trim() || !xHost.trim() || !xUser.trim() || !xPass.trim()}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '14px 0',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  borderRadius: 16,
                  border: 'none',
                  cursor: (!!saving || !xName.trim() || !xHost.trim() || !xUser.trim() || !xPass.trim()) ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(14, 165, 233, 0.25)',
                  transition: 'all 0.25s ease',
                  opacity: (!!saving || !xName.trim() || !xHost.trim() || !xUser.trim() || !xPass.trim()) ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {saving === 'xtream' ? (
                  <>
                    <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Verifying & Saving...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {editingId ? 'Update Playlist' : 'Add Playlist'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
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
