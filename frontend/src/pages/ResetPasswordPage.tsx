import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Alert from '../components/ui/Alert';
import PageTitle from '../components/motion/PageTitle';
import { authApi } from '../api/auth';
import { useApiAction } from '../hooks/useApiAction';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 40px 10px 38px',
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

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    <AuthLayout variant="centered">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Icon */}
        <div style={{
          width: 48, height: 48,
          background: 'rgba(22, 163, 74, 0.08)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={24} strokeWidth={1.6} style={{ color: 'var(--success-text)' }} />
        </div>

        {/* Header */}
        <div>
          <PageTitle as="h2" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {t('auth.resetPassword.title')}
          </PageTitle>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: '14px 16px',
              background: 'rgba(22, 163, 74, 0.06)',
              border: '1px solid rgba(22, 163, 74, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--success-text)',
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              {t('auth.resetPassword.successMessage')}
            </div>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  width: '100%',
                  padding: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
              >
                {t('auth.resetPassword.goToLogin')}
              </button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* New Password */}
            <div>
              <label style={labelStyle}>{t('auth.resetPassword.newPassword')}</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><Lock size={16} strokeWidth={1.8} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="--------"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  style={inputStyle}
                />
                {eyeButton(showPassword, () => setShowPassword(!showPassword))}
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}>{t('auth.resetPassword.confirmPassword')}</label>
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
                  style={inputStyle}
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
              {t('auth.resetPassword.submit')}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}