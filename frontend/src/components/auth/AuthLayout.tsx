import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import authBg from '../../assets/auth-bg.png';

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
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 56,
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AgileFlowLogo />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              AgileFlow
            </span>
          </div>
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
          {t('auth.layout.copyright', { year: new Date().getFullYear(), defaultValue: `© ${new Date().getFullYear()} AgileFlow Inc. All rights reserved.` })}
        </footer>
      </div>
    );
  }

  // Split layout for login
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AgileFlowLogo light />
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              AgileFlow
            </span>
          </div>

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
              {t('auth.layout.headline', { defaultValue: 'Master Your Workflow with AgileFlow' })}
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          height: 56,
        }}>
          <div className="auth-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AgileFlowLogo />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              AgileFlow
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            {children}
          </div>
        </div>

        <div style={{ padding: '12px 32px', display: 'flex', justifyContent: 'center' }}>
          <LanguageSwitcher compact />
        </div>
      </div>

      <style>{`
        @media (min-width:1024px){
          .auth-left-panel{display:flex!important}
          .auth-right-panel{width:50%!important}
          .auth-mobile-logo{display:none!important}
        }
      `}</style>
    </div>
  );
}

function AgileFlowLogo({ light }: { light?: boolean }) {
  const color = light ? '#60A5FA' : '#2563EB';
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill={color} fillOpacity={light ? 0.2 : 0.1} />
      <path d="M8 18C8 18 10 10 14 10C18 10 20 18 20 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M6 14C6 14 10 8 14 8C18 8 22 14 22 14" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export { AgileFlowLogo };