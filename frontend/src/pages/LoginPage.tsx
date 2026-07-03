import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import Alert from '../components/ui/Alert';
import PageTitle from '../components/motion/PageTitle';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useApiAction } from '../hooks/useApiAction';
import type { AuthResponse } from '../types';
import { consumeFlashNotice } from '../utils/flashNotice';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px 10px 38px',
  fontSize: 14,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text)',
  marginBottom: 6,
};

const iconWrap: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-faint)',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
};

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const { loading, error, run, reset } = useApiAction<AuthResponse>();
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() => {
    const noticeFromState = (location.state as { notice?: string } | null)?.notice ?? null;
    return noticeFromState ?? consumeFlashNotice();
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGoogleError(null);
    const data = await run(authApi.login(email, password));
    if (data) {
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate('/workspaces');
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleError(null);
      const data = await run(authApi.googleLogin(tokenResponse.access_token));
      if (data) {
        setSession(data.accessToken, data.refreshToken, data.user);
        navigate('/workspaces');
      }
    },
    onError: () => setGoogleError(t('auth.login.googleError')),
  });

  return (
    <AuthLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div>
          <PageTitle as="h2" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {t('auth.login.title')}
          </PageTitle>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('auth.login.subtitle')}
          </p>
        </div>

        {(error || googleError) && (
          <Alert
            type="error"
            message={googleError ?? error!}
            onClose={() => { setGoogleError(null); reset(); }}
          />
        )}
        {notice && <Alert type="info" message={notice} onClose={() => setNotice(null)} />}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={labelStyle}>{t('auth.login.email')}</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrap}><Mail size={16} strokeWidth={1.8} /></span>
              <input
                type="email"
                placeholder={t('auth.login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>{t('auth.login.password')}</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrap}><Lock size={16} strokeWidth={1.8} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="--------"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-faint)',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link
              to="/forgot-password"
              style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              fontSize: 14,
              fontWeight: 600,
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s ease',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            {loading && (
              <div style={{
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            )}
            {t('auth.login.submit')}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-faint)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('auth.login.orContinueWith')}
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Google Sign-In */}
        {googleEnabled && <GoogleLoginButton onClick={() => googleLogin()} />}

        {/* Register link */}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {t('auth.login.noAccount')}{' '}
          <Link
            to="/register"
            style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {t('auth.login.registerLink')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}