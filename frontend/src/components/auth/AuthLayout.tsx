import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useThemeStore } from '../../store/themeStore';
import authBg from '../../assets/auth-bg.png';
import wordmark from '../../assets/kadenza-wordmark.png';
import wordmarkLight from '../../assets/kadenza-wordmark-light.png';

export default function AuthLayout({
  children,
  variant = 'split',
  topRight,
}: {
  children: ReactNode;
  variant?: 'split' | 'centered';
  topRight?: ReactNode;
}) {
  const { t } = useTranslation();

  if (variant === 'centered') {
    return (
      <div style={{ minHeight: 'var(--vh-screen)', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 56,
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
        }}>
          <KadenzaLogo height={26} />
          {topRight}
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{
            width: '100%',
            maxWidth: 460,
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            padding: '40px 36px',
          }}>
            {children}
          </div>
        </main>

        <footer style={{
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-faint)',
        }}>
          {t('auth.layout.copyright', { year: new Date().getFullYear(), defaultValue: `© ${new Date().getFullYear()} Kadenza. All rights reserved.` })}
        </footer>
      </div>
    );
  }

  // Split layout for login
  return (
    <div style={{ display: 'flex', height: 'var(--vh-screen)', minHeight: 'var(--vh-screen)' }}>
      <div className="auth-left-panel" style={{
        display: 'none',
        width: '50%',
        position: 'relative',
        overflow: 'hidden',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* Background image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${authBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
          {/* Dark gradient from bottom for text readability */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(10,18,36,0.85) 0%, rgba(10,18,36,0.3) 45%, transparent 100%)',
          }} />
        </div>

        {/* Content */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          padding: 48,
        }}>
          {/* Logo */}
          <KadenzaLogo light height={34} />

          {/* Bottom text */}
          <div style={{ maxWidth: 480 }}>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1.2,
              color: '#fff',
              letterSpacing: '-0.02em',
            }}>
              {t('auth.layout.headline', { defaultValue: 'Master Your Workflow with Kadenza' })}
            </h3>
            <p style={{
              margin: 0,
              fontSize: 18,
              lineHeight: 1.6,
              color: 'rgba(203,213,225,1)',
            }}>
              {t('auth.layout.description')}
            </p>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        width: '100%',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
        className="auth-right-panel"
      >
        <div className="auth-panel-topbar" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          height: 56,
        }}>
          <div className="auth-mobile-logo">
            <KadenzaLogo height={26} />
          </div>
        </div>

        <div className="auth-panel-main" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            {children}
          </div>
        </div>

        <div className="auth-panel-footer" style={{ padding: '12px 32px', display: 'flex', justifyContent: 'center' }}>
          <LanguageSwitcher compact />
        </div>
      </div>

      <style>{`
        @media (min-width:1024px){
          .auth-left-panel{display:flex!important}
          .auth-right-panel{width:50%!important}
          /* En escritorio el logo vive en el panel izquierdo: la barra queda vacia */
          .auth-panel-topbar{display:none!important}
        }
        /* Pantallas bajas: compactar para que el formulario quepa sin scroll */
        @media (max-height:760px){
          .auth-panel-main{padding-top:12px!important;padding-bottom:12px!important}
          .auth-panel-footer{padding-top:6px!important;padding-bottom:6px!important}
          .auth-compact{gap:16px!important}
          .auth-compact form{gap:12px!important}
        }
      `}</style>
    </div>
  );
}

/* Logotipo completo (isotipo + wordmark) en un unico PNG con transparencia.
   La variante `light` lleva el texto en blanco para fondos oscuros.
   El ancho se fija a partir del ratio real del PNG: si se dejara en `auto`,
   un contenedor flex con `align-items: stretch` deformaria la imagen. */
const LOGO_RATIO = 780 / 161;

/* Sobre una superficie de la app la variante la decide el tema. `light` solo se
   pasa a mano donde el fondo es oscuro siempre, como el panel decorativo del
   login, que no depende del tema elegido. */
function KadenzaLogo({ light, height = 26 }: { light?: boolean; height?: number }) {
  const theme = useThemeStore(s => s.theme);
  const width = Math.round(height * LOGO_RATIO);
  return (
    <img
      src={(light ?? theme === 'dark') ? wordmarkLight : wordmark}
      alt="Kadenza"
      width={width}
      height={height}
      style={{
        width, height,
        flexShrink: 0,
        objectFit: 'contain',
        display: 'block',
        userSelect: 'none',
      }}
      draggable={false}
    />
  );
}

export { KadenzaLogo };