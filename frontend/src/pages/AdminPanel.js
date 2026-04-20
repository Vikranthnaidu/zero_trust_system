// src/pages/AdminPanel.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resourceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    fetchAdmin();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const fetchAdmin = async () => {
    try {
      const res = await resourceAPI.getAdmin();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await resourceAPI.getLogs({ limit: 50 });
      setLogs(res.data.data);
    } catch (err) {
      setError('Failed to load logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleToggleUser = async (userId) => {
    setToggling(userId);
    try {
      await resourceAPI.toggleUser(userId);
      // Refresh admin data
      await fetchAdmin();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setToggling(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.navBrand}>
          <span>🛡️</span>
          <span style={styles.navTitle}>ZERO TRUST</span>
          <span style={styles.adminBadge}>ADMIN</span>
        </div>
        <div style={styles.navLinks}>
          <Link to="/dashboard" style={styles.navLink}>← Dashboard</Link>
          <span style={styles.navUser}>{user?.name}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div style={styles.content}>
        {error && <div className="zt-alert zt-alert-error">✗ {error}</div>}

        <h2 style={styles.pageTitle}>⚙ Admin Control Panel</h2>

        {/* Stats */}
        {data?.stats && (
          <div style={styles.statsGrid}>
            {[
              { label: 'Total Users', value: data.stats.totalUsers, color: 'var(--info)', icon: '👥' },
              { label: 'Active Users', value: data.stats.activeUsers, color: 'var(--success)', icon: '✅' },
              { label: 'Inactive Users', value: data.stats.inactiveUsers, color: 'var(--warning)', icon: '⛔' },
              { label: 'Critical Events (24h)', value: data.stats.criticalEventsLast24h, color: 'var(--danger)', icon: '🚨' },
              { label: 'Total Log Entries', value: data.stats.totalLogs, color: 'var(--text-secondary)', icon: '📋' }
            ].map((s, i) => (
              <div key={i} style={styles.statCard}>
                <span style={styles.statIcon}>{s.icon}</span>
                <span style={{ ...styles.statValue, color: s.color }}>{s.value}</span>
                <span style={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          {['users', 'logs'].map(tab => (
            <button
              key={tab}
              style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'users' ? '👥 Users' : '📋 Activity Logs'}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="zt-card">
            <h3 style={styles.sectionTitle}>User Management</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="zt-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Email</th><th>Role</th>
                    <th>Status</th><th>Devices</th><th>Registered</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users?.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{u.id}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{u.email}</td>
                      <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                      <td>
                        <span className={`badge badge-${u.isActive ? 'success' : 'danger'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {u.devices?.length || 0} trusted
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        {u.id !== user.id ? (
                          <button
                            className={`zt-btn ${u.isActive ? 'zt-btn-danger' : 'zt-btn-success'}`}
                            onClick={() => handleToggleUser(u.id)}
                            disabled={toggling === u.id}
                          >
                            {toggling === u.id ? '...' : u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>You</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="zt-card">
            <h3 style={styles.sectionTitle}>Activity Logs</h3>
            {logsLoading ? (
              <p style={styles.empty}>Loading logs...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="zt-table">
                  <thead>
                    <tr>
                      <th>Time</th><th>User</th><th>Action</th>
                      <th>Severity</th><th>IP</th><th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs?.logs?.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {log.user ? (
                            <div>
                              <div style={{ color: 'var(--text-primary)' }}>{log.user.name}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{log.user.email}</div>
                            </div>
                          ) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)' }}>
                          {log.action}
                        </td>
                        <td>
                          <span className={`badge badge-${
                            log.severity === 'CRITICAL' ? 'critical' :
                            log.severity === 'HIGH' ? 'danger' :
                            log.severity === 'MEDIUM' ? 'warning' : 'success'
                          }`}>
                            {log.severity}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          {log.ipAddress || '—'}
                        </td>
                        <td style={{ fontSize: '12px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ ...styles.empty, textAlign: 'right', marginTop: '12px' }}>
                  Showing {logs?.logs?.length} of {logs?.pagination?.total} entries
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', flexDirection: 'column', gap: '12px' }}>
    <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent-red)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Loading admin panel...</p>
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
  navTitle: { fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, letterSpacing: '3px' },
  adminBadge: {
    background: 'rgba(233,69,96,0.15)', color: 'var(--accent-red)',
    border: '1px solid rgba(233,69,96,0.3)', borderRadius: '4px',
    padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-mono)',
    letterSpacing: '1px'
  },
  navLinks: { display: 'flex', alignItems: 'center', gap: '20px' },
  navLink: { color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', fontFamily: 'var(--font-mono)' },
  navUser: { fontSize: '13px', color: 'var(--text-secondary)' },
  logoutBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-muted)', padding: '6px 14px',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px'
  },
  content: { maxWidth: '1400px', margin: '0 auto', padding: '32px 20px' },
  pageTitle: { fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)', letterSpacing: '2px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' },
  statCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '4px', textAlign: 'center'
  },
  statIcon: { fontSize: '24px' },
  statValue: { fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)' },
  statLabel: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '0' },
  tab: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    padding: '10px 20px', cursor: 'pointer', fontSize: '13px',
    fontFamily: 'var(--font-mono)', letterSpacing: '1px',
    borderBottom: '2px solid transparent', marginBottom: '-1px',
    transition: 'all 0.2s'
  },
  tabActive: { color: 'var(--accent-red)', borderBottomColor: 'var(--accent-red)' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '1px' },
  empty: { color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '12px 0' }
};

export default AdminPanel;