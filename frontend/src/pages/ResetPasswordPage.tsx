import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, ShieldCheck } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Alert from '../components/ui/Alert';
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

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');
  const { loading, error, success, run, reset } = useApiAction();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!token) {
      setValidationError(t('auth.resetPassword.validation.invalidToken'));
      return;
    }
    if (password.length < 6) {
      setValidationError(t('auth.resetPassword.validation.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setValidationError(t('auth.resetPassword.validation.passwordsDontMatch'));
      return;
    }

    await run(authApi.resetPassword(token, password));
  };

  return (
    <AuthLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          {/* Icon */}
          <div style={{
            width: '3rem', height: '3rem',
            background: 'rgba(34,197,94,0.1)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <ShieldCheck size={22} strokeWidth={1.6} style={{ color: '#16a34a' }} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('auth.resetPassword.title')}
          </h2>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {t('auth.resetPassword.subtitle')}
          </p>
        </div>

        {(error || validationError) && (
          <Alert
            type="error"
            message={validationError || error!}
            onClose={() => { reset(); setValidationError(''); }}
          />
        )}

        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Alert type="success" message={t('auth.resetPassword.successMessage')} />
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  width: '100%',
                  padding: '0.6875rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: `background var(--duration)`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
              >
                {t('auth.resetPassword.goToLogin')}
              </button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label style={labelStyle}>{t('auth.resetPassword.newPassword')}</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><Lock size={14} strokeWidth={1.8} /></span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t('auth.resetPassword.confirmPassword')}</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><ShieldCheck size={14} strokeWidth={1.8} /></span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
              {t('auth.resetPassword.submit')}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}