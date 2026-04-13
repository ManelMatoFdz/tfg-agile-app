import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useApiAction } from '../hooks/useApiAction';
import type { AuthResponse } from '../types';
import { consumeFlashNotice } from '../utils/flashNotice';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const { loading, error, run, reset } = useApiAction<AuthResponse>();
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() => {
    const noticeFromState = (location.state as { notice?: string } | null)?.notice ?? null;
    return noticeFromState ?? consumeFlashNotice();
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGoogleError(null);
    const data = await run(authApi.login(email, password));
    if (data) {
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate('/profile');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setGoogleError(null);
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setGoogleError('Google no devolvio un idToken valido.');
      return;
    }

    const data = await run(authApi.googleLogin(idToken));
    if (data) {
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate('/profile');
    }
  };

  const handleGoogleError = () => {
    setGoogleError('No se pudo iniciar sesion con Google. Intentalo de nuevo.');
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Bienvenido de nuevo
          </h2>
          <p className="mt-2 text-gray-500">
            Accede a tu cuenta para continuar
          </p>
        </div>

        {(error || googleError) && (
          <Alert
            type="error"
            message={googleError ?? error!}
            onClose={() => {
              setGoogleError(null);
              reset();
            }}
          />
        )}
        {notice && <Alert type="info" message={notice} onClose={() => setNotice(null)} />}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline underline-offset-4 transition-all">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full h-12 text-base">
            Iniciar sesión
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200/60" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-50/80 backdrop-blur-sm px-4 text-gray-400 font-medium">
              o continúa con
            </span>
          </div>
        </div>

        {/* Google Sign-In */}
        {googleEnabled ? (
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              shape="pill"
              text="signin_with"
            />
          </div>
        ) : (
          <Alert type="info" message="Google Sign-In no configurado. Define VITE_GOOGLE_CLIENT_ID en frontend/.env." />
        )}

        {/* Register link */}
        <p className="text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline underline-offset-4 transition-all">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
