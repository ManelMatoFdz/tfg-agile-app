import { useEffect } from 'react';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import ProfileInfo from '../components/profile/ProfileInfo';
import AvatarUpload from '../components/profile/AvatarUpload';
import ChangePassword from '../components/profile/ChangePassword';
import NotificationPreferences from '../components/profile/NotificationPreferences';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    usersApi.getMe().then((res) => setUser(res.data)).catch(() => {});
  }, [setUser]);

  const avatarSrc = user?.avatarUrl
    ? `${API_BASE}/assets/avatars/${user.id}`
    : null;

  return (
    <div className="space-y-8 animate-slide-up-fade">
      {/* Profile header card */}
      <div className="glass-card-strong rounded-2xl p-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-accent-500/5 to-primary-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-xl" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 via-accent-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white shadow-xl">
                {user?.username?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-[3px] border-white rounded-full" />
          </div>

          {/* User info */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.fullName || user?.username || 'Usuario'}
            </h1>
            <p className="text-gray-500 mt-0.5">@{user?.username}</p>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
            {user?.bio && (
              <p className="text-sm text-gray-600 mt-3 max-w-lg">{user.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
        <div className="lg:col-span-2 space-y-6">
          <ProfileInfo />
          <ChangePassword />
        </div>
        <div className="space-y-6">
          <AvatarUpload />
          <NotificationPreferences />
        </div>
      </div>
    </div>
  );
}
