import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useGoogleLogin } from '@react-oauth/google';
import { AlertCircle, Eye, EyeOff, Info, Lock, Mail, ShieldCheck, User, X } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getLenis } from '../../hooks/useLenis';
import { consumeFlashNotice } from '../../utils/flashNotice';
import type { AuthResponse } from '../../types';
import wordmarkDark from '../../assets/kadenza-wordmark.png';
import wordmarkLight from '../../assets/kadenza-wordmark-light.png';

export type AuthMode = 'login' | 'register';

const METER_COLORS = ['#F87171', '#FBBF24', '#60A5FA', '#34D399'];

/* `main.tsx` solo monta GoogleOAuthProvider si hay client id, y `useGoogleLogin`
   revienta fuera del provider. Por eso el hook vive en un componente aparte que
   solo se renderiza cuando el acceso con Google esta configurado. */
const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

function GoogleButton({ disabled, onToken, onError }: {
  disabled: boolean;
  onToken: (accessToken: string) => void;
  onError: () => void;
}) {
  const { t } = useTranslation();
  const login = useGoogleLogin({
    onSuccess: (res) => onToken(res.access_token),
    onError,
  });

  return (
    <>
      <div className="kdz-divider">{t('auth.login.orContinueWith')}</div>
      <button type="button" className="kdz-google" onClick={() => login()} disabled={disabled}>
        <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Google
      </button>
    </>
  );
}

/* El panel es un drawer: entra desde la derecha con un muelle suave.
   Se monta en un portal para que no lo recorte el `overflow-x: clip` del landing. */
export default function AuthPanel({ mode, onModeChange, onClose }: {
  mode: AuthMode | null;
  onModeChange: (m: AuthMode) => void;
  onClose: () => void;
}) {
  const open = mode !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    getLenis()?.stop();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      getLenis()?.start();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="kdz-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            className="kdz kdz-panel"
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36, mass: 0.9 }}
          >
            <div className="kdz-panel-glow" />
            <PanelBody mode={mode!} onModeChange={onModeChange} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function PanelBody({ mode, onModeChange, onClose }: {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const theme = useThemeStore((s) => s.theme);
  const firstField = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Aviso dejado por otra pantalla antes de mandar aqui (p. ej. "cambia la
     contrasena y vuelve a entrar"). Se consume una sola vez. */
  const [notice, setNotice] = useState<string | null>(consumeFlashNotice);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => firstField.current?.focus(), 380);
    return () => window.clearTimeout(id);
  }, [mode]);

  const switchTo = (m: AuthMode) => { setError(null); onModeChange(m); };

  /* Toda la autenticacion acaba igual: guardar sesion y entrar al workspace.
     El backend devuelve `errorCode`, no un mensaje legible, asi que se traduce
     igual que en el resto de la app y se cae a INTERNAL_ERROR. */
  const authenticate = async (call: Promise<{ data: AuthResponse }>) => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const { data } = await call;
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate('/workspaces');
    } catch (err) {
      const res = (err as { response?: { data?: { errorCode?: string; error?: string } } }).response;
      const code = res?.data?.errorCode ?? res?.data?.error;
      const translated = code ? t(`errors.${code}`) : null;
      setError(translated && translated !== `errors.${code}` ? translated : t('errors.INTERNAL_ERROR'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (mode === 'register') {
      if (password.length < 6) return setError(t('auth.register.validation.passwordTooShort'));
      if (password !== confirm) return setError(t('auth.register.validation.passwordsDontMatch'));
    }

    void authenticate(mode === 'login'
      ? authApi.login(email, password)
      : authApi.register(username, email, password));
  };

  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
      : password.length < 9 ? 2
        : password.length < 12 ? 3 : 4;

  const strengthLabel = password.length < 6 ? t('auth.register.passwordStrength.tooShort')
    : password.length < 9 ? t('auth.register.passwordStrength.acceptable')
      : password.length < 12 ? t('auth.register.passwordStrength.good')
        : t('auth.register.passwordStrength.excellent');

  return (
    <div className="kdz-panel-body">
      <div className="kdz-panel-head">
        <img src={theme === 'dark' ? wordmarkLight : wordmarkDark} alt="Kadenza" width={112} height={23} style={{ display: 'block' }} />
        <button className="kdz-x" onClick={onClose} aria-label={t('common.close', { defaultValue: 'Cerrar' })}>
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      <div className="kdz-tabs" role="tablist">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            data-on={mode === m}
            className="kdz-tab"
            onClick={() => switchTo(m)}
            style={{ position: 'relative', isolation: 'isolate' }}
          >
            {mode === m && (
              <motion.span
                layoutId="kdz-tab-pill"
                className="kdz-tab-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {m === 'login' ? t('auth.login.submit') : t('auth.register.submit')}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === 'login' ? -14 : 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === 'login' ? 14 : -14 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 style={{ margin: '0 0 6px', fontSize: 25, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--k-strong)' }}>
            {mode === 'login' ? t('auth.login.title') : t('auth.register.title')}
          </h2>
          <p style={{ margin: '0 0 26px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--k-muted)' }}>
            {mode === 'login' ? t('auth.login.subtitle') : t('auth.register.subtitle')}
          </p>

          {error && (
            <div className="kdz-error" role="alert">
              <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {notice && !error && (
            <div className="kdz-notice" role="status">
              <Info size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{notice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="kdz-field">
                <label htmlFor="kdz-user">{t('auth.register.username')}</label>
                <div className="kdz-input-wrap">
                  <User size={16} strokeWidth={1.8} />
                  <input
                    id="kdz-user"
                    ref={firstField}
                    className="kdz-input"
                    autoComplete="username"
                    placeholder={t('auth.register.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="kdz-field">
              <label htmlFor="kdz-email">{t('auth.login.email')}</label>
              <div className="kdz-input-wrap">
                <Mail size={16} strokeWidth={1.8} />
                <input
                  id="kdz-email"
                  ref={mode === 'login' ? firstField : undefined}
                  className="kdz-input"
                  type="email"
                  autoComplete="email"
                  placeholder={t('auth.login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="kdz-field">
              <label htmlFor="kdz-pw">{t('auth.login.password')}</label>
              <div className="kdz-input-wrap">
                <Lock size={16} strokeWidth={1.8} />
                <input
                  id="kdz-pw"
                  className="kdz-input kdz-input--eye"
                  type={showPw ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="kdz-eye" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                </button>
              </div>

              {mode === 'register' && password.length > 0 && (
                <>
                  <div className="kdz-meter">
                    {[1, 2, 3, 4].map((lvl) => (
                      <i key={lvl} style={{ background: strength >= lvl ? METER_COLORS[strength - 1] : undefined }} />
                    ))}
                  </div>
                  <p className="kdz-hint">{strengthLabel}</p>
                </>
              )}
            </div>

            {mode === 'register' && (
              <div className="kdz-field">
                <label htmlFor="kdz-confirm">{t('auth.register.confirmPassword')}</label>
                <div className="kdz-input-wrap">
                  <ShieldCheck size={16} strokeWidth={1.8} />
                  <input
                    id="kdz-confirm"
                    className="kdz-input kdz-input--eye"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <button type="button" className="kdz-eye" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <Link to="/forgot-password" className="kdz-link">
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>
            )}

            <button type="submit" className="kdz-submit" disabled={loading}>
              {loading && <span className="kdz-spin" />}
              {mode === 'login' ? t('auth.login.submit') : t('auth.register.submit')}
            </button>
          </form>

          {GOOGLE_ENABLED && (
            <GoogleButton
              disabled={loading}
              onToken={(token) => void authenticate(authApi.googleLogin(token))}
              onError={() => setError(t('auth.login.googleError'))}
            />
          )}

          <p className="kdz-alt">
            {mode === 'login' ? t('auth.login.noAccount') : t('auth.register.alreadyHaveAccount')}{' '}
            <button className="kdz-link" onClick={() => switchTo(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? t('auth.login.registerLink') : t('auth.register.loginLink')}
            </button>
          </p>

          {mode === 'register' && <p className="kdz-legal">{t('landing.auth.legal')}</p>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}