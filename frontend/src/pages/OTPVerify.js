// src/pages/OTPVerify.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const OTPVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const { userId, email, devOtp } = location.state || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 min
  const inputRefs = useRef([]);

  // Redirect if no state (direct URL access)
  useEffect(() => {
    if (!userId || !email) {
      navigate('/login');
    }
  }, [userId, email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Handle individual digit input
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // take last char
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste (paste full 6-digit OTP)
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (timeLeft <= 0) {
      setError('OTP has expired. Please login again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authAPI.verifyOTP({ userId, otp: otpString });
      const { data } = res.data;

      login(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed.';
      setError(msg);
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.grid} />

      <div style={styles.container} className="fade-in">
        <div style={styles.header}>
          <div style={styles.icon}>🔐</div>
          <h1 style={styles.title}>MFA VERIFICATION</h1>
          <p style={styles.subtitle}>New Device Detected — Verify Identity</p>
        </div>

        <div style={styles.card}>
          <div style={styles.infoBox}>
            <p style={styles.infoText}>OTP sent to</p>
            <p style={styles.emailText}>{email}</p>
          </div>

          {/* Dev mode helper */}
          {devOtp && (
            <div className="zt-alert zt-alert-warning">
              🧪 DEV MODE — OTP: <strong style={{ fontFamily: 'var(--font-mono)', letterSpacing: '4px' }}>{devOtp}</strong>
            </div>
          )}

          {error && <div className="zt-alert zt-alert-error">✗ {error}</div>}

          <form onSubmit={handleSubmit}>
            {/* OTP digit inputs */}
            <div style={styles.otpRow} onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    ...styles.otpInput,
                    borderColor: digit ? 'var(--accent-red)' : 'var(--border)',
                    boxShadow: digit ? '0 0 10px rgba(233,69,96,0.3)' : 'none',
                    color: digit ? 'var(--accent-red)' : 'var(--text-primary)'
                  }}
                />
              ))}
            </div>

            {/* Timer */}
            <div style={styles.timer}>
              <span style={{ color: timeLeft < 60 ? 'var(--danger)' : 'var(--text-muted)' }}>
                ⏱ Expires in{' '}
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {formatTime(timeLeft)}
                </span>
              </span>
            </div>

            <button
              className="zt-btn zt-btn-primary"
              type="submit"
              disabled={loading || otp.join('').length < 6 || timeLeft <= 0}
            >
              {loading ? <><span style={styles.spinner} /> VERIFYING...</> : '→ VERIFY & TRUST DEVICE'}
            </button>
          </form>

          <div style={styles.actions}>
            <button
              style={styles.backBtn}
              onClick={() => navigate('/login')}
            >
              ← Back to Login
            </button>
          </div>

          <div style={styles.securityNote}>
            <p>🛡️ Upon verification, this device will be trusted for future logins</p>
          </div>
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
      linear-gradient(rgba(22,199,154,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(22,199,154,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px', pointerEvents: 'none'
  },
  container: { width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 },
  header: { textAlign: 'center', marginBottom: '32px' },
  icon: { fontSize: '52px', marginBottom: '12px', display: 'block' },
  title: {
    fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '5px', marginBottom: '4px'
  },
  subtitle: {
    fontFamily: 'var(--font-mono)', fontSize: '11px',
    color: 'var(--text-muted)', letterSpacing: '1px'
  },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '32px', boxShadow: 'var(--shadow-card)'
  },
  infoBox: {
    textAlign: 'center', padding: '16px',
    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
    marginBottom: '24px'
  },
  infoText: { color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' },
  emailText: { color: 'var(--accent-cyan)', fontSize: '15px', fontWeight: 600, marginTop: '4px' },
  otpRow: {
    display: 'flex', gap: '10px', justifyContent: 'center',
    marginBottom: '20px'
  },
  otpInput: {
    width: '50px', height: '56px',
    textAlign: 'center', fontSize: '22px', fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    background: 'var(--bg-secondary)',
    border: '2px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'all 0.15s ease',
    cursor: 'text'
  },
  timer: {
    textAlign: 'center', marginBottom: '20px',
    fontSize: '13px', color: 'var(--text-muted)'
  },
  spinner: {
    width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)',
    borderTop: '2px solid white', borderRadius: '50%',
    display: 'inline-block', animation: 'spin 0.8s linear infinite'
  },
  actions: { textAlign: 'center', marginTop: '16px' },
  backBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-body)',
    padding: '4px 8px', transition: 'color 0.2s'
  },
  securityNote: {
    marginTop: '20px', padding: '12px',
    background: 'rgba(22,199,154,0.05)', borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(22,199,154,0.15)',
    textAlign: 'center', fontSize: '11px', color: 'var(--success)',
    fontFamily: 'var(--font-mono)'
  }
};

export default OTPVerify;