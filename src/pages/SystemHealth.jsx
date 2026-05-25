import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Cpu, Database, KeyRound, HardDrive, RefreshCw } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const SystemHealth = () => {
  const { t } = useLanguage();
  const [secondsSinceLastCheck, setSecondsSinceLastCheck] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsSinceLastCheck(s => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setSecondsSinceLastCheck(0);
      setLastCheckTime(new Date());
      setRefreshing(false);
    }, 600);
  };

  const systems = [
    {
      name: 'License Validation API',
      status: 'OPERATIONAL',
      uptime: '99.9%',
      latency: '34ms',
      icon: <KeyRound size={20} color="var(--electric-blue)" />,
      desc: 'Authenticates paired hardware MAC keys and generates cryptographic node tokens.'
    },
    {
      name: 'Credit Processing Gateway',
      status: 'OPERATIONAL',
      uptime: '100%',
      latency: '142ms',
      icon: <Database size={20} color="#a78bfa" />,
      desc: 'Handles transaction verification for Blockchain settlements (TRC-20 USDT) and manual wire approvals.'
    },
    {
      name: 'Node Registry Database',
      status: 'OPERATIONAL',
      uptime: '99.73%',
      latency: '12ms',
      icon: <HardDrive size={20} color="#10b981" />,
      desc: 'Stores active server variables, region associations, and secure cluster states.'
    },
    {
      name: 'Cryptographic Signing Layer',
      status: 'SECURE',
      uptime: '100%',
      latency: '<1ms',
      icon: <Cpu size={20} color="#f59e0b" />,
      desc: 'Encrypts payload signatures using AES-256 protocols to shield telemetry streams.'
    }
  ];

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Activity size={14} color="var(--electric-blue)" className="pulse" />
            <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.2em', color: 'var(--text-secondary)' }}>
              LIVE MONITORING CONSOLE
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {t('system_health')}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <div>LAST HEARTBEAT</div>
            <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: 2 }}>
              {secondsSinceLastCheck}s ago <span style={{ opacity: 0.5 }}>({lastCheckTime.toLocaleTimeString('en-GB')})</span>
            </div>
          </div>
          <button 
            className="btn glass" 
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{ padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Main Status Bar */}
      <div className="card" style={{ padding: '24px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass-bg)', borderLeft: '4px solid #10b981' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            All Infrastructure Online
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Systems are checking out correctly. Hardware node validations are running in compliance limits.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(16, 185, 129, 0.08)', padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <span className="status-dot green pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#10b981', letterSpacing: '0.05em' }}>100% OPERATIONAL</span>
        </div>
      </div>

      {/* Grid of Subsystems */}
      <div className="health-systems-grid">
        {systems.map((sys) => (
          <div key={sys.name} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                  {sys.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sys.name}</h4>
                  <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)' }}>LATENCY: {sys.latency}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.06)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#10b981' }}>{sys.status}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1, fontWeight: 600 }}>
              {sys.desc}
            </p>

            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>Historical Uptime (30d)</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sys.uptime}</span>
            </div>
            
            {/* Styled CSS Uptime Bar */}
            <div style={{ height: 4, background: 'var(--input-bg)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: sys.uptime.replace('%', ''), background: 'linear-gradient(90deg, var(--electric-blue), #10b981)', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemHealth;
