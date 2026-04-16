import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { authApi } from '../api/auth';
import { useApiAction } from '../hooks/useApiAction';

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
      <div className="space-y-8">
        <div>
          {/* Icon */}
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{t('auth.resetPassword.title')}</h2>
          <p className="mt-2 text-gray-500">
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
          <div className="space-y-6">
            <Alert type="success" message={t('auth.resetPassword.successMessage')} />
            <Link to="/login">
              <Button className="w-full h-12 text-base">
                {t('auth.resetPassword.goToLogin')}
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('auth.resetPassword.newPassword')}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              icon={
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
            <Input
              label={t('auth.resetPassword.confirmPassword')}
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              icon={
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
            <Button type="submit" loading={loading} className="w-full h-12 text-base">
              {t('auth.resetPassword.submit')}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}