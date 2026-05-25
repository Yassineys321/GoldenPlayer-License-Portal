import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Smartphone, Wallet, Bolt, Microchip, ChevronDown, Plus, Minus,
  Moon, Sun, Languages, Copy, Lock, ArrowRight, Shield, Cpu, KeyRound, CheckCircle2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../LanguageContext';

const Landing = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [mac, setMac] = useState('');
  const [loading, setLoading] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user_mac');
    if (saved) navigate('/dashboard');
  }, [navigate]);

  const handleConnect = (e) => {
    e.preventDefault();
    if (!mac.trim()) return;
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('user_mac', mac.toUpperCase());
      navigate('/dashboard');
    }, 1200);
  };

  const toggleFaq = (id) => setActiveFaq(activeFaq === id ? null : id);

  return (
    <div className="landing-root">
      
      {/* ── 1. THE HEADER ── */}
      <header className="sticky-header">
        <div className="header-container">
          {/* Left Side: Logo & Name */}
          <div className="logo-section">
            <Zap size={24} color="var(--land-primary)" fill="var(--land-primary)" />
            <span className="logo-text">Golden<span className="sky-title">Player</span></span>
          </div>

          {/* Right Side: Language & Theme */}
          <div className="header-actions">
            <div className="lang-dropdown">
              <Languages size={18} />
              <span>{lang}</span>
              <ChevronDown size={14} />
              <div className="lang-menu">
                <div onClick={() => setLang('EN')}>🇺🇸 EN</div>
                <div onClick={() => setLang('FR')}>🇫🇷 FR</div>
                <div onClick={() => setLang('ES')}>🇪🇸 ES</div>
                <div onClick={() => setLang('TR')}>🇹🇷 TR</div>
              </div>
            </div>

            {/* Premium pill toggle */}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="toggle-track">
                <span className={`toggle-thumb${isDark ? ' is-dark' : ''}`}>
                  <span className="toggle-icon">
                    {isDark ? <Moon size={10} color="var(--land-primary)" /> : <Sun size={10} color="#f59e0b" />}
                  </span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. SECTION 1: THE HERO (User Portal) ── */}
      <section className="hero-section" id="access-node">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="access-card-wrapper"
        >
          <div className="login-card card glass-deep portal-card">
            <div className="portal-status-badge">
              STATUS: ACTIVE
            </div>

            <div className="card-header-centered">
              <h3 className="portal-title">GOLDEN PLAYER PREMIUM PORTAL</h3>
              <p className="portal-subtitle">DEVICE ACTIVATION</p>
            </div>

            <form onSubmit={handleConnect} className="portal-form">
              <div className="input-group-modern">
                <label>MAC ADDRESS</label>
                <div className="modern-input-wrapper">
                  <Smartphone size={18} className="m-icon-left" />
                  <input 
                    type="text" 
                    placeholder="6A:DD:F6:02:6C:A4" 
                    className="modern-input mono-font"
                    value={mac}
                    onChange={(e) => setMac(e.target.value)}
                    required
                  />
                  <div className="m-icon-right" title="Copy MAC">
                    <Copy size={16} onClick={() => { navigator.clipboard.writeText(mac || '6A:DD:F6:02:6C:A4'); }} />
                  </div>
                </div>
              </div>

              <div className="input-group-modern">
                <label>DEVICE KEY</label>
                <div className="modern-input-wrapper">
                  <Lock size={18} className="m-icon-left" />
                  <input 
                    type="text" 
                    placeholder="Enter your Device Key..." 
                    className="modern-input mono-font"
                  />
                </div>
              </div>

              <button type="submit" className="btn-portal-primary" disabled={loading}>
                {loading ? 'AUTHORIZING...' : 'CONNECT TO NODE'}
              </button>
              
              <p className="portal-path-hint">Path: Settings &gt; System &gt; Node ID</p>
            </form>
          </div>
        </motion.div>
      </section>

      {/* ── 3. SECTION 2: HOW IT WORKS ── */}
      <section className="process-section">
        <div className="section-header">
          <h2>{t('how_it_works_title')}</h2>
        </div>
        <div className="process-grid">
          <ProcessStep 
            icon={<Microchip size={32} />} 
            title={t('step_pair_title')} 
            desc={t('step_pair_desc')} 
            hint={t('step_pair_hint')}
          />
          <ProcessStep 
            icon={<Wallet size={32} />} 
            title={t('step_fund_title')} 
            desc={t('step_fund_desc')} 
            hint={t('step_fund_hint')}
          />
          <ProcessStep 
            icon={<Bolt size={32} />} 
            title={t('step_activate_title')} 
            desc={t('step_activate_desc')} 
            hint={t('step_activate_hint')}
          />
        </div>
      </section>

      {/* ── 4. SECTION 3: FAQ ── */}
      <section className="faq-section">
        <div className="section-header">
          <h2>FAQ</h2>
        </div>
        <div className="faq-container">
          <FaqItem 
            id={1} 
            active={activeFaq === 1} 
            toggle={() => toggleFaq(1)}
            q={t('faq_q1')}
            a={t('faq_a1')}
          />
          <FaqItem 
            id={2} 
            active={activeFaq === 2} 
            toggle={() => toggleFaq(2)}
            q={t('faq_q2')}
            a={t('faq_a2')}
          />
          <FaqItem 
            id={3} 
            active={activeFaq === 3} 
            toggle={() => toggleFaq(3)}
            q={t('faq_q3')}
            a={t('faq_a3')}
          />
          <FaqItem 
            id={4} 
            active={activeFaq === 4} 
            toggle={() => toggleFaq(4)}
            q={t('faq_q4')}
            a={t('faq_a4')}
          />
        </div>
      </section>

      {/* ── 5. SECTION 4B: SECURITY BADGES BAR ── */}
      <section className="badges-section">
        <div className="badges-bar">
          <div className="badge-pill">
            <span className="badge-icon">🔒</span>
            <span>{t('badge_encrypted')}</span>
          </div>
          <div className="badge-pill">
            <span className="badge-icon">⚡</span>
            <span>{t('badge_instant')}</span>
          </div>
          <div className="badge-pill">
            <span className="badge-icon">🛡️</span>
            <span>{t('badge_privacy')}</span>
          </div>
          <div className="badge-pill">
            <span className="badge-icon">₿</span>
            <span>{t('badge_crypto')}</span>
          </div>
        </div>
      </section>

      {/* ── 6. SECTION 5: WHY GOLDEN PLAYER ── */}
      <section className="why-section">
        <div className="section-header">
          <h2>{t('why_title')}</h2>
        </div>
        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon-wrap why-perf">
              <Zap size={28} />
            </div>
            <h3>{t('why_perf_title')}</h3>
            <p>{t('why_perf_desc')}</p>
          </div>
          <div className="why-card">
            <div className="why-icon-wrap why-rely">
              <Bolt size={28} />
            </div>
            <h3>{t('why_rely_title')}</h3>
            <p>{t('why_rely_desc')}</p>
          </div>
          <div className="why-card">
            <div className="why-icon-wrap why-sec">
              <Lock size={28} />
            </div>
            <h3>{t('why_sec_title')}</h3>
            <p>{t('why_sec_desc')}</p>
          </div>
        </div>
      </section>

      {/* ── 7. SECTION 6: CALL TO ACTION ── */}
      <section className="cta-section">
        {/* Top label */}
        <div className="cta-label-badge">
          <span className="cta-label-dot" />
          Quick Start Guide
        </div>

        <h2 className="cta-main-heading">Activate Your Device in <span className="cta-heading-accent">3 Simple Steps</span></h2>
        <p className="cta-main-sub">Follow the steps below to pair your hardware and deploy your license instantly.</p>

        {/* Step cards row */}
        <div className="cta-steps-row">

          {/* Step 1 */}
          <div className="cta-step-card">
            <div className="cta-step-num">01</div>
            <div className="cta-step-icon-wrap cta-step-blue">
              <Cpu size={28} />
            </div>
            <h3 className="cta-step-title">Find Your MAC Address</h3>
            <p className="cta-step-desc">On your device go to <strong>Settings › System › Node ID</strong>. Copy your Hardware MAC Address — it looks like <code>6A:DD:F6:02:6C:A4</code>.</p>
            <div className="cta-step-hint">
              <CheckCircle2 size={14} />
              Unique to your device
            </div>
          </div>

          <div className="cta-step-arrow"><ArrowRight size={24} /></div>

          {/* Step 2 */}
          <div className="cta-step-card">
            <div className="cta-step-num">02</div>
            <div className="cta-step-icon-wrap cta-step-gold">
              <KeyRound size={28} />
            </div>
            <h3 className="cta-step-title">Enter Your Device Key</h3>
            <p className="cta-step-desc">Paste both your MAC Address and your Device Key into the activation portal at the top of this page.</p>
            <div className="cta-step-hint">
              <CheckCircle2 size={14} />
              Encrypted & secure
            </div>
          </div>

          <div className="cta-step-arrow"><ArrowRight size={24} /></div>

          {/* Step 3 */}
          <div className="cta-step-card">
            <div className="cta-step-num">03</div>
            <div className="cta-step-icon-wrap cta-step-green">
              <Shield size={28} />
            </div>
            <h3 className="cta-step-title">Connect & Go Live</h3>
            <p className="cta-step-desc">Hit <strong>Connect to Node</strong>. Your license will be paired instantly and your device goes live in seconds.</p>
            <div className="cta-step-hint">
              <CheckCircle2 size={14} />
              Instant activation
            </div>
          </div>

        </div>

        {/* CTA Button */}
        <button
          className="btn-cta-main"
          onClick={() => {
            const element = document.getElementById('access-node');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => {
                const input = element.querySelector('input');
                if (input) input.focus();
              }, 800);
            }
          }}
        >
          <Zap size={20} />
          Go to Activation Portal
          <ArrowRight size={18} className="cta-btn-arrow" />
        </button>

        <p className="cta-bottom-note"><Lock size={13} style={{display:'inline',verticalAlign:'middle',marginRight:'5px'}} />Your data is end-to-end encrypted. We never store your Device Key.</p>
      </section>

      {/* ── 8. SECTION 7: THE PROFESSIONAL FOOTER ── */}
      <footer className="landing-footer">
        <div className="footer-links-horizontal">
          <button onClick={() => navigate('/terms')}>{t('terms_title')}</button>
          <button onClick={() => navigate('/privacy')}>{t('privacy_title')}</button>
          <button onClick={() => navigate('/refund')}>{t('refund_title')}</button>
          <button onClick={() => navigate('/contact')}>{t('contact_title')}</button>
        </div>
        
        <div className="footer-bottom-centered" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--land-text-dim)', fontWeight: 600 }}>
            {t('footer_copyright')}
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--land-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--land-success-bg)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '20px' }}>
              <span className="pulse-green-dot" style={{ width: '8px', height: '8px', background: 'var(--land-success)', borderRadius: '50%', display: 'inline-block' }} />
              <span>{t('footer_status_label')}: <span style={{ color: 'var(--land-success)', fontWeight: 600 }}>{t('footer_status_value')}</span></span>
            </div>
            
            <div style={{ background: 'var(--land-btn-bg)', border: '1px solid var(--land-border)', padding: '6px 12px', borderRadius: '20px' }}>
              <span>{t('footer_version_label')}: <span style={{ color: 'var(--land-text)', fontWeight: 600 }}>v4.0.1</span></span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .pulse-green-dot {
          animation: pulse-green 2s infinite;
        }
        .landing-root { background: var(--land-bg); color: var(--land-text); min-height: 100vh; overflow-y: auto; scroll-behavior: smooth; transition: all 0.3s ease; }
        .glass { background: var(--land-glass); backdrop-filter: blur(12px); border: 1px solid var(--land-border); }
        .glass-deep { background: var(--land-card-bg); backdrop-filter: blur(25px); border: 1px solid var(--land-border); }
        
        /* 1. Header */
        .sticky-header { position: sticky; top: 0; z-index: 1000; padding: 20px 0; background: var(--land-header-bg); backdrop-filter: blur(12px); border-bottom: 1px solid var(--land-border); width: 100%; transition: all 0.3s ease; }
        .header-container { max-width: 1400px; margin: 0 auto; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; }
        
        .header-actions { display: flex; align-items: center; gap: 12px; }
        .lang-dropdown { display: flex; align-items: center; gap: 8px; padding: 0 14px; height: 42px; border-radius: 12px; cursor: pointer; font-size: 0.75rem; font-weight: 800; color: var(--land-text-dim); position: relative; background: var(--land-btn-bg); border: 1px solid var(--land-border); transition: all 0.2s; }
        .lang-dropdown:hover { border-color: var(--land-primary); color: var(--land-primary); }
        .lang-menu { position: absolute; top: 110%; left: 0; width: 110px; padding: 8px; display: none; flex-direction: column; gap: 4px; z-index: 10; background: var(--land-card-bg); border: 1px solid var(--land-border); border-radius: 12px; box-shadow: 0 10px 30px var(--land-shadow); }
        .lang-dropdown:hover .lang-menu { display: flex; }
        .lang-menu div { padding: 8px 10px; border-radius: 8px; transition: background 0.2s; color: var(--land-text); font-size: 0.8rem; font-weight: 700; cursor: pointer; }
        .lang-menu div:hover { background: var(--land-glass-hover); color: var(--land-primary); }
        .icon-btn { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--land-text-dim); transition: all 0.2s; background: var(--land-btn-bg); border: 1px solid var(--land-border); }
        .icon-btn:hover { color: var(--land-primary); border-color: var(--land-primary); }

        .logo-section { display: flex; align-items: center; gap: 12px; }
        .logo-text { font-size: 1.4rem; font-weight: 900; letter-spacing: -0.02em; color: var(--land-text); }
        .sky-title { color: var(--land-primary); }

        /* Sections Global Spacing */
        section { padding: 100px 20px; max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 80px; }
        .section-header h2 { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.03em; color: var(--land-text); }

        /* 2. Hero Section */
        .hero-section { display: flex; justify-content: center; align-items: center; min-height: 80vh; padding-top: 120px; padding-bottom: 120px; }
        .access-card-wrapper { width: 100%; max-width: 600px; }
        .portal-card { position: relative; padding: 60px 48px 48px; border-radius: 24px !important; box-shadow: 0 20px 50px var(--land-shadow); }
        .portal-status-badge { position: absolute; top: 20px; left: 24px; padding: 6px 12px; border: 1px solid var(--land-success); border-radius: 8px; color: var(--land-success); font-size: 0.65rem; font-weight: 900; letter-spacing: 0.1em; background: var(--land-success-bg); }
        .card-header-centered { text-align: center; margin-bottom: 50px; }
        .portal-title { font-size: 1.2rem; font-weight: 900; color: var(--land-gold); letter-spacing: 0.1em; margin-bottom: 8px; }
        .portal-subtitle { font-size: 0.7rem; font-weight: 800; color: var(--land-text-dim); letter-spacing: 0.2em; text-transform: uppercase; }
        
        .portal-form { display: flex; flex-direction: column; gap: 36px; }
        .input-group-modern { display: flex; flex-direction: column; gap: 12px; }
        .input-group-modern label { font-size: 0.65rem; font-weight: 900; color: var(--land-text-muted); letter-spacing: 0.1em; }
        .modern-input-wrapper { position: relative; display: flex; align-items: center; background: var(--land-input-bg); border: 1px solid var(--land-border); border-radius: 12px; transition: all 0.2s; }
        .modern-input-wrapper:focus-within { border-color: var(--land-gold); box-shadow: 0 0 15px var(--land-glass-hover); }
        .m-icon-left { position: absolute; left: 16px; color: var(--land-text-muted); }
        .m-icon-right { position: absolute; right: 16px; color: var(--land-text-muted); cursor: pointer; transition: 0.2s; }
        .m-icon-right:hover { color: var(--land-gold); }
        .modern-input { width: 100%; padding: 18px 50px; background: none; border: none; color: var(--land-text); outline: none; font-size: 1rem; }
        .mono-font { font-family: 'Space Mono', 'Roboto Mono', monospace; letter-spacing: 0.05em; font-weight: 700; }
        
        .btn-portal-primary { width: 100%; height: 64px; background: var(--land-gold-grad); border: none; border-radius: 18px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-weight: 900; font-size: 1rem; cursor: pointer; transition: 0.2s; letter-spacing: 0.05em; margin-top: 10px; }
        [data-theme='dark'] .btn-portal-primary { color: #000; text-shadow: none; }
        .btn-portal-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px var(--land-shadow); }
        .portal-path-hint { text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--land-text-muted); margin-top: -10px; }

        /* 3. How It Works */
        .process-section { padding-top: 100px; padding-bottom: 100px; }
        .process-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
        .process-card { padding: 50px 30px; border-radius: 24px; text-align: center; background: var(--land-glass); border: 1px solid var(--land-border); transition: all 0.3s ease; }
        .process-card:hover { transform: translateY(-5px); border-color: var(--land-primary); background: var(--land-glass-hover); box-shadow: 0 10px 30px var(--land-shadow); }
        .p-icon { margin: 0 auto 24px; color: var(--land-primary); display: flex; justify-content: center; align-items: center; width: 64px; height: 64px; border-radius: 16px; background: var(--land-glass-hover); }
        .process-card h3 { font-size: 1.5rem; font-weight: 900; margin-bottom: 16px; color: var(--land-text); }
        .process-card p { color: var(--land-text-dim); font-size: 1rem; line-height: 1.6; font-weight: 600; margin: 0; }

        /* 4. FAQ */
        .faq-section { padding-top: 100px; padding-bottom: 100px; }
        .faq-container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
        .faq-item { padding: 24px 32px; border-radius: 16px; cursor: pointer; transition: all 0.2s; background: var(--land-glass); border: 1px solid var(--land-border); }
        .faq-item:hover { background: var(--land-glass-hover); border-color: var(--land-primary); }
        .faq-q { display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 1.1rem; color: var(--land-text); }
        .faq-a { color: var(--land-text-dim); margin-top: 20px; line-height: 1.8; font-weight: 600; font-size: 0.95rem; padding: 0 8px 8px 8px; }

        /* 5b. Security Badges */
        .badges-section { padding: 0 20px 80px; max-width: 1200px; margin: 0 auto; }
        .badges-bar { display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: wrap; padding: 28px 40px; border-radius: 20px; background: var(--land-glass); border: 1px solid var(--land-border); backdrop-filter: blur(12px); }
        .badge-pill { display: flex; align-items: center; gap: 10px; padding: 12px 22px; border-radius: 40px; background: var(--land-btn-bg); border: 1px solid var(--land-border); font-size: 0.8rem; font-weight: 800; color: var(--land-text-dim); letter-spacing: 0.04em; transition: all 0.25s ease; cursor: default; }
        .badge-pill:hover { border-color: var(--land-primary); color: var(--land-primary); transform: translateY(-2px); box-shadow: 0 6px 20px var(--land-shadow); }
        .badge-icon { font-size: 1.1rem; line-height: 1; }

        /* 6. Why Golden Player */
        .why-section { padding: 80px 20px; max-width: 1200px; margin: 0 auto; }
        .why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .why-card { padding: 44px 32px; border-radius: 24px; text-align: center; background: var(--land-glass); border: 1px solid var(--land-border); transition: all 0.3s ease; position: relative; overflow: hidden; }
        .why-card::before { content: ''; position: absolute; inset: 0; background: var(--land-gold-grad); opacity: 0; transition: opacity 0.3s ease; border-radius: 24px; }
        .why-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px var(--land-shadow); border-color: var(--land-gold); }
        .why-card:hover::before { opacity: 0.04; }
        .why-icon-wrap { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .why-perf { background: rgba(14, 165, 233, 0.12); color: #0ea5e9; }
        .why-rely { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
        .why-sec  { background: rgba(16, 185, 129, 0.12); color: #10b981; }
        [data-theme='dark'] .why-perf { background: rgba(56, 189, 248, 0.12); color: #38bdf8; }
        [data-theme='dark'] .why-rely { background: rgba(251, 191, 36, 0.12); color: #fbbf24; }
        [data-theme='dark'] .why-sec  { background: rgba(52, 211, 153, 0.12); color: #34d399; }
        .why-card h3 { font-size: 1.3rem; font-weight: 900; color: var(--land-text); margin-bottom: 14px; }
        .why-card p  { font-size: 0.95rem; font-weight: 600; color: var(--land-text-dim); line-height: 1.7; }

        /* 7. CTA Section — Premium Step Guide */
        .cta-section {
          padding: 100px 20px 140px;
          max-width: 1100px;
          margin: 0 auto;
          text-align: center;
        }

        /* Label badge */
        .cta-label-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 99px;
          background: var(--land-glass);
          border: 1px solid var(--land-border);
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--land-primary);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .cta-label-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--land-success);
          box-shadow: 0 0 8px var(--land-success);
          animation: pulse-green 2s infinite;
        }

        /* Headings */
        .cta-main-heading {
          font-size: 2.6rem;
          font-weight: 900;
          color: var(--land-text);
          letter-spacing: -0.04em;
          margin-bottom: 16px;
          line-height: 1.15;
        }
        .cta-heading-accent {
          background: var(--land-gold-grad);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cta-main-sub {
          font-size: 1rem;
          font-weight: 600;
          color: var(--land-text-dim);
          margin-bottom: 60px;
          line-height: 1.6;
        }

        /* Steps row */
        .cta-steps-row {
          display: flex;
          align-items: stretch;
          justify-content: center;
          gap: 0;
          margin-bottom: 56px;
          flex-wrap: wrap;
        }

        /* Arrow connector */
        .cta-step-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--land-text-muted);
          padding: 0 4px;
          flex-shrink: 0;
          opacity: 0.5;
          margin-top: -10px;
        }

        /* Individual step card */
        .cta-step-card {
          flex: 1;
          min-width: 220px;
          max-width: 300px;
          padding: 36px 28px 28px;
          border-radius: 20px;
          background: var(--land-card-bg);
          border: 1px solid var(--land-border);
          box-shadow: 0 8px 30px var(--land-shadow);
          text-align: left;
          position: relative;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .cta-step-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          border-radius: 20px 20px 0 0;
          background: var(--land-border);
          transition: background 0.3s;
        }
        .cta-step-card:nth-child(1)::before { background: linear-gradient(90deg, #0ea5e9, #38bdf8); }
        .cta-step-card:nth-child(3)::before { background: var(--land-gold-grad); }
        .cta-step-card:nth-child(5)::before { background: linear-gradient(90deg, #059669, #10b981); }
        .cta-step-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px var(--land-shadow);
          border-color: var(--land-primary);
        }

        /* Step number */
        .cta-step-num {
          font-size: 0.65rem;
          font-weight: 900;
          color: var(--land-text-muted);
          letter-spacing: 0.12em;
          margin-bottom: 16px;
          opacity: 0.7;
        }

        /* Step icon */
        .cta-step-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }
        .cta-step-blue  { background: rgba(14, 165, 233, 0.12); color: #0ea5e9; }
        .cta-step-gold  { background: rgba(217, 119, 6, 0.12);  color: #d97706; }
        .cta-step-green { background: rgba(5, 150, 105, 0.12);  color: #059669; }
        [data-theme='dark'] .cta-step-blue  { background: rgba(56, 189, 248, 0.12); color: #38bdf8; }
        [data-theme='dark'] .cta-step-gold  { background: rgba(251, 191, 36, 0.12); color: #fbbf24; }
        [data-theme='dark'] .cta-step-green { background: rgba(52, 211, 153, 0.12); color: #34d399; }

        /* Step text */
        .cta-step-title {
          font-size: 1.05rem;
          font-weight: 900;
          color: var(--land-text);
          margin-bottom: 10px;
          line-height: 1.3;
        }
        .cta-step-desc {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--land-text-dim);
          line-height: 1.65;
          margin-bottom: 20px;
        }
        .cta-step-desc strong { color: var(--land-text); font-weight: 800; }
        .cta-step-desc code {
          font-family: 'Space Mono', 'Roboto Mono', monospace;
          font-size: 0.78rem;
          background: var(--land-glass-hover);
          padding: 2px 6px;
          border-radius: 5px;
          color: var(--land-primary);
        }

        /* Step hint pill */
        .cta-step-hint {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--land-success);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* Main CTA button */
        .btn-cta-main {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 18px 48px;
          background: var(--land-gold-grad);
          border: none;
          border-radius: 16px;
          color: #fff;
          font-weight: 900;
          font-size: 1.05rem;
          cursor: pointer;
          letter-spacing: 0.02em;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 28px rgba(217,119,6,0.4), 0 0 0 0 rgba(217,119,6,0);
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }
        .btn-cta-main::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%);
          border-radius: 16px;
          pointer-events: none;
        }
        [data-theme='dark'] .btn-cta-main {
          color: #000;
          box-shadow: 0 8px 28px rgba(251,191,36,0.35);
        }
        .btn-cta-main:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 16px 40px rgba(217,119,6,0.55);
          filter: brightness(1.05);
        }
        .btn-cta-main:active { transform: scale(0.98); }
        .cta-btn-arrow {
          transition: transform 0.25s ease;
        }
        .btn-cta-main:hover .cta-btn-arrow {
          transform: translateX(4px);
        }

        /* Security note */
        .cta-bottom-note {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--land-text-muted);
          letter-spacing: 0.02em;
        }

        /* 8. Footer */
        .landing-footer { 
          padding: 100px 40px 60px; 
          border-top: 1px solid var(--land-border-light); 
          background: var(--land-footer-bg);
          margin-top: 0;
          text-align: center;
        }
        .footer-links-horizontal {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 60px;
          flex-wrap: wrap;
          margin-bottom: 80px;
        }
        .footer-links-horizontal button {
          background: none;
          border: none;
          color: var(--land-text-dim);
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 10px;
        }
        .footer-links-horizontal button:hover {
          color: var(--land-primary);
        }
        .footer-bottom-centered {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--land-text-muted);
          letter-spacing: 0.05em;
        }

        @media (max-width: 900px) {
          .process-grid { grid-template-columns: 1fr; }
          .why-grid { grid-template-columns: 1fr; }
          .badges-bar { gap: 14px; padding: 20px 24px; }
          .cta-main-heading { font-size: 1.9rem; }
          .cta-steps-row { flex-direction: column; align-items: center; gap: 12px; }
          .cta-step-card { max-width: 100%; width: 100%; }
          .cta-step-arrow { transform: rotate(90deg); padding: 4px 0; }
          .btn-cta-main { width: 100%; justify-content: center; }
          .footer-links-horizontal { flex-direction: column; gap: 30px; margin-bottom: 60px; }
          .header-container { padding: 0 20px; }
          .hero-section { padding: 80px 20px; }
          .portal-card { padding: 40px 30px; }
        }
      `}</style>
    </div>
  );
};

/* ── Helpers ── */

const ProcessStep = ({ icon, title, desc, hint }) => (
  <div className="process-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
    <div>
      <div className="p-icon">{icon}</div>
      <h3>{title}</h3>
      <p style={{ marginBottom: hint ? '20px' : '0' }}>{desc}</p>
    </div>
    {hint && (
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--land-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 'auto', borderTop: '1px solid var(--land-border-light)', paddingTop: '12px', opacity: 0.8 }}>
        {hint}
      </div>
    )}
  </div>
);

const FaqItem = ({ q, a, active, toggle }) => (
  <div className="faq-item" onClick={toggle}>
    <div className="faq-q">
      {q}
      {active ? <Minus size={20} color="#38bdf8" /> : <Plus size={20} color="#38bdf8" />}
    </div>
    <AnimatePresence>
      {active && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          style={{ overflow: 'hidden' }}
        >
          <p className="faq-a">{a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default Landing;
