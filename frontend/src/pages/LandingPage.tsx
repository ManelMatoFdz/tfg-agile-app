import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  ArrowRight, GitBranch, LayoutGrid, LineChart, ListChecks,
  Moon, Radio, RefreshCw, Sparkles, Sun,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import AuthPanel, { type AuthMode } from '../components/landing/AuthPanel';
import BoardMockup from '../components/landing/BoardMockup';
import { LANGS } from '../i18n/languages';
import { getLenis } from '../hooks/useLenis';
import wordmarkDark from '../assets/kadenza-wordmark.png';
import wordmarkLight from '../assets/kadenza-wordmark-light.png';
import '../styles/landing.css';

const EASE = [0.22, 1, 0.36, 1] as const;

/* Revela un bloque al entrar en viewport. Local a la landing para no
   depender de los componentes de motion de la app. */
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* Seis piezas del ciclo, todas del mismo peso: con 6 columnas y tarjetas de
   span 2 las filas cierran exactas en cualquier breakpoint. */
const FEATURES = [
  { key: 'backlog', Icon: ListChecks,     color: 'var(--k-c-violet)' },
  { key: 'poker',   Icon: Radio,          color: 'var(--k-c-cyan)' },
  { key: 'board',   Icon: LayoutGrid,     color: 'var(--k-c-blue)' },
  { key: 'review',  Icon: LineChart,      color: 'var(--k-c-amber)' },
  { key: 'retro',   Icon: RefreshCw,      color: 'var(--k-c-green)' },
  { key: 'git',     Icon: GitBranch,      color: 'var(--k-c-pink)' },
] as const;

const STEPS = ['plan', 'estimate', 'track', 'improve'] as const;
const STATS = ['cycle', 'realtime', 'git'] as const;

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  /* /login y /register redirigen aqui con ?auth=..., asi que el drawer puede
     abrirse ya montado. Al cerrarlo se limpia el parametro para que un refresco
     o el boton atras no lo vuelvan a abrir. */
  const [params, setParams] = useSearchParams();
  const requested = params.get('auth');
  const [authMode, setAuthMode] = useState<AuthMode | null>(
    requested === 'login' || requested === 'register' ? requested : null,
  );
  const [stuck, setStuck] = useState(false);
  const lang = i18n.language?.split('-')[0] ?? 'es';

  /* La landing es oscura siempre, asi que el interruptor de aqui no cambia lo
     que se ve debajo: elige con que tema entras a la app. */
  const theme = useThemeStore(s => s.theme);
  const toggleTheme = useThemeStore(s => s.toggle);
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  /* El wordmark claro es blanco: sobre fondo blanco no existe. */
  const wordmark = theme === 'dark' ? wordmarkLight : wordmarkDark;

  const closeAuth = () => {
    setAuthMode(null);
    if (params.has('auth')) {
      const next = new URLSearchParams(params);
      next.delete('auth');
      setParams(next, { replace: true });
    }
  };

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(el, { offset: -64 });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="kdz">
      {/* ---------------- nav ---------------- */}
      <header className="kdz-nav" data-stuck={stuck}>
        <div className="kdz-shell kdz-nav-inner">
          <img src={wordmark} alt="Kadenza" width={116} height={24} style={{ display: 'block' }} />

          <nav className="kdz-nav-links">
            <button className="kdz-nav-link" onClick={() => goTo('producto')}>{t('landing.nav.product')}</button>
            <button className="kdz-nav-link" onClick={() => goTo('flujo')}>{t('landing.nav.flow')}</button>
          </nav>

          <div className="kdz-nav-actions">
            <div style={{ display: 'flex', gap: 2, marginRight: 4 }}>
              {LANGS.map(({ code }) => (
                <button
                  key={code}
                  onClick={() => i18n.changeLanguage(code)}
                  aria-pressed={lang === code}
                  style={{
                    padding: '5px 7px',
                    border: 'none',
                    borderRadius: 6,
                    background: lang === code ? 'var(--k-surface-2)' : 'transparent',
                    color: lang === code ? 'var(--k-strong)' : 'var(--k-faint)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={toggleTheme}
              title={t(`theme.switchTo.${nextTheme}`)}
              aria-label={t(`theme.switchTo.${nextTheme}`)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, marginRight: 4,
                border: 'none', borderRadius: 6,
                background: 'transparent',
                color: 'var(--k-faint)',
                cursor: 'pointer',
              }}
            >
              {nextTheme === 'dark'
                ? <Moon size={15} strokeWidth={1.75} />
                : <Sun size={15} strokeWidth={1.75} />}
            </button>
            <button className="kdz-btn kdz-btn--ghost kdz-btn--sm" onClick={() => setAuthMode('login')}>
              {t('auth.login.submit')}
            </button>
            <button className="kdz-btn kdz-btn--primary kdz-btn--sm" onClick={() => setAuthMode('register')}>
              {t('landing.cta.primary')}
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- hero ---------------- */}
      <section className="kdz-hero">
        <div className="kdz-aurora" />
        <div className="kdz-grid" />

        <div className="kdz-shell" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <span className="kdz-eyebrow">
              <b>{t('landing.hero.badgeTag')}</b>
              {t('landing.hero.badge')}
            </span>
          </motion.div>

          <motion.h1
            className="kdz-h1"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.08, ease: EASE }}
            style={{ maxWidth: 900 }}
          >
            {t('landing.hero.titleA')} <em>{t('landing.hero.titleEm')}</em>
          </motion.h1>

          <motion.p
            className="kdz-lead"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: EASE }}
            style={{ marginInline: 'auto' }}
          >
            {t('landing.hero.lead')}
          </motion.p>

          <motion.div
            className="kdz-hero-cta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: EASE }}
          >
            <button className="kdz-btn kdz-btn--primary" onClick={() => setAuthMode('register')}>
              {t('landing.cta.primary')}
              <ArrowRight size={17} strokeWidth={2.2} />
            </button>
            <button className="kdz-btn kdz-btn--ghost" onClick={() => goTo('producto')}>
              <Sparkles size={16} strokeWidth={2} />
              {t('landing.cta.secondary')}
            </button>
          </motion.div>

          <BoardMockup />
        </div>
      </section>

      {/* ---------------- métricas ---------------- */}
      <section className="kdz-section kdz-section--tight">
        <div className="kdz-shell">
          <Reveal>
            <div className="kdz-stats">
              {STATS.map((k) => (
                <div key={k} className="kdz-stat">
                  <b>{t(`landing.stats.${k}.value`)}</b>
                  <span>{t(`landing.stats.${k}.label`)}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- features ---------------- */}
      <section className="kdz-section" id="producto">
        <div className="kdz-glow" style={{ width: 520, height: 520, top: 40, left: '-12%', background: 'rgba(37,99,235,0.30)' }} />
        <div className="kdz-shell" style={{ position: 'relative' }}>
          <Reveal>
            <p className="kdz-label">{t('landing.features.label')}</p>
            <h2 className="kdz-h2" style={{ maxWidth: 720 }}>{t('landing.features.title')}</h2>
            <p className="kdz-lead">{t('landing.features.lead')}</p>
          </Reveal>

          <div className="kdz-bento">
            {FEATURES.map(({ key, Icon, color }, i) => (
              <motion.article
                key={key}
                className="kdz-tile"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: EASE }}
              >
                <span className="kdz-tile-ico" style={{ color }}>
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <h3>{t(`landing.features.${key}.title`)}</h3>
                <p>{t(`landing.features.${key}.body`)}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- flujo ---------------- */}
      <section className="kdz-section" id="flujo" style={{ background: 'linear-gradient(180deg, transparent, var(--k-band), transparent)' }}>
        <div className="kdz-shell">
          <Reveal>
            <p className="kdz-label">{t('landing.flow.label')}</p>
            <h2 className="kdz-h2" style={{ maxWidth: 720 }}>{t('landing.flow.title')}</h2>
            <p className="kdz-lead">{t('landing.flow.lead')}</p>
          </Reveal>

          <div className="kdz-steps">
            {STEPS.map((k, i) => (
              <Reveal key={k} delay={i * 0.1}>
                <div className="kdz-step">
                  <b>{String(i + 1).padStart(2, '0')}</b>
                  <h3>{t(`landing.flow.${k}.title`)}</h3>
                  <p>{t(`landing.flow.${k}.body`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="kdz-section kdz-section--tight">
        <div className="kdz-shell">
          <Reveal>
            <div className="kdz-cta">
              <h2 className="kdz-h2" style={{ maxWidth: 620, marginInline: 'auto' }}>{t('landing.final.title')}</h2>
              <p className="kdz-lead" style={{ marginInline: 'auto' }}>{t('landing.final.lead')}</p>
              <div className="kdz-hero-cta">
                <button className="kdz-btn kdz-btn--primary" onClick={() => setAuthMode('register')}>
                  {t('landing.cta.primary')}
                  <ArrowRight size={17} strokeWidth={2.2} />
                </button>
                <button className="kdz-btn kdz-btn--ghost" onClick={() => setAuthMode('login')}>
                  {t('auth.login.submit')}
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- footer ---------------- */}
      <footer className="kdz-footer">
        <div className="kdz-shell kdz-footer-inner">
          <img src={wordmark} alt="Kadenza" width={104} height={21} style={{ display: 'block', opacity: 0.75 }} />
          <p>{t('landing.footer.copyright', { year: new Date().getFullYear() })}</p>
          <p>{t('landing.footer.tfg')}</p>
        </div>
      </footer>

      <AuthPanel mode={authMode} onModeChange={setAuthMode} onClose={closeAuth} />
    </div>
  );
}