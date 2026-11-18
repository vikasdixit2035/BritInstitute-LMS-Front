import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { authApi } from '../api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'request' | 'reset'>('login');
  const [otp, setOtp] = useState('');
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(0);
  useEffect(() => {
    if (!resendAt) return;
    const timer = window.setTimeout(() => setResendAt(0), Math.max(0, resendAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [resendAt]);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Navigate once user state actually flushes — avoids React 18 batching race
  useEffect(() => {
    if (user) {
      navigate(
        user.role === 'superadmin' ? '/superadmin' : user.role === 'student' ? '/dashboard' : '/admin',
        { replace: true }
      );
    }
  }, [user, navigate]);

  const switchStep = (next: typeof step) => {
    setStep(next);
    setPassword('');
    setShowPassword(false);
    setOtp('');
    setNotice('');
    setError('');
  };

  const requestCode = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.requestPasswordReset(username);
      switchStep('reset');
      setNotice(data.message);
      setResendAt(Date.now() + 60_000);
    } catch {
      setError('Unable to request a code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'request') return requestCode();
    setError('');
    setLoading(true);
    try {
      if (step === 'reset') {
        const { data } = await authApi.resetPassword(username, otp, password);
        switchStep('login');
        setNotice(data.message);
      } else {
        await login(username, password);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || (step === 'reset' ? 'Unable to reset your password. Please try again.' : 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-hero" aria-label="Brit Institute LMS welcome">
        <div className="login-hero-card">
          <BrandLogo subtitle="Career LMS" />
          <div className="login-hero-copy">
            <p className="login-kicker">Smart LMS for career growth</p>
            <h1>Learn, practise, and get ready for your next job.</h1>
            <p>Track classes, live projects, mock interviews, resume and LinkedIn optimization, and placement progress from one friendly student portal.</p>
          </div>

          <div className="login-feature-strip" aria-label="Student success tools">
            <span>Live classes</span>
            <span>LIVE projects</span>
            <span>Resume and LinkedIn optimization</span>
            <span>Placement progress</span>
          </div>
        </div>
      </section>

      <aside className="login-panel" aria-label="Sign in form">
        <div className="login-card">
          <div className="login-card-header">
            <BrandLogo subtitle="LMS Portal" />
            <div>
              <p className="login-card-eyebrow">Secure access</p>
              <h2>{step === 'login' ? 'Enter your career dashboard' : 'Reset your password'}</h2>
              <p>{step === 'login' ? 'Continue to classes, live projects, placement tools, and student progress.' :
                step === 'request' ? 'Enter your username to receive a code at your registered email address.' :
                'Enter the six-digit code from your email within 10 minutes and choose a new password.'}</p>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          {notice && <p className="login-help-text" role="status">{notice}</p>}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="form-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                readOnly={step === 'reset' || loading}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            {step === 'reset' && <div className="form-group">
              <label className="form-label" htmlFor="otp">Email code</label>
              <input id="otp" className="form-input" type="text" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} required autoFocus />
            </div>}
            {step !== 'request' && <div className="form-group">
              <label className="form-label" htmlFor="password">{step === 'reset' ? 'New password' : 'Password'}</label>
              <div className="password-field">
                <input
                  id="password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={step === 'reset' ? 'Choose a new password' : 'Enter your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={step === 'reset' ? 'new-password' : 'current-password'}
                  aria-describedby={step === 'reset' ? 'password-help' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.4 9.6 6a12.8 12.8 0 0 1-3 3.5" />
                      <path d="M6.4 6.6A13.3 13.3 0 0 0 2.4 12c1.1 1.6 4.6 6 9.6 6 1.5 0 2.9-.4 4.1-1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.4 12S5.9 6 12 6s9.6 6 9.6 6-3.5 6-9.6 6-9.6-6-9.6-6Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {step === 'reset' && <small id="password-help">Use at least 8 characters, including uppercase, lowercase, and a number.</small>}
            </div>}
            <button
              id="login-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px', marginTop: '6px' }}
              disabled={loading}
            >
              {step === 'login' ? (loading ? 'Signing in…' : 'Sign In') :
                step === 'request' ? (loading ? 'Sending…' : 'Send email code') :
                (loading ? 'Please wait…' : 'Reset password')}
            </button>
            {step === 'login' ? (
              <button type="button" className="login-recovery-link" disabled={loading} onClick={() => {
                switchStep('request');
                if (username.trim()) void requestCode();
              }}>Forgot password?</button>
            ) : <>
              {step === 'reset' && <button type="button" className="login-recovery-link" disabled={loading || !!resendAt}
                onClick={requestCode}>{resendAt ? 'You can resend the code after one minute' : 'Resend code'}</button>}
              <button type="button" className="login-recovery-link" disabled={loading} onClick={() => switchStep('login')}>Back to sign in</button>
            </>}
          </form>

          <p className="login-help-text">
            Account credentials are provided by your teacher, admin, or super admin
          </p>

          <div className="login-trust-row" aria-label="Portal capabilities">
            <span>Live LMS</span>
            <span>Placement tools</span>
            <span>Progress AI</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
