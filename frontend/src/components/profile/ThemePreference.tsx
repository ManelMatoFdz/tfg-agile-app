import { useTranslation } from 'react-i18next';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

const OPTIONS = [
  { value: 'light', Icon: Sun,  swatch: ['#FFFFFF', '#F7F8FA', '#E2E8F0'] },
  { value: 'dark',  Icon: Moon, swatch: ['#0C1322', '#05080F', '#1C2740'] },
] as const;

export default function ThemePreference() {
  const { t } = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);

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
          <Monitor size={18} strokeWidth={1.75} style={{ color: 'var(--accent-text)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('theme.title')}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
            {t('theme.subtitle')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {OPTIONS.map(({ value, Icon, swatch }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
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
              {/* Muestra de la paleta: se ve el tema sin tener que aplicarlo. */}
              <span style={{
                display: 'flex', flexShrink: 0,
                width: 26, height: 26,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                overflow: 'hidden',
              }}>
                {swatch.map(c => (
                  <span key={c} style={{ flex: 1, background: c }} />
                ))}
              </span>
              <Icon size={15} strokeWidth={1.75} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{
                flex: 1, minWidth: 0,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--text)' : 'var(--text-muted)',
              }}>
                {t(`theme.${value}`)}
              </span>
              {active && <Check size={15} strokeWidth={2.25} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}