import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { rtdb, db, storage } from '../firebase';
import { ref as dbRef, onValue, update, push, set, get, runTransaction } from 'firebase/database';
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
  const [method,      setMethod]      = useState(null); // { type: 'CRYPTO' | 'BANK', coins, price, uniqueAmount }
  const [file,        setFile]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [timeLeft,    setTimeLeft]    = useState('');
  const [copied,      setCopied]      = useState('');
  const [activating,  setActivating]  = useState(false);
  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const { t } = useLanguage();
  const { success, error, warning, info } = useAlert();

  const mac = localStorage.getItem('user_mac');

  useEffect(() => {
    if (!mac) return;
    return onValue(dbRef(rtdb, 'users_balance/' + mac), s => {
      if (s.exists()) setCoins(s.val().coins || 0);
    });
  }, [mac]);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  // Countdown timer for Crypto Payment
  useEffect(() => {
    if (!method || method.type !== 'CRYPTO') return;

    const interval = setInterval(() => {
      const expiry = method.initTime + (2 * 60 * 60 * 1000); // 2 hours
      const diff = expiry - Date.now();
      
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        clearInterval(interval);
        return;
      }
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [method]);

  const handleSelectPlan = async (type, coinsObj, basePrice) => {
    let uniqueAmount = basePrice;
    let initTime = Date.now();
    
    if (type === 'LEMON_SQUEEZY') {
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
      return;
    }

    if (type === 'CRYPTO') {
      const cacheKey = `crypto_pending_${basePrice}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      
      // Use cached amount if it's less than 2 hours old
      if (cached && (Date.now() - cached.timestamp < 2 * 60 * 60 * 1000)) {
        uniqueAmount = cached.amount;
        initTime = cached.timestamp;
      } else {
        const cents = Math.floor(Math.random() * 99) + 1;
        uniqueAmount = +(basePrice + cents / 100).toFixed(2);
        localStorage.setItem(cacheKey, JSON.stringify({ amount: uniqueAmount, timestamp: initTime }));
      }
    }
    
    setFullName('');
    setEmail('');
    setFormSubmitted(false);
    setMethod({ type, coins: coinsObj, price: basePrice, uniqueAmount, initTime });
  };

  const verifyCryptoPayment = async () => {
    setLoading(true);
    try {
      const url = `https://api.trongrid.io/v1/accounts/${TRC20_WALLET}/transactions/trc20?contract_address=${USDT_CONTRACT}&only_confirmed=true&limit=20`;
      const response = await fetch(url, { headers: { "TRON-PRO-API-KEY": TRON_API_KEY } });
      const data = await response.json();
      
      if (!data || !data.data) {
        error("Failed to reach the blockchain. Please try again later.", 'Connection Error');
        setLoading(false); return;
      }

      const expectedValue = Math.floor(method.uniqueAmount * 1000000).toString();
      
      const match = data.data.find(tx => 
        tx.to === TRC20_WALLET && 
        tx.value === expectedValue &&
        tx.token_info.symbol === "USDT" &&
        new Date(tx.block_timestamp).getTime() > (method.initTime - 60000)
      );

      if (match) {
        // Auto-Credit Coins
        const balanceSnap = await get(dbRef(rtdb, 'users_balance/' + mac));
        const currentCoins = balanceSnap.exists() ? balanceSnap.val().coins || 0 : 0;
        await update(dbRef(rtdb, 'users_balance/' + mac), { coins: currentCoins + method.coins });
        
        // Log to Compliance Ledger
        // Log to Compliance Ledger (non-fatal try/catch)
        try {
          await push(dbRef(rtdb, 'audit_logs/' + mac), {
            timestamp: new Date().toISOString(),
            eventType: 'CREDIT_ACQUISITION',
            details: `Acquired ${method.coins} Credits via Blockchain Settlement (USDT TRC20) | Hash: ${match.transaction_id.substring(0, 12)}...`
          });
        } catch (auditErr) {
          console.warn("Audit log write failed:", auditErr.message);
        }

        // Log to Admin Ledger
        const r = push(dbRef(rtdb, 'pending_payments'));
        await set(r, {
          mac,
          fullName,
          email,
          method: 'Crypto (TRC20)',
          coins: method.coins,
          amount: method.uniqueAmount,
          timestamp: new Date().toISOString(),
          status: 'Approved (Auto)',
          txId: match.transaction_id,
          type: 'Deposit'
        });

        await sendTelegramAlert(`✅ <b>New Auto-Payment:</b>\n\n<code>${mac}</code> just added ${method.coins} Credits via USDT!\nAmount: ${method.uniqueAmount} USDT`);

        setPaymentSuccess(true);
        setTimeout(() => { setPaymentSuccess(false); setMethod(null); }, 2000);
      } else {
        warning("Payment not found on the blockchain yet.\n\nTransactions take 1-3 minutes to confirm. Please wait a moment and click Verify again.", 'Verification Pending');
      }
    } catch (err) {
      error("Error verifying payment on blockchain.", 'Verification Error');
    }
    setLoading(false);
  };

  const submitPayment = async () => {
    if (!method) return;
    
    if (method.type === 'CRYPTO') {
      return verifyCryptoPayment();
    }

    if (method.type === 'BANK' && !file) return;
    
    setLoading(true);
    try {
      // Helper to prevent hanging indefinitely
      const withTimeout = (promise, ms, name) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timed out! Refresh the page.`)), ms))
      ]);

      let imageUrl = null;
      if (file) {
        const snap = await withTimeout(uploadBytes(stRef(storage, `receipts/${mac}_${Date.now()}`), file), 10000, "Image Upload");
        imageUrl = await getDownloadURL(snap.ref);
      }

      // Switch to RTDB to prevent Firestore network hangs
      const newReqRef = push(dbRef(rtdb, 'payment_requests'));
      await withTimeout(set(newReqRef, {
        mac,
        fullName,
        email,
        method: 'Paysera Bank Transfer',
        imageUrl,
        coins: method.coins,
        amount: method.price,
        timestamp: new Date().toISOString(),
        status: 'Pending',
        type: 'Deposit'
      }), 10000, "Database Save");

      // Log to Compliance Ledger (non-fatal try/catch)
      try {
        await push(dbRef(rtdb, 'audit_logs/' + mac), {
          timestamp: new Date().toISOString(),
          eventType: 'WIRE_TRANSFER_REQUESTED',
          details: `Initiated SEPA Wire Transfer request for ${method.coins} Credits | Amount: ${method.price} EUR`
        });
      } catch (auditErr) {
        console.warn("Audit log write failed:", auditErr.message);
      }

      await withTimeout(sendTelegramAlert(`⏳ <b>New Manual Request:</b>\n\n<code>${mac}</code> uploaded a Paysera screenshot.\nAmount: ${method.price} EUR\nCheck Admin Panel!`), 5000, "Telegram Alert");

      setPaymentSuccess(true);
      setTimeout(() => { setPaymentSuccess(false); setMethod(null); setFile(null); }, 3000);
    } catch (err) {
      console.error("Payment Submission Error:", err);
      error('Error: ' + err.message + '\n\nMake sure you refreshed the page (F5) after creating the Storage.', 'Submission Error');
    } finally { 
      setLoading(false); 
    }
  };

  const handleActivate = async (type) => {
    const cost = type === 'LIFETIME' ? 20 : type === 'TEST' ? 1 : 10;
    setActivating(type);
    let deductedSuccessfully = false;
    try {
      // ─── ATOMIC TRANSACTION: Prevents Race Conditions ───────────────────
      // runTransaction guarantees the read + write is a single atomic server
      // operation. Even if the user presses the button on two devices at the
      // same time, Firebase will only allow ONE deduction to succeed.
      const balanceRef = dbRef(rtdb, 'users_balance/' + mac);
      const txResult = await runTransaction(balanceRef, (currentData) => {
        // currentData is the latest server value — no stale cache
        const currentCoins = currentData?.coins ?? 0;
        if (currentCoins < cost) {
          // Return undefined to ABORT the transaction (no write happens)
          return undefined;
        }
        // Return the new value to COMMIT the deduction atomically
        return { ...currentData, coins: currentCoins - cost };
      });

      if (!txResult.committed) {
        // Transaction was aborted — insufficient coins at the server level
        warning(t('insufficient_coins'), 'Insufficient Balance');
        setActivating(false);
        return;
      }
      deductedSuccessfully = true;

      // ─── DEVICE EXPIRY UPDATE (runs only after confirmed deduction) ─────
      const dSnap = await get(dbRef(rtdb, 'devices/' + mac));
      let expiryDate = null;
      if (dSnap.exists() && dSnap.val().expiryDate) {
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

      // Log to Compliance Ledger (non-fatal try/catch)
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
      // If device update failed AFTER coins were already deducted,
      // refund the coins so the user doesn't lose them.
      if (deductedSuccessfully) {
        try {
          await runTransaction(dbRef(rtdb, 'users_balance/' + mac), (d) => ({
            ...d, coins: (d?.coins ?? 0) + cost
          }));
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
            onSelect={(type) => handleSelectPlan(type, 10, 10.00)}
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
            onSelect={(type) => handleSelectPlan(type, 20, 20.00)}
            userCoins={coins}
            activating={activating}
            planType="LIFETIME"
            onActivate={() => handleActivate('LIFETIME')}
          />
        </div>

      </section>

      <AnimatePresence>
        {method && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="modal-content card" style={{ width: '100%', maxWidth: method.type === 'BANK' ? 500 : 650, padding: '20px', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.modal-content::-webkit-scrollbar { display: none; }`}</style>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h4 style={{ fontWeight: 600, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                  {method.type === 'CRYPTO' ? <><Wallet size={20}/> {t('crypto_payment')}</> : `${t('bank_transfer')} (Paysera)`}
                </h4>
                <button onClick={() => { setMethod(null); setFormSubmitted(false); }} style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}><X size={16} /></button>
              </div>

              <div className="modal-body" style={{ flex: 1 }}>
                {!formSubmitted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10
                    }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Plan</span>
                        <h5 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                          {method.coins === 1 ? t('evaluation_license') : method.coins === 10 ? t('standard_annual') : t('perpetual_enterprise')}
                        </h5>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Credits</span>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--electric-blue)', marginTop: 2 }}>
                          {method.coins} {t('coins')}
                        </div>
                      </div>
                    </div>

                    <h5 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Billing Information
                    </h5>
                    <p className="text-secondary" style={{ fontSize: '0.8rem', lineHeight: 1.4, marginBottom: 12 }}>
                      Please provide your billing details to generate your professional PDF invoice and receive your license activation credentials.
                    </p>

                    <div className="m-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
                      <input 
                        type="text" 
                        placeholder="John Doe" 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 14px', color: 'var(--text-primary)', width: '100%', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div className="m-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
                      <input 
                        type="email" 
                        placeholder="john@example.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px 14px', color: 'var(--text-primary)', width: '100%', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <button 
                      style={{ 
                        width: '100%', 
                        padding: '14px 0', 
                        fontSize: '0.95rem', 
                        fontWeight: 600, 
                        borderRadius: 16, 
                        border: 'none', 
                        cursor: (!fullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? 'not-allowed' : 'pointer',
                        background: 'var(--electric-blue)',
                        color: '#0b1120',
                        marginTop: 16,
                        transition: 'all 0.3s',
                        opacity: (!fullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? 0.6 : 1
                      }}
                      disabled={!fullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)} 
                      onClick={() => setFormSubmitted(true)}
                    >
                      Continue to Payment Instructions
                    </button>
                  </div>
                ) : (
                  <>
                    {method.type === 'CRYPTO' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* ORDER SUMMARY BANNER */}
                        <div style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          padding: '16px 20px',
                          borderRadius: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Plan</span>
                            <h5 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                              {method.coins === 1 ? t('evaluation_license') : method.coins === 10 ? t('standard_annual') : t('perpetual_enterprise')}
                            </h5>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Credits</span>
                            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--electric-blue)', marginTop: 2 }}>
                              {method.coins} {t('coins')}
                            </div>
                          </div>
                        </div>

                        {/* TOP: WALLET & QR */}
                        <div className="flex-stack-mobile" style={{ gap: 20, alignItems: 'center', background: 'var(--input-bg)', padding: 20, borderRadius: 20, border: '1px solid var(--glass-border)' }}>
                           <div style={{ background: '#fff', padding: 10, borderRadius: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', width: 120, height: 120, flexShrink: 0, margin: '0 auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                             <QRCodeSVG value={TRC20_WALLET} size={100} />
                           </div>
                           <div style={{ flex: 1, width: '100%' }}>
                              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>USDT (TRC20) Wallet Address</label>
                              <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '12px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <code style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700, wordBreak: 'break-all', fontFamily: 'monospace' }}>{TRC20_WALLET}</code>
                                <button onClick={() => copy(TRC20_WALLET, 'w')} style={{ background: 'var(--electric-blue)', border: 'none', borderRadius: 8, padding: 8, color: '#0b1120', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {copied === 'w' ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                              </div>
                           </div>
                        </div>
                        
                        {/* BOTTOM: AMOUNT & TIMER */}
                        <div style={{ 
                          padding: '20px', 
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.03) 100%)', 
                          borderRadius: 20, 
                          border: '1.5px solid rgba(16, 185, 129, 0.35)', 
                          textAlign: 'center',
                          boxShadow: '0 8px 30px rgba(16, 185, 129, 0.05)'
                        }}>
                           <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#10b981', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('exact_amount')}</label>
                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
                              <span style={{ fontSize: '2.8rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-1.5px' }}>{method.uniqueAmount}</span>
                              <span style={{ fontSize: '1.15rem', fontWeight: 600, color: '#10b981', marginTop: 14 }}>USDT</span>
                              <button onClick={() => copy(method.uniqueAmount.toString(), 'a')} style={{ background: 'rgba(16, 185, 129, 0.15)', border: 'none', color: '#10b981', padding: '10px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 {copied === 'a' ? <Check size={18} /> : <Copy size={18} />}
                              </button>
                           </div>
                           <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(239, 68, 68, 0.08)', padding: '8px 16px', borderRadius: 12, color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                              <Clock size={15} /> {t('time_left') || 'Expiration'}: {timeLeft}
                           </div>
                           <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 14, lineHeight: 1.5 }}>
                             Please initiate settlement for the exact amount above. Automated credit provisioning will trigger once confirmed on-chain.
                           </p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="m-group">
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>SEPA WIRE TRANSFER DETAILS</label>
                          <div className="glass" style={{ padding: 10, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <DetailRow label="IBAN" value="LT963500010019003321" onCopy={() => copy('LT963500010019003321', 'iban')} copied={copied==='iban'} />
                            <DetailRow label="Bank Name" value="Paysera LT, UAB" />
                            <DetailRow label="SWIFT/BIC" value="EVIULT2VXXX" onCopy={() => copy('EVIULT2VXXX', 'bic')} copied={copied==='bic'} />
                            <DetailRow label="Recipient" value="Yassine Karbal" />
                            <DetailRow label="Bank Address" value="Pilaitės pr. 16, Vilnius, LT-04352, Lithuania" />
                            <DetailRow label="Reference Code" value={`REF-${mac ? mac.replace(/:/g, '').substring(0, 12).toUpperCase() : 'LICENSE'}`} onCopy={() => copy(`REF-${mac ? mac.replace(/:/g, '').substring(0, 12).toUpperCase() : 'LICENSE'}`, 'ref')} copied={copied==='ref'} />
                            <DetailRow label="Amount to Send" value={`${method.price.toFixed(2)} EUR`} highlight />
                          </div>
                        </div>
                        
                        <div className="m-group">
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('upload_proof').toUpperCase()}</label>
                          <div className="m-upload glass" style={{ padding: 12, borderRadius: 12, position: 'relative', textAlign: 'center', border: '1px dashed var(--glass-border)', background: 'var(--input-bg)' }}>
                             <input type="file" onChange={e => setFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} accept="image/*" />
                             <Upload size={20} style={{ color: 'var(--electric-blue)', margin: '0 auto 6px' }} />
                             <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file ? file.name : 'Upload Wire Transfer Confirmation Document (PDF/Image)'}</p>
                             <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>Required for compliance reconciliation and manual credit provisioning.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button 
                      style={{ 
                        width: '100%', 
                        padding: '14px 0', 
                        fontSize: '1rem', 
                        fontWeight: 600, 
                        borderRadius: 16, 
                        border: 'none', 
                        cursor: loading || (method.type === 'BANK' && !file) ? 'not-allowed' : 'pointer',
                        background: method.type === 'CRYPTO' 
                          ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                          : 'var(--electric-blue)',
                        color: method.type === 'CRYPTO' ? '#fff' : '#0b1120',
                        marginTop: 16,
                        boxShadow: method.type === 'CRYPTO' ? '0 8px 20px rgba(16, 185, 129, 0.3)' : 'none',
                        transition: 'all 0.3s',
                        opacity: loading || (method.type === 'BANK' && !file) ? 0.6 : 1
                      }}
                      disabled={loading || (method.type === 'BANK' && !file)} 
                      onClick={submitPayment}
                    >
                      {loading ? 'VERIFYING...' : paymentSuccess ? 'CONFIRMED ✅' : (method.type === 'CRYPTO' ? 'VERIFY BLOCKCHAIN TRANSACTION' : 'SUBMIT DEPOSIT FOR REVIEW')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailRow = ({ label, value, onCopy, copied, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: highlight ? '#10b981' : 'var(--text-primary)' }}>{value}</span>
      {onCopy && (
        <button onClick={onCopy} style={{ background: 'none', border: 'none', color: 'var(--electric-blue)', cursor: 'pointer', padding: 0 }}>
          {copied ? <Check size={14} color="#10b981"/> : <Copy size={14} />}
        </button>
      )}
    </div>
  </div>
);

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
            {['BANK', 'CRYPTO', 'LEMON_SQUEEZY'].map((method, i) => (
              <button
                key={method}
                onClick={(e) => { e.stopPropagation(); onSelect(method); }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = tierColor; e.currentTarget.style.color = tierColor; e.currentTarget.style.background = `${tierColor}10`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--input-bg)'; }}
                style={{ height: 30, padding: '0 12px', fontSize: '0.6rem', fontWeight: 600, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-secondary)', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
              >
                {['SEPA', 'TRC20', 'CARD'][i]}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Premium card for 1YEAR and LIFETIME
  const gradientHeader = planType === '1YEAR'
    ? 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)'
    : 'linear-gradient(135deg, rgba(245,158,11,0.14) 0%, rgba(251,191,36,0.05) 100%)';

  const paymentOptions = [
    { method: 'BANK',         label: 'SEPA',  emoji: '🏦' },
    { method: 'CRYPTO',       label: 'TRC20', emoji: '₮'  },
    { method: 'LEMON_SQUEEZY',label: 'Card',  emoji: '💳' },
  ];

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {paymentOptions.map(({ method, label, emoji }) => (
                <button
                  key={method}
                  onClick={(e) => { e.stopPropagation(); onSelect(method); }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = tierColor;
                    e.currentTarget.style.color = tierColor;
                    e.currentTarget.style.background = `${tierColor}12`;
                    e.currentTarget.style.boxShadow = `0 4px 14px ${tierColor}25`;
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
                    padding: '9px 4px', fontSize: '0.62rem', fontWeight: 700,
                    borderRadius: 10, border: '1px solid var(--glass-border)',
                    background: 'var(--input-bg)', color: 'var(--text-secondary)',
                    cursor: 'pointer', textTransform: 'uppercase',
                    letterSpacing: '0.04em', transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}
                >
                  <span style={{ fontSize: '0.85rem' }}>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Store;
