import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Alert from '../components/ui/Alert';
import PageTitle from '../components/motion/PageTitle';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useApiAction } from '../hooks/useApiAction';
import type { AuthResponse } from '../types';

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

const inputStyleWithEye: React.CSSProperties = {
  ...inputStyle,
  paddingRight: 40,
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

const STRENGTH_COLORS = ['var(--danger)', 'var(--ochre)', 'var(--accent)', 'var(--success)'];

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const { loading, error, run, reset } = useApiAction<AuthResponse>();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password.length < 6) {
      setValidationError(t('auth.register.validation.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setValidationError(t('auth.register.validation.passwordsDontMatch'));
      return;
    }

    const data = await run(authApi.register(username, email, password));
    if (data) {
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate('/workspaces');
    }
  };

  const eyeButton = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
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
      {show ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
    </button>
  );

  return (
    <AuthLayout>
      <div className="auth-compact" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div>
          <PageTitle as="h2" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {t('auth.register.title')}
          </PageTitle>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('auth.register.subtitle')}
          </p>
        </div>

        {(error || validationError) && (
          <Alert
            type="error"
            message={validationError || error!}
            onClose={() => { reset(); setValidationError(''); }}
          />
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Username */}
          <div>
            <label style={labelStyle}>{t('auth.register.username')}</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrap}><User size={16} strokeWidth={1.8} /></span>
              <input
                type="text"
                placeholder={t('auth.register.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>{t('auth.register.email')}</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrap}><Mail size={16} strokeWidth={1.8} /></span>
              <input
                type="email"
                placeholder={t('auth.register.emailPlaceholder')}
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
            <label style={labelStyle}>{t('auth.register.password')}</label>
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
                style={inputStyleWithEye}
              />
              {eyeButton(showPassword, () => setShowPassword(!showPassword))}
            </div>
          </div>

          {/* Password strength */}
          {password.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: -8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    style={{
                      height: 3,
                      flex: 1,
                      borderRadius: 2,
                      background: password.length >= level * 3 ? STRENGTH_COLORS[level - 1] : 'var(--bg-hover)',
                      transition: 'background 0.3s',
                    }}
                  />
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)' }}>
                {password.length < 6
                  ? t('auth.register.passwordStrength.tooShort')
                  : password.length < 9
                    ? t('auth.register.passwordStrength.acceptable')
                    : password.length < 12
                      ? t('auth.register.passwordStrength.good')
                      : t('auth.register.passwordStrength.excellent')}
              </p>
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label style={labelStyle}>{t('auth.register.confirmPassword')}</label>
            <div style={{ position: 'relative' }}>
              <span style={iconWrap}><ShieldCheck size={16} strokeWidth={1.8} /></span>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="--------"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                style={inputStyleWithEye}
              />
              {eyeButton(showConfirm, () => setShowConfirm(!showConfirm))}
            </div>
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
            {t('auth.register.submit')}
          </button>
        </form>

        {/* Login link */}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {t('auth.register.alreadyHaveAccount')}{' '}
          <Link
            to="/login"
            style={{ fontWeight: 600, color: 'var(--accent-text)', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {t('auth.register.loginLink')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}