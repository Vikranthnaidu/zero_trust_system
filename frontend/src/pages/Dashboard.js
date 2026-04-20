// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resourceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const severityColor = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'critical' };

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await resourceAPI.getDashboard();
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard.');
        if (err.response?.status === 403) {
          setTimeout(() => navigate('/login'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={styles.page}>
      {/* Top nav */}
      <nav style={styles.nav}>
        <div style={styles.navBrand}>
          <span style={styles.navShield}>🛡️</span>
          <span style={styles.navTitle}>ZERO TRUST</span>
        </div>
        <div style={styles.navLinks}>
          {isAdmin && (
            <Link to="/admin" style={styles.navLink}>⚙ Admin</Link>
          )}
          <span style={styles.navUser}>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
            &nbsp;{user?.name}
          </span>
          <button style={styles.logoutBtn} onClick={handleLogout}>→ Logout</button>
        </div>
      </nav>

      <div style={styles.content}>
        {error && <div className="zt-alert zt-alert-error">✗ {error}</div>}

        {/* Welcome */}
        <div style={styles.welcome}>
          <h2 style={styles.welcomeTitle}>
            Welcome back, <span style={styles.nameHighlight}>{data?.user?.name}</span>
          </h2>
          <p style={styles.welcomeSub}>
            Last login: {data?.user?.lastLogin
              ? new Date(data.user.lastLogin).toLocaleString()
              : 'First login'}
          </p>
        </div>

        {/* Security status cards */}
        <div style={styles.statsGrid}>
          {[
            { label: 'MFA Status', value: data?.securityStatus?.mfaEnabled ? 'Enabled' : 'Disabled', icon: '🔐', color: 'var(--success)' },
            { label: 'Trusted Devices', value: data?.securityStatus?.trustedDevicesCount, icon: '💻', color: 'var(--info)' },
            { label: 'Access Level', value: user?.role?.toUpperCase(), icon: '🎖️', color: 'var(--accent-red)' },
            { label: 'Session', value: 'Active', icon: '🟢', color: 'var(--success)' }
          ].map((stat, i) => (
            <div key={i} style={styles.statCard}>
              <div style={styles.statIcon}>{stat.icon}</div>
              <div>
                <p style={styles.statLabel}>{stat.label}</p>
                <p style={{ ...styles.statValue, color: stat.color }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.twoCol}>
          {/* Trusted Devices */}
          <div className="zt-card">
            <h3 style={styles.sectionTitle}>💻 Trusted Devices</h3>
            {data?.trustedDevices?.length > 0 ? (
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>IP Address</th>
                    <th>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trustedDevices.map(d => (
                    <tr key={d.id}>
                      <td style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{d.deviceName}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{d.ipAddress}</td>
                      <td>{new Date(d.lastSeen).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={styles.empty}>No trusted devices yet</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="zt-card">
            <h3 style={styles.sectionTitle}>📋 Recent Activity</h3>
            {data?.recentActivity?.length > 0 ? (
              <div style={styles.activityList}>
                {data.recentActivity.map((log, i) => (
                  <div key={i} style={styles.activityItem}>
                    <div style={styles.activityLeft}>
                      <span className={`badge badge-${severityColor[log.severity] || 'user'}`}>
                        {log.severity}
                      </span>
                      <span style={styles.activityAction}>{log.action}</span>
                    </div>
                    <span style={styles.activityTime}>
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.empty}>No recent activity</p>
            )}
          </div>
        </div>

        {/* Resources */}
        <div className="zt-card" style={{ marginTop: '20px' }}>
          <h3 style={styles.sectionTitle}>📂 Available Resources</h3>
          <div style={styles.resourceGrid}>
            {data?.resources?.map((r, i) => (
              <div key={i} style={styles.resourceCard}>
                <div style={styles.resourceIcon}>📄</div>
                <p style={styles.resourceName}>{r.name}</p>
                <span className="badge badge-success">Accessible</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', flexDirection: 'column', gap: '12px' }}>
    <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent-red)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Loading secure dashboard...</p>
  </div>
);

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-primary)' },
  nav: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 32px', height: '60px',
    background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 100
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: '10px' },
  navShield: { fontSize: '20px' },
  navTitle: { fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, letterSpacing: '3px', color: 'var(--text-primary)' },
  navLinks: { display: 'flex', alignItems: 'center', gap: '20px' },
  navLink: { color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', fontFamily: 'var(--font-mono)', transition: 'color 0.2s' },
  navUser: { fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' },
  logoutBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-muted)', padding: '6px 14px',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    fontSize: '12px', fontFamily: 'var(--font-mono)',
    transition: 'all 0.2s'
  },
  content: { maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' },
  welcome: { marginBottom: '28px' },
  welcomeTitle: { fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 600, color: 'var(--text-primary)' },
  nameHighlight: { color: 'var(--accent-red)' },
  welcomeSub: { color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginTop: '4px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '20px',
    display: 'flex', alignItems: 'center', gap: '16px'
  },
  statIcon: { fontSize: '28px' },
  statLabel: { color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-mono)' },
  statValue: { fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', marginTop: '2px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '1px' },
  empty: { color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '20px' },
  activityList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  activityItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-sm)'
  },
  activityLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  activityAction: { fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' },
  activityTime: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  resourceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' },
  resourceCard: {
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '16px',
    textAlign: 'center', transition: 'border-color 0.2s'
  },
  resourceIcon: { fontSize: '28px', marginBottom: '8px' },
  resourceName: { color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }
};

export default Dashboard;