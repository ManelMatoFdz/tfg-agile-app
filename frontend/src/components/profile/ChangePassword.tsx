import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { usersApi } from '../../api/users';
import { useApiAction } from '../../hooks/useApiAction';
import { useAuthStore } from '../../store/authStore';
import { setFlashNotice } from '../../utils/flashNotice';

export default function ChangePassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { loading, error, success, run, reset } = useApiAction();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');
  const requiresCurrentPassword = user?.hasLocalPassword !== false;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (newPassword.length < 6) {
      setValidationError(t('profile.password.validation.passwordTooShort'));
      return;
    }
    if (newPassword !== confirm) {
      setValidationError(t('profile.password.validation.passwordsDontMatch'));
      return;
    }

    if (requiresCurrentPassword && currentPassword.trim().length === 0) {
      setValidationError(t('profile.password.validation.currentRequired'));
      return;
    }

    const result = await run(usersApi.changePassword(newPassword, requiresCurrentPassword ? currentPassword : undefined));
    if (result !== null) {
      setFlashNotice(t('profile.password.flashMessage'));
      logout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      <style>{`.pwd-grid{display:grid;gap:16px;grid-template-columns:1fr}@media(min-width:640px){.pwd-grid{grid-template-columns:1fr 1fr}}`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 36,
          height: 36,
          background: 'var(--ochre-soft)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Lock size={18} strokeWidth={1.75} style={{ color: 'var(--ochre)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('profile.password.title')}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {requiresCurrentPassword ? t('profile.password.subtitle') : t('profile.password.subtitleCreate')}
          </p>
        </div>
      </div>

      {(error || validationError) && (
        <Alert type="error" message={validationError || error!} onClose={() => { reset(); setValidationError(''); }} />
      )}
      {success && <Alert type="success" message={t('profile.password.successMessage')} onClose={reset} />}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {requiresCurrentPassword && (
          <Input
            label={t('profile.password.currentPassword')}
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        )}
        <div className="pwd-grid">
          <Input
            label={t('profile.password.newPassword')}
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
          <Input
            label={t('profile.password.confirmNew')}
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <Button type="submit" loading={loading}>
            {requiresCurrentPassword ? t('profile.password.change') : t('profile.password.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}