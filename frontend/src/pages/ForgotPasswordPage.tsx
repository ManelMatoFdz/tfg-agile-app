import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { authApi } from '../api/auth';
import { useApiAction } from '../hooks/useApiAction';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { loading, error, success, run, reset } = useApiAction();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await run(authApi.forgotPassword(email));
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div>
          {/* Icon */}
          <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Recuperar contraseña</h2>
          <p className="mt-2 text-gray-500">
            Introduce tu correo y te enviaremos instrucciones para restablecerla
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={reset} />}
        {success && (
          <Alert type="success" message="Se ha enviado un correo con instrucciones. Revisa tu bandeja de entrada." />
        )}

        {!success && (
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
            <Button type="submit" loading={loading} className="w-full h-12 text-base">
              Enviar instrucciones
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500">
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline underline-offset-4 transition-all inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
