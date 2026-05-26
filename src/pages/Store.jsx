import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { rtdb, db, storage } from '../firebase';
import { ref as dbRef, onValue, update, push, set, get } from 'firebase/database';
import { collection, addDoc } from 'firebase/firestore';
import { ref as stRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Coins, Zap, CheckCircle, Clock, Upload, Wallet, Activity,
  CreditCard, Copy, Check, ChevronDown, ShieldCheck, X, Star,
  ArrowRight, Info, AlertCircle, History, Sparkles, ChevronRight,
  Headphones, Users, Layers, Globe, Landmark, Lock, Crown, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';
import { useAlert } from '../context/AlertContext';

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

const TRON_API_KEY = '6b092603-47e5-4fdd-83cd-bfda97c6dd65';
const USDT_CONTRACT = 'TR7NHqJEH7161iLpX8X'; // USDT Token Contract
const TRC20_WALLET = 'TS1oHcXCVo1s4bhLzknv2WoDs83rbv5jeK'; // Updated Main Wallet

const TELEGRAM_TOKEN = import.meta.env.VITE_TELEGRAM_TOKEN || '';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

const sendTelegramAlert = async (text) => {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
    });
  } catch (e) {
    console.error('Telegram error', e);
  }
};

const Store = () => {
  const [coins,       setCoins]       = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [activating,  setActivating]  = useState(false);
  const { t } = useLanguage();
  const { success, error, warning, info } = useAlert();

  const mac = localStorage.getItem('user_mac');

  useEffect(() => {
    if (!mac) return;
    // ── Single source of truth: devices/${mac}/coins ─────────────────────────
    return onValue(dbRef(rtdb, 'devices/' + mac), s => {
      if (s.exists()) setCoins(s.val().coins || 0);
    });
  }, [mac]);

  const handleSelectPlan = async (coinsObj) => {
    try {
      setLoading(true);
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${BACKEND_URL}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, coins: coinsObj })
      });
      const data = await response.json();
      
      if (data.success && data.url) {
        window.open(data.url, '_blank');
      } else {
        error(`Error generating checkout: ${data.message}`, 'Checkout Failed');
      }
    } catch (err) {
      error("Failed to connect to backend payment server.", 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (type) => {
    setActivating(type);
    let deductedSuccessfully = false;
    let cost = 0;
    try {
      // 1. Auto-register device if it doesn't exist yet
      let dSnap = await get(dbRef(rtdb, 'devices/' + mac));
      if (!dSnap.exists()) {
        const autoKey = generateDeterministicDeviceKey(mac);
        await set(dbRef(rtdb, 'devices/' + mac), {
          macAddress: mac, status: 'Expired', coins: 0,
          expiryDate: null, deviceKey: autoKey,
          autoRegistered: true, registeredAt: new Date().toISOString(),
        });
        dSnap = await get(dbRef(rtdb, 'devices/' + mac));
      }

      // 2. Migrate any legacy users_balance coins → devices/${mac}/coins
      const legacySnap = await get(dbRef(rtdb, 'users_balance/' + mac));
      if (legacySnap.exists()) {
        const legacyCoins = legacySnap.val()?.coins || 0;
        if (legacyCoins > 0) {
          const currentCoins = dSnap.val()?.coins || 0;
          await update(dbRef(rtdb, 'devices/' + mac), { coins: currentCoins + legacyCoins });
          await set(dbRef(rtdb, 'users_balance/' + mac), null);
          dSnap = await get(dbRef(rtdb, 'devices/' + mac));
          console.log(`[Store] 🔄 Migrated ${legacyCoins} legacy coins → devices/${mac}`);
        }
      }

      cost = type === 'LIFETIME' ? 20 : type === 'TEST' ? 1 : 10;

      // 3. Read current coins from devices/${mac}/coins (single source of truth)
      const currentCoins = dSnap.val()?.coins || 0;
      if (currentCoins < cost) {
        warning(t('insufficient_coins'), 'Insufficient Balance');
        setActivating(false);
        return;
      }

      // 4. Deduct coins directly from devices/${mac}/coins
      await update(dbRef(rtdb, 'devices/' + mac), { coins: currentCoins - cost });
      deductedSuccessfully = true;

      // 5. Update device expiry
      let expiryDate = null;
      if (dSnap.val()?.expiryDate) {
        expiryDate = new Date(dSnap.val().expiryDate);
      }

      const now = new Date();
      let newExpiry;

      if (type === 'LIFETIME') {
        const randomYear = Math.floor(Math.random() * (3100 - 3000 + 1)) + 3000;
        newExpiry = new Date(`${randomYear}-12-31T23:59:59Z`);
      } else if (type === 'TEST') {
        newExpiry = expiryDate && expiryDate > now ? new Date(expiryDate) : new Date();
        newExpiry.setDate(newExpiry.getDate() + 1);
      } else {
        newExpiry = expiryDate && expiryDate > now ? new Date(expiryDate) : new Date();
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      }

      await update(dbRef(rtdb, 'devices/' + mac), {
        status: 'Active',
        expiryDate: newExpiry.toISOString(),
        lastPlan: type
      });

      // 6. Audit log
      try {
        await push(dbRef(rtdb, 'audit_logs/' + mac), {
          timestamp: new Date().toISOString(),
          eventType: 'LICENSE_DEPLOYED',
          details: `License deployed: ${type} | Cost: ${cost} Credits`
        });
      } catch (auditErr) {
        console.warn("Audit log write failed:", auditErr.message);
      }

      success(t('success_activation'), 'License Deployed');
    } catch (err) {
      console.error('Activation error:', err);
      // Refund coins to devices/${mac}/coins if device update failed after deduction
      if (deductedSuccessfully && cost > 0) {
        try {
          const refundSnap = await get(dbRef(rtdb, 'devices/' + mac));
          const refundCoins = refundSnap.val()?.coins || 0;
          await update(dbRef(rtdb, 'devices/' + mac), { coins: refundCoins + cost });
          console.log(`[Store] 💰 Refunded ${cost} coins to devices/${mac}`);
        } catch (refundErr) {
          console.error('Refund failed:', refundErr);
        }
      }
      error(t('error_activation'), 'Activation Error');
    }
    setActivating(false);
  };


  return (
    <div className="store-root">
      
      <header className="store-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('activation')}</h1>
        <div className="sh-meta" style={{ display: 'flex', gap: 12 }}>
           <div className="sh-badge glass sky-title"><Coins size={14} /> <span>{coins} {t('coins')}</span></div>
        </div>
      </header>

      <section className="buy-section card" style={{ padding: '32px', marginBottom: '24px' }}>
        <div className="section-head" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Coins size={20} className="sky-title" /> {t('credit_acquisition')}
          </h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem', maxWidth: 600 }}>
            Acquire computational credits to deploy enterprise software licensing. Blockchain settlements are automatically validated on-chain.
          </p>
        </div>

        {/* 1-Year + Lifetime – side-by-side compact squares */}
        <div className="grid grid-cols-2 gap-4 w-full mb-10">
          <PlanCard 
            title={t('standard_annual')} 
            desc="Standard enterprise license with 1 Year coverage and hardware node pairing." 
            price={10.00}
            coins={10}
            icon={<Zap size={22} />}
            onSelect={() => handleSelectPlan(10)}
            userCoins={coins}
            activating={activating}
            planType="1YEAR"
            onActivate={() => handleActivate('1YEAR')}
          />
          <PlanCard 
            title={t('perpetual_enterprise')} 
            desc="Perpetual enterprise license providing permanent node coverage and lifetime SLA." 
            price={20.00}
            coins={20}
            icon={<Crown size={22} />}
            featured
            onSelect={() => handleSelectPlan(20)}
            userCoins={coins}
            activating={activating}
            planType="LIFETIME"
            onActivate={() => handleActivate('LIFETIME')}
          />
        </div>

      </section>
    </div>
  );
};

const PlanCard = ({ title, desc, price, coins, icon, featured, onSelect, userCoins, activating, planType, onActivate, fullWidth = false }) => {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const canActivate = userCoins >= coins;
  const isThisActivating = activating === planType;

  const tierColor = planType === 'TEST'
    ? '#0ea5e9'
    : planType === '1YEAR'
    ? '#6366f1'
    : '#f59e0b';

  const btnBg = planType === 'TEST'
    ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
    : planType === '1YEAR'
    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';

  const cardStyle = {
    border: `1px solid ${hovered ? tierColor : 'var(--glass-border)'}`,
    background: 'var(--card-bg)',
    boxShadow: hovered
      ? `0 10px 30px rgba(0,0,0,0.1), 0 0 20px ${tierColor}22`
      : '0 2px 8px rgba(0,0,0,0.06)',
    transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    cursor: 'pointer',
    borderRadius: 16,
  };

  const iconBoxStyle = {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    background: `${tierColor}14`,
    color: tierColor,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${tierColor}30`,
    boxShadow: hovered ? `0 0 14px ${tierColor}30` : 'none',
    transition: 'all 0.25s',
  };

  const coinBadgeStyle = {
    padding: '2px 8px', borderRadius: 6, fontSize: '0.6rem', fontWeight: 600,
    background: `${tierColor}15`,
    color: tierColor,
    border: `1px solid ${tierColor}30`,
    whiteSpace: 'nowrap',
  };

  // Full-width horizontal row for TEST plan
  if (fullWidth) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', height: 76, gap: 20 }}
      >
        {/* Left: Icon */}
        <div style={iconBoxStyle}>
          {React.cloneElement(icon, { size: 18 })}
        </div>

        {/* Middle: Text */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
              {title}
            </h4>
            <span style={coinBadgeStyle}>{coins} Coins ({price.toFixed(2)} EUR)</span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</p>
        </div>

        {/* Right: Actions */}
        {canActivate ? (
          <button
            onClick={onActivate}
            disabled={!!activating}
            style={{ background: btnBg, boxShadow: hovered ? `0 0 15px ${tierColor}44` : 'none', padding: '8px 20px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700, color: '#fff', border: 'none', cursor: !!activating ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0, opacity: !!activating ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
          >
            {isThisActivating ? <Activity size={12} /> : <div className="status-dot-pulse" />}
            {isThisActivating ? 'Activating...' : 'Deploy'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = tierColor; e.currentTarget.style.color = tierColor; e.currentTarget.style.background = `${tierColor}10`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--input-bg)'; }}
              style={{ height: 30, padding: '0 12px', fontSize: '0.6rem', fontWeight: 600, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-secondary)', cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={loading}
            >
              <CreditCard size={12} />
              Card
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // Premium card for 1YEAR and LIFETIME
  const gradientHeader = planType === '1YEAR'
    ? 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)'
    : 'linear-gradient(135deg, rgba(245,158,11,0.14) 0%, rgba(251,191,36,0.05) 100%)';

  // consolidated under Lemon Squeezy card payments

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
        display: 'flex', flexDirection: 'column',
        width: '100%', overflow: 'hidden',
        boxShadow: hovered
          ? `0 20px 50px rgba(0,0,0,0.12), 0 0 0 1.5px ${tierColor}, 0 0 30px ${tierColor}20`
          : `0 4px 20px rgba(0,0,0,0.07), 0 0 0 1px var(--glass-border)`,
        border: 'none',
      }}
    >
      {/* ── Gradient Header Area ── */}
      <div style={{
        background: gradientHeader,
        padding: '20px 20px 16px',
        borderBottom: `1px solid ${tierColor}20`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow blob */}
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: `radial-gradient(circle, ${tierColor}25 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Top row: Icon + Badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            ...iconBoxStyle,
            width: 48, height: 48, borderRadius: 14,
            background: `${tierColor}20`,
            border: `1.5px solid ${tierColor}40`,
            boxShadow: `0 4px 16px ${tierColor}25`,
          }}>
            {React.cloneElement(icon, { size: 22 })}
          </div>
          {featured ? (
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: '0.58rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(245,158,11,0.35)' }}>
              👑 BEST VALUE
            </span>
          ) : (
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: '0.58rem', fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
              ✨ POPULAR
            </span>
          )}
        </div>

        {/* Title */}
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {title}
        </h4>

        {/* Price row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: tierColor, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {price.toFixed(2)}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>EUR</span>
          <span style={{
            marginLeft: 4, padding: '2px 8px', borderRadius: 20,
            fontSize: '0.6rem', fontWeight: 700,
            background: `${tierColor}18`, color: tierColor,
            border: `1px solid ${tierColor}35`,
          }}>
            {coins} Coins
          </span>
        </div>
      </div>

      {/* ── Features List ── */}
      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {(planType === '1YEAR' ? [
          'Activates Android player for 1 year',
          'Locked to your device hardware',
          'Access to all premium features',
          'Renew anytime before expiry',
        ] : [
          'Activates Android player permanently',
          'Locked to your device hardware',
          'Access to all premium features',
          'Pay once — valid forever',
        ]).map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: `${tierColor}15`,
              border: `1.5px solid ${tierColor}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 6px ${tierColor}15`,
            }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke={tierColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>{text}</span>
          </div>
        ))}
      </div>

      {/* ── Bottom Action ── */}
      <div style={{ padding: '0 20px 20px' }}>
        {canActivate ? (
          <button
            onClick={onActivate}
            disabled={!!activating}
            style={{
              background: btnBg,
              boxShadow: hovered ? `0 6px 24px ${tierColor}55` : `0 3px 12px ${tierColor}30`,
              width: '100%', padding: '12px 0', borderRadius: 12,
              fontSize: '0.78rem', fontWeight: 700, color: '#fff',
              border: 'none', cursor: !!activating ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              opacity: !!activating ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {isThisActivating ? <Activity size={13} /> : <div className="status-dot-pulse" />}
            {isThisActivating ? 'Activating...' : 'Activate Now'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Buy Coins to Activate:
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tierColor;
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = tierColor;
                e.currentTarget.style.boxShadow = `0 4px 14px ${tierColor}30`;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'var(--input-bg)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: 12,
                border: '1px solid var(--glass-border)',
                background: 'var(--input-bg)',
                color: 'var(--text-secondary)',
                cursor: loading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              disabled={loading}
            >
              <CreditCard size={14} />
              {loading ? 'Processing...' : 'Buy via Card'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Store;
