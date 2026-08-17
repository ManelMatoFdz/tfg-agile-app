import { useTranslation } from 'react-i18next';
import { Check, Languages } from 'lucide-react';
import LanguageFlag from '../ui/LanguageFlag';
import { LANGS } from '../../i18n/languages';

export default function LanguagePreference() {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.split('-')[0] ?? 'es';

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
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 36, height: 36,
          background: 'var(--accent-muted)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Languages size={18} strokeWidth={1.75} style={{ color: 'var(--accent-text)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('profile.language.title')}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {t('profile.language.subtitle')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {LANGS.map(({ code, native }) => {
          const active = current === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => i18n.changeLanguage(code)}
              aria-pressed={active}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: 10,
                fontFamily: 'var(--font-sans)',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'var(--accent-muted)' : 'transparent',
                transition: 'background var(--duration) var(--ease-in-out), border-color var(--duration) var(--ease-in-out)',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <LanguageFlag code={code} width={26} dim={!active} />
              <span style={{
                flex: 1, minWidth: 0,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--text)' : 'var(--text-muted)',
              }}>
                {native}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-faint)', flexShrink: 0,
              }}>
                {code.toUpperCase()}
              </span>
              {active && <Check size={15} strokeWidth={2.25} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}