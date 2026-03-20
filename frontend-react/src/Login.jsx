import { useState } from 'react';
import { Activity, Mail, Lock, User, Beaker, ArrowRight, Eye, EyeOff } from 'lucide-react';
import BioBackground from './BioBackground';

const API_BASE = "http://localhost:8000";

const PURPOSE_ICONS = {
  "Academic Research":      "🔬",
  "Drug Discovery":         "💊",
  "Healthcare Professional":"🏥",
  "Personal Learning":      "📚"
};

const PURPOSE_DESC = {
  "Academic Research":      "Research and academic exploration",
  "Drug Discovery":         "Pipeline and commercial drug development",
  "Healthcare Professional":"Clinical and patient care insights",
  "Personal Learning":      "Learning and personal exploration"
};

export default function Login({ onLogin }) {
  const [mode, setMode]           = useState('login'); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [purposes, setPurposes]   = useState([
    "Academic Research",
    "Drug Discovery",
    "Healthcare Professional",
    "Personal Learning"
  ]);

  const [form, setForm] = useState({
    name:     '',
    email:    '',
    password: '',
    purpose:  ''
  });

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/login' : '/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, purpose: form.purpose };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Something went wrong');

      // store token and user info
      localStorage.setItem('drugnova_token', data.token);
      localStorage.setItem('drugnova_user', JSON.stringify({
        name:    data.name,
        email:   data.email,
        purpose: data.purpose
      }));

      onLogin({ name: data.name, email: data.email, purpose: data.purpose });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BioBackground />
      <div className="content-overlay">
        <div className="login-page fade-in">

          {/* Logo */}
          <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <Activity className="logo-icon" size={32} />
            <h1 className="logo">DrugNova <span>AI</span></h1>
          </div>
          <p className="tagline" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Autonomous Drug Repurposing Platform
          </p>

          {/* Card */}
          <div className="login-card glass">

            {/* Toggle */}
            <div className="login-toggle">
              <button
                className={`toggle-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); setError(null); }}
              >
                Sign In
              </button>
              <button
                className={`toggle-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => { setMode('signup'); setError(null); }}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <div className="login-form">

              {/* Name — signup only */}
              {mode === 'signup' && (
                <div className="input-group">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                  />
                </div>
              )}

              {/* Email */}
              <div className="input-group">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                />
              </div>

              {/* Password */}
              <div className="input-group">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                />
                <button
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Purpose — signup only */}
              {mode === 'signup' && (
                <div className="purpose-section">
                  <p className="purpose-label">
                    <Beaker size={14} /> What brings you to DrugNova AI?
                  </p>
                  <div className="purpose-grid">
                    {purposes.map(p => (
                      <button
                        key={p}
                        className={`purpose-btn ${form.purpose === p ? 'active' : ''}`}
                        onClick={() => update('purpose', p)}
                        type="button"
                      >
                        <span className="purpose-icon">{PURPOSE_ICONS[p]}</span>
                        <span className="purpose-name">{p}</span>
                        <span className="purpose-desc">{PURPOSE_DESC[p]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                className="login-submit"
                onClick={submit}
                disabled={loading || (mode === 'signup' && !form.purpose)}
              >
                {loading ? 'Please wait...' : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Switch mode */}
              <p className="login-switch">
                {mode === 'login'
                  ? <>Don't have an account? <button onClick={() => setMode('signup')}>Sign up</button></>
                  : <>Already have an account? <button onClick={() => setMode('login')}>Sign in</button></>
                }
              </p>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}