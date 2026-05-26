import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ChevronRight, ShieldCheck, Zap, Globe, Lock, UserCircle, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { rtdb } from '../firebase';
import { ref, get } from 'firebase/database';

const Login = () => {
  const [mac, setMac] = useState('');
  const [deviceKey, setDeviceKey] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { error, success } = useAlert();

  useEffect(() => {
    const saved = localStorage.getItem('user_mac');
    if (saved) navigate('/');
  }, [navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    const macTrimmed = mac.trim();
    const keyTrimmed = deviceKey.trim();

    if (!macTrimmed || !keyTrimmed) return;

    // 1. Normalize separators: dashes and underscores → colons, then validate
    const normalizedMac = macTrimmed.toUpperCase().replace(/[-_]/g, ':');
    const macRegex = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
    if (!macRegex.test(normalizedMac)) {
      error("Invalid MAC Address format. Accepted formats: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF", "Format Error");
      return;
    }

    setLoading(true);
    const cleanMac = normalizedMac;
    const cleanKey = keyTrimmed.toUpperCase();

    // 2. Database Verification
    get(ref(rtdb, 'devices/' + cleanMac)).then((snap) => {
      console.log(`[Auth Debug] Connection attempt for MAC: "${cleanMac}" with Key: "${cleanKey}"`);
      if (!snap.exists()) {
        console.warn(`[Auth Debug] MAC "${cleanMac}" not found in database path: devices/${cleanMac}`);
        error("Device is not whitelisted or registered in our system.", "Access Denied");
        setLoading(false);
        return;
      }

      const devData = snap.val();

      // Support all potential key variants in database
      const rawKey = devData.deviceKey ?? devData.device_key ?? devData.key ?? "";
      const rawLicense = devData.licenseKey ?? devData.license_key ?? devData.license ?? "";

      // Type Cast, trim, and uppercase for robust comparison
      const storedKey = String(rawKey).trim().toUpperCase();
      const storedLicense = String(rawLicense).trim().toUpperCase();

      console.log(`[Auth Debug] Stored Key (DB): "${storedKey}" (type: ${typeof rawKey})`);
      console.log(`[Auth Debug] Stored License (DB): "${storedLicense}" (type: ${typeof rawLicense})`);

      if (cleanKey !== storedKey && cleanKey !== storedLicense) {
        console.error(`[Auth Debug] Key mismatch! Input "${cleanKey}" does not match stored key "${storedKey}" or stored license "${storedLicense}"`);
        error("Invalid Device Key or License Key.", "Authentication Failed");
        setLoading(false);
        return;
      }

      console.log(`[Auth Debug] Connection successful for MAC "${cleanMac}"`);
      localStorage.setItem('user_mac', cleanMac);
      success("Authorized successfully!", "Connected");
      navigate('/');
    }).catch((err) => {
      console.error("[Auth Debug] Database error during connection check:", err);
      error("Database error: " + err.message, "Network Error");
      setLoading(false);
    });
  };

  return (
    <div className="login-root">
      <div className="login-container">
        
        {/* ── Left Side: Brand (Reference: Premium Dark Vibe) ── */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="brand-panel"
        >
          <div className="brand-header">
            <div className="brand-logo-box glass">
              <Zap size={36} color="var(--electric-blue)" fill="var(--electric-blue)" />
            </div>
            <div className="brand-name">
              <h1 className="white-text">Golden Player</h1>
              <span className="sky-title">PREMIUM ECOSYSTEM</span>
            </div>
          </div>

          <div className="value-props">
            <PropItem icon={<ShieldCheck size={22} />} title="Security Node v4" sub="Hardware-level encrypted authorization." />
            <PropItem icon={<Globe size={22} />} title="Global Cluster" sub="Low-latency distributed network access." />
            <PropItem icon={<Cpu size={22} />} title="Unified Intelligence" sub="Proprietary hardware pairing technology." />
          </div>

          <div className="brand-footer">
            <p>© 2026 Golden Player. Unified Registry Architecture.</p>
          </div>
        </motion.div>

        {/* ── Right Side: Access ── */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="form-panel"
        >
          <div className="login-card card">
            <div className="card-header">
              <div className="sh-icon-box glass">
                 <UserCircle size={32} color="#38bdf8" />
              </div>
              <h2 className="white-text">User Portal</h2>
              <span className="restricted-badge">ACCESS TERMINAL</span>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <label>HARDWARE MAC ADDRESS</label>
                <div className="input-wrapper">
                  <Smartphone size={18} className="f-icon" />
                  <input
                    type="text"
                    placeholder="00:11:22:33:44:55"
                    className="input-field"
                    value={mac}
                    onChange={(e) => setMac(e.target.value)}
                    required
                  />
                </div>
                <span className="input-hint">Path: Settings &gt; System &gt; Node ID</span>
              </div>

              <div className="input-group">
                <label>DEVICE KEY</label>
                <div className="input-wrapper">
                  <Lock size={18} className="f-icon" />
                  <input
                    type="text"
                    placeholder="Enter your Device Key..."
                    className="input-field"
                    value={deviceKey}
                    onChange={(e) => setDeviceKey(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-auth" disabled={loading}>
                {loading ? 'AUTHORIZING...' : <>CONNECT TO NODE <ChevronRight size={18} /></>}
              </button>
            </form>

            <div className="card-footer">
              <p className="text-secondary">Need technical assistance? <span className="sky-title">Contact Support Hub</span></p>
            </div>
          </div>
        </motion.div>
      </div>

        <footer className="login-footer">
          <p className="footer-copyright">
            © 2026 GOLDEN PLAYER. UNIFIED REGISTRY ARCHITECTURE.
          </p>
          
          <div className="footer-links">
            <FooterLink onClick={() => navigate('/terms')} label="Terms of Service" />
            <FooterLink onClick={() => navigate('/privacy')} label="Privacy Policy" />
            <FooterLink onClick={() => navigate('/refund')} label="Refund Policy" />
            <FooterLink onClick={() => navigate('/contact')} label="Contact Us" />
          </div>
        </footer>

      <style>{`
        .login-root { min-height: 100vh; display: flex; flex-direction: column; align-items: center; background: var(--bg-deep); padding: 40px 20px; overflow-y: auto; }
        .login-container { width: 100%; max-width: 1000px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; margin: auto 0; }
        
        .login-footer { 
          width: 100%; 
          max-width: 1400px;
          margin-top: 120px;
          padding: 60px 40px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          flex-wrap: wrap; 
          gap: 32px;
          border-top: 1px solid var(--glass-border);
          background: var(--topbar-bg);
        }

        .footer-copyright { color: var(--text-muted); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.05em; opacity: 0.6; }
        .footer-links { display: flex; gap: 32px; flex-wrap: wrap; }
        
        @media (max-width: 900px) {
          .login-container { grid-template-columns: 1fr; max-width: 450px; gap: 40px; }
          .brand-panel { display: none; }
          .login-footer { flex-direction: column; align-items: flex-start; padding: 40px 20px; }
        }

        .brand-panel { display: flex; flex-direction: column; color: var(--text-primary); }
        .brand-header { display: flex; align-items: center; gap: 20px; margin-bottom: 60px; }
        .brand-logo-box { width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; }
        .brand-name h1 { font-size: 2.8rem; font-weight: 900; letter-spacing: -0.05em; line-height: 1; color: var(--text-primary); }
        .brand-name span { font-size: 0.85rem; font-weight: 800; letter-spacing: 0.2em; color: var(--sky-blue); }

        .value-props { display: flex; flex-direction: column; gap: 32px; }
        .prop-item { display: flex; gap: 20px; }
        .pi-icon { width: 52px; height: 52px; border-radius: 16px; background: var(--glass-bg); display: flex; align-items: center; justify-content: center; color: var(--sky-blue); flex-shrink: 0; border: 1px solid var(--glass-border); }
        .pi-text h4 { font-size: 1.1rem; font-weight: 800; margin-bottom: 4px; color: var(--text-primary); }
        .pi-text p { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; font-weight: 600; }

        .brand-footer { margin-top: 80px; font-size: 0.8rem; color: var(--text-secondary); font-weight: 700; opacity: 0.6; }

        .login-card { padding: 48px 40px; border-radius: 32px !important; }
        .card-header { margin-bottom: 40px; text-align: center; }
        .card-header h2 { font-size: 1.8rem; font-weight: 900; color: var(--text-primary); margin-bottom: 4px; }
        .restricted-badge { font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); letter-spacing: 0.15em; opacity: 0.8; }

        .login-form { display: flex; flex-direction: column; gap: 24px; }
        .input-group label { display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-secondary); margin-bottom: 12px; letter-spacing: 0.05em; }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .f-icon { position: absolute; left: 16px; color: var(--electric-blue); }
        .input-field { width: 100%; padding-left: 48px !important; background: var(--input-bg); }
        .input-hint { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; margin-top: 8px; display: block; }

        .btn-auth { height: 56px; font-size: 0.95rem; }
        .card-footer { margin-top: 32px; text-align: center; font-size: 0.9rem; font-weight: 700; }
        .card-footer span { cursor: pointer; text-decoration: underline; text-underline-offset: 4px; }
      `}</style>
    </div>
  );
};

const PropItem = ({ icon, title, sub }) => (
  <div className="prop-item">
    <div className="pi-icon">{icon}</div>
    <div className="pi-text">
      <h4>{title}</h4>
      <p>{sub}</p>
    </div>
  </div>
);

const FooterLink = ({ onClick, label }) => (
  <button 
    onClick={onClick} 
    style={{ 
      background: 'none', 
      border: 'none', 
      color: 'var(--text-muted)', 
      fontSize: '0.75rem', 
      fontWeight: 600, 
      cursor: 'pointer', 
      transition: 'all 0.2s ease',
      letterSpacing: '0.05em',
      textTransform: 'uppercase'
    }} 
    onMouseEnter={(e) => {
      e.target.style.color = 'var(--electric-blue)';
      e.target.style.transform = 'translateY(-1px)';
    }} 
    onMouseLeave={(e) => {
      e.target.style.color = 'var(--text-muted)';
      e.target.style.transform = 'translateY(0)';
    }}
  >
    {label}
  </button>
);

export default Login;
