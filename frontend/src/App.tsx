import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import WorkspaceSelectorPage from './pages/workspace/WorkspaceSelectorPage';
import WorkspaceDashboardPage from './pages/workspace/WorkspaceDashboardPage';
import TeamsPage from './pages/workspace/TeamsPage';
import TeamDetailPage from './pages/workspace/TeamDetailPage';
import WorkspaceMembersPage from './pages/workspace/WorkspaceMembersPage';
import WorkspaceSettingsPage from './pages/workspace/WorkspaceSettingsPage';
import KanbanPage from './pages/workspace/project/KanbanPage';
import BacklogPage from './pages/workspace/project/BacklogPage';
import SprintsPage from './pages/workspace/project/SprintsPage';
import ProjectMembersPage from './pages/workspace/project/ProjectMembersPage';
import SprintBoardPage from './pages/workspace/project/SprintBoardPage';
import SprintReportPage from './pages/workspace/project/SprintReportPage';
import MyTasksPage from './pages/MyTasksPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/ui/AppLayout';
import WorkspaceLayout from './components/ui/WorkspaceLayout';
import ProjectLayout from './components/ui/ProjectLayout';

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

            {/* Project layout with tabs */}
            <Route path="projects/:projectId" element={<ProjectLayout />}>
              <Route index element={<Navigate to="board" replace />} />
              <Route path="board" element={<KanbanPage />} />
              <Route path="backlog" element={<BacklogPage />} />
              <Route path="sprints" element={<SprintsPage />} />
              <Route path="sprints/:sprintId/board" element={<SprintBoardPage />} />
              <Route path="sprints/:sprintId/report" element={<SprintReportPage />} />
              <Route path="members" element={<ProjectMembersPage />} />
            </Route>

            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:teamId" element={<TeamDetailPage />} />
            <Route path="members" element={<WorkspaceMembersPage />} />
            <Route path="settings" element={<WorkspaceSettingsPage />} />
          </Route>

          {/* Account routes */}
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/my-tasks" element={<MyTasksPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/workspaces" replace />} />
      </Routes>
    </BrowserRouter>
  );
}