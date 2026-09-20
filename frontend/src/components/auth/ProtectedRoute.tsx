import { Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usersApi } from '../../api/users';

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!token) return;
    usersApi.getMe().then((res) => setUser(res.data)).catch(() => {});
  }, [token, setUser]);

  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
