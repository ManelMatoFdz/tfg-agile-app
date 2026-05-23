import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import Alert from '../components/ui/Alert';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useApiAction } from '../hooks/useApiAction';
import type { AuthResponse } from '../types';
import { consumeFlashNotice } from '../utils/flashNotice';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px 9px 34px',
  fontSize: 13,
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: `border-color var(--duration)`,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-muted)',
  marginBottom: 5,
};

const iconWrap: React.CSSProperties = {
  position: 'absolute',
  left: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-faint)',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
};

function FieldInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  icon,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  icon: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={iconWrap}>{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          onFocus={(e) => { setFocused(true); e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { setFocused(false); e.currentTarget.style.borderColor = focused ? 'var(--accent)' : 'var(--border)'; }}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const { loading, error, run, reset } = useApiAction<AuthResponse>();
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('auth.login.title')}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldInput
            label={t('auth.login.email')}
            type="email"
            placeholder={t('auth.login.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<Mail size={14} strokeWidth={1.8} />}
          />
          <FieldInput
            label={t('auth.login.password')}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={<Lock size={14} strokeWidth={1.8} />}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link
              to="/forgot-password"
              style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              fontSize: 13,
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
              transition: `background var(--duration)`,
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            {loading && (
              <div style={{
                width: 14, height: 14,
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
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
            {t('auth.login.orContinueWith')}
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Google Sign-In */}
        {googleEnabled && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLoginButton onClick={() => googleLogin()} />
          </div>
        )}

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

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <LanguageSwitcher compact />
        </div>
      </div>
    </AuthLayout>
  );
}