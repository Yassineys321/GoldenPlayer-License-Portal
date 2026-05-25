import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Cpu, UserCheck, AlertOctagon, XCircle, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../LanguageContext';

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const sections = [
    {
      title: t('terms_sec1_title'),
      text: t('terms_sec1_text'),
      icon: <Cpu size={22} color="var(--land-primary)" />
    },
    {
      title: t('terms_sec2_title'),
      text: t('terms_sec2_text'),
      icon: <UserCheck size={22} color="var(--land-primary)" />
    },
    {
      title: t('terms_sec3_title'),
      text: t('terms_sec3_text'),
      icon: <AlertOctagon size={22} color="var(--land-primary)" />
    },
    {
      title: t('terms_sec4_title'),
      text: t('terms_sec4_text'),
      icon: <XCircle size={22} color="var(--land-primary)" />
    },
    {
      title: t('terms_sec5_title'),
      text: t('terms_sec5_text'),
      icon: <Scale size={22} color="var(--land-primary)" />
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', padding: '60px 20px' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '800px', margin: '0 auto' }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'none', border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)', padding: '10px 20px', borderRadius: '12px',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            letterSpacing: '0.05em', marginBottom: '40px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--land-primary)'; e.currentTarget.style.borderColor = 'var(--land-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
        >
          <ArrowLeft size={16} /> {t('back')}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            marginBottom: '20px',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)'
          }}>
            <Shield size={40} color="var(--land-primary)" />
          </div>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            {t('terms_title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>
            {t('terms_subtitle')}
          </p>
        </div>

        {/* Intro Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card glass" 
          style={{ padding: '32px', marginBottom: '30px', borderLeft: '4px solid var(--land-primary)' }}
        >
          <p style={{ color: 'var(--text-primary)', fontSize: '1.15rem', opacity: 0.95, lineHeight: '1.7', fontWeight: 550 }}>
            {t('terms_intro')}
          </p>
        </motion.div>

        {/* Detailed Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.08 }}
              className="card glass"
              style={{ 
                padding: '28px 32px', 
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)'
                }}>
                  {section.icon}
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {section.title}
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', lineHeight: '1.7', margin: 0, opacity: 0.9 }}>
                {section.text}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Terms;
