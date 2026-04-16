import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import WorkspaceSelectorPage from './pages/workspace/WorkspaceSelectorPage';
import WorkspaceDashboardPage from './pages/workspace/WorkspaceDashboardPage';
import ProjectDetailPage from './pages/workspace/ProjectDetailPage';
import TeamsPage from './pages/workspace/TeamsPage';
import TeamDetailPage from './pages/workspace/TeamDetailPage';
import WorkspaceMembersPage from './pages/workspace/WorkspaceMembersPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/ui/AppLayout';
import WorkspaceLayout from './components/ui/WorkspaceLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          {/* Workspace selector (no sidebar) */}
          <Route path="/workspaces" element={<WorkspaceSelectorPage />} />

          {/* Workspace routes (with sidebar) */}
          <Route path="/workspaces/:workspaceId" element={<WorkspaceLayout />}>
            <Route index element={<WorkspaceDashboardPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:teamId" element={<TeamDetailPage />} />
            <Route path="members" element={<WorkspaceMembersPage />} />
            {/* Future: settings */}
          </Route>

          {/* Account routes */}
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/workspaces" replace />} />
      </Routes>
    </BrowserRouter>
  );
}