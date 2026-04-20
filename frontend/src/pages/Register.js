// src/pages/Register.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim() || form.name.length < 2) newErrors.name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Valid email required';
    if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password)) {
      newErrors.password = 'Must include uppercase, lowercase, number, and special char';
    }
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const { name, email, password } = form;
      await authAPI.register({ name, email, password });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const p = form.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[@$!%*?&]/.test(p)) score++;
    if (score <= 1) return { label: 'Weak', color: 'var(--danger)', width: '25%' };
    if (score === 2) return { label: 'Fair', color: 'var(--warning)', width: '50%' };
    if (score === 3) return { label: 'Good', color: 'var(--info)', width: '75%' };
    return { label: 'Strong', color: 'var(--success)', width: '100%' };
  };

  const strength = getPasswordStrength();

  return (
    <div style={styles.page}>
      <div style={styles.grid} />

      <div style={styles.container} className="fade-in">
        <div style={styles.header}>
          <div style={styles.shield}>🛡️</div>
          <h1 style={styles.title}>ZERO TRUST</h1>
          <p style={styles.subtitle}>Register New Operator</p>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>NEW ACCOUNT</span>
            <span style={styles.dot} />
          </div>

          {apiError && <div className="zt-alert zt-alert-error">✗ {apiError}</div>}
          {success && <div className="zt-alert zt-alert-success">✓ {success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="zt-field">
              <label className="zt-label">Full Name</label>
              <input
                className={`zt-input${errors.name ? ' error' : ''}`}
                type="text" name="name"
                placeholder="John Doe"
                value={form.name} onChange={handleChange} required
              />
              {errors.name && <p className="zt-error-text">{errors.name}</p>}
            </div>

            <div className="zt-field">
              <label className="zt-label">Email Address</label>
              <input
                className={`zt-input${errors.email ? ' error' : ''}`}
                type="email" name="email"
                placeholder="operator@zerotrust.io"
                value={form.email} onChange={handleChange} required
              />
              {errors.email && <p className="zt-error-text">{errors.email}</p>}
            </div>

            <div className="zt-field">
              <label className="zt-label">Password</label>
              <input
                className={`zt-input${errors.password ? ' error' : ''}`}
                type="password" name="password"
                placeholder="Min 8 chars, mixed case + symbols"
                value={form.password} onChange={handleChange} required
              />
              {strength && (
                <div style={styles.strengthBar}>
                  <div style={{ ...styles.strengthFill, width: strength.width, background: strength.color }} />
                  <span style={{ ...styles.strengthLabel, color: strength.color }}>{strength.label}</span>
                </div>
              )}
              {errors.password && <p className="zt-error-text">{errors.password}</p>}
            </div>

            <div className="zt-field">
              <label className="zt-label">Confirm Password</label>
              <input
                className={`zt-input${errors.confirmPassword ? ' error' : ''}`}
                type="password" name="confirmPassword"
                placeholder="Repeat password"
                value={form.confirmPassword} onChange={handleChange} required
              />
              {errors.confirmPassword && <p className="zt-error-text">{errors.confirmPassword}</p>}
            </div>

            <div style={styles.notice}>
              🔒 First login from any new device will require OTP verification
            </div>

            <button className="zt-btn zt-btn-primary" type="submit" disabled={loading}>
              {loading ? <><span style={styles.spinner} /> REGISTERING...</> : '→ CREATE ACCOUNT'}
            </button>
          </form>

          <p style={styles.footer}>
            Already have access?{' '}
            <Link to="/login" style={styles.link}>Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg-primary)',
    position: 'relative', overflow: 'hidden', padding: '20px'
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(rgba(77,157,224,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(77,157,224,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px', pointerEvents: 'none'
  },
  container: { width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 },
  header: { textAlign: 'center', marginBottom: '32px' },
  shield: { fontSize: '48px', marginBottom: '12px', display: 'block' },
  title: {
    fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '6px', marginBottom: '4px'
  },
  subtitle: {
    fontFamily: 'var(--font-mono)', fontSize: '11px',
    color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase'
  },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '32px',
    boxShadow: 'var(--shadow-card)'
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)'
  },
  cardTitle: {
    fontFamily: 'var(--font-mono)', fontSize: '12px',
    color: 'var(--text-muted)', letterSpacing: '2px'
  },
  dot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: 'var(--info)', boxShadow: '0 0 8px var(--info)',
    animation: 'pulse 2s infinite'
  },
  strengthBar: {
    marginTop: '8px', background: 'var(--bg-secondary)',
    borderRadius: '3px', height: '4px', position: 'relative', overflow: 'hidden'
  },
  strengthFill: { height: '100%', borderRadius: '3px', transition: 'all 0.3s ease' },
  strengthLabel: {
    position: 'absolute', right: 0, top: '-18px',
    fontSize: '10px', fontFamily: 'var(--font-mono)'
  },
  notice: {
    background: 'rgba(77,157,224,0.08)', border: '1px solid rgba(77,157,224,0.2)',
    borderRadius: 'var(--radius-sm)', padding: '10px 14px',
    fontSize: '12px', color: 'var(--info)', marginBottom: '20px',
    fontFamily: 'var(--font-mono)'
  },
  spinner: {
    width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)',
    borderTop: '2px solid white', borderRadius: '50%',
    display: 'inline-block', animation: 'spin 0.8s linear infinite'
  },
  footer: { textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '13px' },
  link: { color: 'var(--accent-red)', textDecoration: 'none', fontWeight: 500 }
};

export default Register;