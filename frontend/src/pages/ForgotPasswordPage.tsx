import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Alert from '../components/ui/Alert';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { authApi } from '../api/auth';
import { useApiAction } from '../hooks/useApiAction';

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

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const { loading, error, success, run, reset } = useApiAction();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await run(authApi.forgotPassword(email));
  };

  return (
    <AuthLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          {/* Icon */}
          <div style={{
            width: '3rem', height: '3rem',
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <KeyRound size={22} strokeWidth={1.6} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('auth.forgotPassword.title')}
          </h2>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {t('auth.forgotPassword.subtitle')}
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={reset} />}
        {success && (
          <Alert type="success" message={t('auth.forgotPassword.successMessage')} />
        )}

        {!success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
                marginBottom: '0.3125rem',
              }}>
                {t('auth.forgotPassword.email')}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-faint)', pointerEvents: 'none', display: 'flex', alignItems: 'center',
                }}>
                  <Mail size={14} strokeWidth={1.8} />
                </span>
                <input
                  type="email"
                  placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  style={inputStyle}
                />
              </div>
            </div>

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
              {t('auth.forgotPassword.submit')}
            </button>
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link
            to="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3125rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--accent)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            <ArrowLeft size={13} strokeWidth={2} />
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <LanguageSwitcher compact />
        </div>
      </div>
    </AuthLayout>
  );
}