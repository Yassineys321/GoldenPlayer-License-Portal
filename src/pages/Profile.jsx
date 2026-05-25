import React from 'react';
import { User, Shield, Smartphone, Globe, Lock, Key } from 'lucide-react';

const Profile = () => {
  const mac = localStorage.getItem('user_mac') || 'Unknown Node';

  return (
    <div className="profile-root">
      <header className="page-header" style={{ marginBottom: 40 }}>
        <h1 className="white-text" style={{ fontSize: '2.2rem', fontWeight: 600 }}>User Profile</h1>
        <p className="text-secondary" style={{ fontWeight: 600 }}>Manage your hardware node security and settings</p>
      </header>

      <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        <section className="profile-card card" style={{ padding: 32 }}>
          <div className="card-head" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div className="glass" style={{ width: 64, height: 64, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--electric-blue)' }}>
              <User size={32} />
            </div>
            <div>
              <h3 className="white-text" style={{ fontSize: '1.4rem', fontWeight: 600 }}>Node Identity</h3>
              <span className="sky-title" style={{ fontSize: '0.75rem', fontWeight: 600 }}>VERIFIED HARDWARE</span>
            </div>
          </div>
          
          <div className="info-list" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoItem icon={<Smartphone size={18} />} label="MAC ADDRESS" value={mac} />
            <InfoItem icon={<Globe size={18} />} label="CLUSTER REGION" value="Global / Auto" />
            <InfoItem icon={<Shield size={18} />} label="ENCRYPTION" value="AES-256 Enabled" />
          </div>
        </section>

        <section className="security-card card" style={{ padding: 32 }}>
          <h3 className="white-text" style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 24 }}>Security Access</h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 32, fontWeight: 600 }}>
            Your hardware node is paired with this account. Changes to the node identifier require administrative approval.
          </p>
          
          <div className="actions" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-outline" style={{ border: '2px solid var(--sky-blue)', color: 'var(--sky-blue)', background: 'none' }}>CHANGE ACCESS KEY</button>
            <button className="btn btn-primary">RESTRICT SESSION</button>
          </div>
        </section>

      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ color: 'var(--sky-blue)', opacity: 0.8 }}>{icon}</div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{label}</span>
      <span className="white-text" style={{ fontSize: '0.95rem', fontWeight: 700 }}>{value}</span>
    </div>
  </div>
);

export default Profile;
