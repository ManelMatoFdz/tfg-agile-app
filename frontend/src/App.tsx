import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLenis } from './hooks/useLenis';
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
import ProjectSettingsPage from './pages/workspace/project/ProjectSettingsPage';
import BoardSettingsPage from './pages/workspace/project/BoardSettingsPage';
import SprintReportPage from './pages/workspace/project/SprintReportPage';
import SprintPlanningPage from './pages/workspace/project/SprintPlanningPage';
import SprintBacklogPage from './pages/workspace/project/SprintBacklogPage';
import PokerPage from './pages/workspace/project/PokerPage';
import PokerRoomPage from './pages/workspace/project/PokerRoomPage';
import ProjectMetricsPage from './pages/workspace/project/ProjectMetricsPage';
import EpicsPage from './pages/workspace/project/EpicsPage';
import MyTasksPage from './pages/MyTasksPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import WorkspaceLayout from './components/ui/WorkspaceLayout';
import ProjectLayout from './components/ui/ProjectLayout';

export default function App() {
  useLenis();

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
          {/* Standalone pages (no sidebar) */}
          <Route path="/workspaces" element={<WorkspaceSelectorPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Workspace routes (with sidebar) */}
          <Route path="/workspaces/:workspaceId" element={<WorkspaceLayout />}>
            <Route index element={<WorkspaceDashboardPage />} />

            {/* Project layout with tabs */}
            <Route path="projects/:projectId" element={<ProjectLayout />}>
              <Route index element={<Navigate to="board" replace />} />
              <Route path="board" element={<KanbanPage />} />
              <Route path="backlog" element={<BacklogPage />} />
              <Route path="epics" element={<EpicsPage />} />
              <Route path="sprints" element={<SprintsPage />} />
              <Route path="sprints/:sprintId/planning" element={<SprintPlanningPage />} />
              <Route path="sprints/:sprintId/backlog" element={<SprintBacklogPage />} />
              <Route path="sprints/:sprintId/report" element={<SprintReportPage />} />
              <Route path="members" element={<ProjectMembersPage />} />
              <Route path="poker" element={<PokerPage />} />
              <Route path="metrics" element={<ProjectMetricsPage />} />
              <Route path="board-settings" element={<BoardSettingsPage />} />
              <Route path="settings" element={<ProjectSettingsPage />} />
              <Route path="poker/:sessionId" element={<PokerRoomPage />} />
            </Route>

            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:teamId" element={<TeamDetailPage />} />
            <Route path="members" element={<WorkspaceMembersPage />} />
            <Route path="settings" element={<WorkspaceSettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="my-tasks" element={<MyTasksPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/workspaces" replace />} />
      </Routes>
    </BrowserRouter>
  );
}