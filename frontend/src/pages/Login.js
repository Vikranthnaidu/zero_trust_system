// src/pages/Login.js
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if redirected due to session expiry
  const sessionExpired = new URLSearchParams(location.search).get('reason') === 'session_expired';

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await authAPI.login(form);
      const { data } = res.data;

      if (data.requiresMfa) {
        // New device detected → go to OTP page
        navigate('/verify-otp', {
          state: {
            userId: data.userId,
            email: data.email,
            devOtp: data.devOtp // only present in dev mode
          }
        });
      } else {
        // Trusted device → login complete
        login(data.user, data.accessToken, data.refreshToken);
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />
      <div style={styles.scanline} />

      <div style={styles.container} className="fade-in">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.shield}>🛡️</div>
          <h1 style={styles.title}>ZERO TRUST</h1>
          <p style={styles.subtitle}>Secure Remote Access System</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>ACCESS TERMINAL</span>
            <span style={styles.dot} />
          </div>

          {sessionExpired && (
            <div className="zt-alert zt-alert-warning">
              ⚠ Session expired. Please authenticate again.
            </div>
          )}
          {error && <div className="zt-alert zt-alert-error">✗ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="zt-field">
              <label className="zt-label">Identity (Email)</label>
              <input
                className="zt-input"
                type="email"
                name="email"
                placeholder="operator@zerotrust.io"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="zt-field">
              <label className="zt-label">Passphrase</label>
              <input
                className="zt-input"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>

            <button className="zt-btn zt-btn-primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span style={styles.spinner} />
                  AUTHENTICATING...
                </>
              ) : '→ AUTHENTICATE'}
            </button>
          </form>

          <p style={styles.footer}>
            No account?{' '}
            <Link to="/register" style={styles.link}>Register access</Link>
          </p>
        </div>

        <p style={styles.zeroTrustNote}>
          🔒 Zero Trust Architecture · Never Trust, Always Verify
        </p>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px'
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(rgba(233,69,96,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(233,69,96,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none'
  },
  scanline: {
    position: 'absolute', left: 0, right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, rgba(233,69,96,0.1), transparent)',
    animation: 'scanline 8s linear infinite',
    pointerEvents: 'none'
  },
  container: {
    width: '100%', maxWidth: '420px',
    position: 'relative', zIndex: 1
  },
  header: { textAlign: 'center', marginBottom: '32px' },
  shield: { fontSize: '48px', marginBottom: '12px', display: 'block' },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '32px', fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '6px',
    marginBottom: '4px'
  },
  subtitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px', color: 'var(--text-muted)',
    letterSpacing: '2px', textTransform: 'uppercase'
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '32px',
    boxShadow: 'var(--shadow-card)',
    position: 'relative',
    overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '24px', paddingBottom: '16px',
    borderBottom: '1px solid var(--border)'
  },
  cardTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px', color: 'var(--text-muted)',
    letterSpacing: '2px'
  },
  dot: {
    width: '8px', height: '8px',
    borderRadius: '50%', background: 'var(--success)',
    boxShadow: '0 0 8px var(--success)',
    animation: 'pulse 2s infinite'
  },
  spinner: {
    width: '14px', height: '14px',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite'
  },
  footer: {
    textAlign: 'center', marginTop: '20px',
    color: 'var(--text-muted)', fontSize: '13px'
  },
  link: { color: 'var(--accent-red)', textDecoration: 'none', fontWeight: 500 },
  zeroTrustNote: {
    textAlign: 'center', marginTop: '20px',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px', color: 'var(--text-muted)',
    letterSpacing: '1px'
  }
};

export default Login;