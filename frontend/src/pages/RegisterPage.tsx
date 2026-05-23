import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, ShieldCheck } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Alert from '../components/ui/Alert';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useApiAction } from '../hooks/useApiAction';
import type { AuthResponse } from '../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5625rem 0.625rem 0.5625rem 2.125rem',
  fontSize: '0.8125rem',
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
  fontSize: '0.75rem',
  fontWeight: 500,
  color: 'var(--text-muted)',
  marginBottom: '0.3125rem',
};

const iconWrap: React.CSSProperties = {
  position: 'absolute',
  left: '0.625rem',
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
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

const STRENGTH_COLORS = ['#f87171', '#fbbf24', 'var(--accent)', '#34d399'];

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const { loading, error, run, reset } = useApiAction<AuthResponse>();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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

  return (
    <AuthLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('auth.register.title')}
          </h2>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <FieldInput
            label={t('auth.register.username')}
            placeholder={t('auth.register.usernamePlaceholder')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            icon={<User size={14} strokeWidth={1.8} />}
          />
          <FieldInput
            label={t('auth.register.email')}
            type="email"
            placeholder={t('auth.register.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<Mail size={14} strokeWidth={1.8} />}
          />
          <FieldInput
            label={t('auth.register.password')}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={<Lock size={14} strokeWidth={1.8} />}
          />
          <FieldInput
            label={t('auth.register.confirmPassword')}
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            icon={<ShieldCheck size={14} strokeWidth={1.8} />}
          />

          {/* Password strength */}
          {password.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.6875rem',
              fontSize: '0.8125rem',
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
              gap: '0.5rem',
              transition: `background var(--duration)`,
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            {loading && (
              <div style={{
                width: '0.875rem', height: '0.875rem',
                border: '0.125rem solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            )}
            {t('auth.register.submit')}
          </button>
        </form>

        <p style={{ margin: 0, textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {t('auth.register.alreadyHaveAccount')}{' '}
          <Link
            to="/login"
            style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {t('auth.register.loginLink')}
          </Link>
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <LanguageSwitcher compact />
        </div>
      </div>
    </AuthLayout>
  );
}