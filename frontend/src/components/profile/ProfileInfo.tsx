import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { User as UserIcon } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import { useApiAction } from '../../hooks/useApiAction';
import type { User } from '../../types';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  marginBottom: 4,
};

const textareaStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  color: 'var(--text)',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  outline: 'none',
  resize: 'none',
  boxSizing: 'border-box' as const,
  transition: `border-color var(--duration-micro) var(--ease-micro)`,
};

export default function ProfileInfo() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { loading, error, success, run, reset } = useApiAction<User>();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '');
      setBio(user.bio ?? '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const updated = await run(usersApi.updateMe({ fullName, bio }));
    if (updated) setUser(updated);
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
      <style>{`.profile-info-grid{display:grid;gap:16px;grid-template-columns:1fr}@media(min-width:640px){.profile-info-grid{grid-template-columns:1fr 1fr}}`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 36,
          height: 36,
          background: 'var(--accent-muted)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <UserIcon size={18} strokeWidth={1.75} style={{ color: 'var(--accent-text)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('profile.info.title')}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {t('profile.info.subtitle')}
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={reset} />}
      {success && <Alert type="success" message={t('profile.info.successMessage')} onClose={reset} />}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="profile-info-grid">
          <Input label={t('profile.info.username')} value={user?.username ?? ''} disabled />
          <Input label={t('profile.info.email')} value={user?.email ?? ''} disabled />
        </div>
        <Input
          label={t('profile.info.fullName')}
          placeholder={t('profile.info.fullNamePlaceholder')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <div>
          <label style={labelStyle}>{t('profile.info.bio')}</label>
          <textarea
            rows={3}
            placeholder={t('profile.info.bioPlaceholder')}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={textareaStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <Button type="submit" loading={loading}>
            {t('profile.info.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}