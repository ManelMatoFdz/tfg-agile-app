import { useTranslation } from 'react-i18next';

const LANGS = ['es', 'en', 'gl'] as const;

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.split('-')[0] ?? 'es';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      padding: 3,
      background: 'var(--bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
    }}>
      {LANGS.map((lang) => {
        const active = current === lang;
        return (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            title={t(`lang.${lang}`)}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              fontFamily: 'var(--font-sans)',
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--bg-elevated)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-faint)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              transition: 'background var(--duration) var(--ease-in-out), color var(--duration) var(--ease-in-out)',
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.color = 'var(--text)';
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.color = 'var(--text-faint)';
              }
            }}
          >
            {compact ? lang.toUpperCase() : t(`lang.${lang}`)}
          </button>
        );
      })}
    </div>
  );
}