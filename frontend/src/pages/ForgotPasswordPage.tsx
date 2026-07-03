import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Alert from '../components/ui/Alert';
import PageTitle from '../components/motion/PageTitle';
import { authApi } from '../api/auth';
import { useApiAction } from '../hooks/useApiAction';

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

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const { loading, error, success, run, reset } = useApiAction();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await run(authApi.forgotPassword(email));
  };

  return (
    <AuthLayout variant="centered">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Icon */}
        <div style={{
          width: 48, height: 48,
          background: 'rgba(37, 99, 235, 0.08)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <KeyRound size={24} strokeWidth={1.6} style={{ color: 'var(--accent)' }} />
        </div>

        {/* Header */}
        <div>
          <PageTitle as="h2" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {t('auth.forgotPassword.title')}
          </PageTitle>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('auth.forgotPassword.subtitle')}
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={reset} />}

        {success && (
          <div style={{
            padding: '14px 16px',
            background: 'rgba(22, 163, 74, 0.06)',
            border: '1px solid rgba(22, 163, 74, 0.2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--success)',
            fontSize: 13,
            lineHeight: 1.5,
          }}>
            {t('auth.forgotPassword.successMessage')}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>{t('auth.forgotPassword.email')}</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-faint)', pointerEvents: 'none', display: 'flex', alignItems: 'center',
                }}>
                  <Mail size={16} strokeWidth={1.8} />
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
              {t('auth.forgotPassword.submit')}
            </button>
          </form>
        )}

        {/* Back to login */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link
            to="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--accent)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}