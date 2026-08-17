import { useTranslation } from 'react-i18next';
import LanguageFlag from './LanguageFlag';
import { LANGS } from '../../i18n/languages';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
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
      {LANGS.map(({ code, native }) => {
        const active = current === code;
        return (
          <button
            key={code}
            onClick={() => i18n.changeLanguage(code)}
            title={native}
            aria-pressed={active}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: compact ? '4px 8px' : '5px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 11,
              fontWeight: active ? 600 : 500,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--bg-elevated)' : 'transparent',
              color: active ? 'var(--accent-text)' : 'var(--text-faint)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              transition: 'background var(--duration) var(--ease-in-out), color var(--duration) var(--ease-in-out)',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-faint)'; }}
          >
            <LanguageFlag code={code} width={18} dim={!active} />
            {compact ? code.toUpperCase() : native}
          </button>
        );
      })}
    </div>
  );
}