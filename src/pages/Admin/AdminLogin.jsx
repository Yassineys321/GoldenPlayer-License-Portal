import React, { useState } from 'react';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Key, ChevronRight, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLogin = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError('Invalid credentials. Access Denied.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-root">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="login-container card">
        
        <div className="login-header">
           <div className="sh-icon-box glass">
             <ShieldCheck size={32} color="#38bdf8" />
           </div>
           <h2 className="white-text">Admin Portal</h2>
           <span className="restricted-badge">RESTRICTED AREA</span>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>ADMIN EMAIL</label>
            <div className="input-wrapper">
              <Mail size={18} className="f-icon" />
              <input 
                type="email" 
                placeholder="admin@domain.com" 
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>MASTER KEY</label>
            <div className="input-wrapper">
              <Key size={18} className="f-icon" />
              <input 
                type="password" 
                placeholder="••••••••" 
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn-primary btn-full btn-auth" disabled={loading}>
            {loading ? 'AUTHORIZING...' : <>AUTHORIZE ACCESS <ChevronRight size={18} /></>}
          </button>

          <button type="button" className="btn-forgot sky-title">FORGOT PASSWORD?</button>
        </form>

        <div className="login-footer">
           <button onClick={() => navigate('/login')} className="btn-return text-secondary">
             <Monitor size={14} /> RETURN TO USER PORTAL
           </button>
        </div>
      </motion.div>

      <style>{`
        .admin-login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-deep);
          padding: 20px;
        }

        .login-container {
          width: 100%;
          max-width: 440px;
          padding: 48px 40px;
          text-align: center;
          background: var(--card-bg);
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,0.03);
        }

        .login-header { margin-bottom: 40px; }
        .sh-icon-box { 
          width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 20px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(56, 189, 248, 0.05);
        }
        .login-header h2 { font-size: 1.8rem; font-weight: 900; margin-bottom: 4px; }
        .restricted-badge { 
          font-size: 0.65rem; font-weight: 800; color: var(--text-secondary); 
          letter-spacing: 0.15em; opacity: 0.8;
        }

        .login-form { display: flex; flex-direction: column; gap: 24px; }
        .input-group { text-align: left; }
        .input-group label { 
          display: block; font-size: 0.7rem; font-weight: 800; 
          color: var(--text-secondary); margin-bottom: 10px; letter-spacing: 0.05em;
        }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .f-icon { position: absolute; left: 16px; color: var(--electric-blue); }
        .input-field { width: 100%; padding-left: 48px !important; }

        .btn-auth { height: 56px; font-size: 0.95rem; }
        .btn-forgot { 
          background: none; border: none; font-size: 0.75rem; 
          font-weight: 800; cursor: pointer; margin-top: 10px;
          transition: all 0.2s;
        }
        .btn-forgot:hover { opacity: 0.8; }

        .error-text { color: #ef4444; font-size: 0.8rem; font-weight: 600; }

        .login-footer { margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.03); }
        .btn-return { 
          background: none; border: none; font-size: 0.75rem; font-weight: 800; 
          display: flex; align-items: center; justify-content: center; gap: 10px;
          cursor: pointer; width: 100%;
        }
        .btn-return:hover { color: var(--text-primary); }
      `}</style>
    </div>
  );
};

export default AdminLogin;
