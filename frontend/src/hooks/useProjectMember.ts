import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { projectsApi } from '../api/projects';
import { workspacesApi } from '../api/workspaces';
import type { TeamMember } from '../types';

export interface ProjectMemberPermissions {
  member: TeamMember | null;
  loading: boolean;
  isAdmin: boolean;
  isScrumMaster: boolean;
  isProductOwner: boolean;
  isDeveloper: boolean;
  /** PO — tasks always start in the backlog, owned by the PO */
  canCreateTask: boolean;
  /** PO — Product Backlog is owned by the PO */
  canEditBacklogTask: boolean;
  /** Developer — Sprint Backlog is owned by the Development Team */
  canEditSprintTask: boolean;
  /** PO */
  canDeleteBacklogTask: boolean;
  /** Developer */
  canDeleteSprintTask: boolean;
  /** Developer — moving tasks on the Kanban board */
  canMoveTask: boolean;
  /** Developer or PO — Sprint Planning: Developers select, PO proposes */
  canPlanSprint: boolean;
  /** Developer — add/remove tasks from an ACTIVE sprint (team self-organizes) */
  canAddToActiveSprint: boolean;
  /** SM — sprint lifecycle (create, activate, complete) */
  canManageSprint: boolean;
  /** SM or PO — create Planning Poker sessions */
  canCreatePokerSession: boolean;
}

export function useProjectMember(projectId: string | undefined): ProjectMemberPermissions {
  const currentUser = useAuthStore((s) => s.user);
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [wsAdmin, setWsAdmin] = useState(false);
  const [teamAdmin, setTeamAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const fetchPermissions = async () => {
      try {
        // Fetch team members for this project
        const teamMembersRes = await projectsApi.getTeamMembers(projectId);
        const me = teamMembersRes.data.find((m) => m.userId === currentUser.id) ?? null;
        setMember(me);
        setTeamAdmin(me?.role === 'ADMIN');

        // Check workspace admin status
        if (workspaceId) {
          const wsMembers = await workspacesApi.getMembers(workspaceId);
          const wsMember = wsMembers.data.find((m) => m.userId === currentUser.id);
          setWsAdmin(wsMember?.role === 'ADMIN');
        }
      } catch {
        setMember(null);
        setWsAdmin(false);
        setTeamAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [projectId, currentUser?.id, workspaceId]);

  const isAdmin = wsAdmin || teamAdmin;
  const isScrumMaster = member?.scrumRole === 'SCRUM_MASTER';
  const isProductOwner = member?.scrumRole === 'PRODUCT_OWNER';
  // Developer: any project team member who is not PO or SM. Technical admins do not get Scrum permissions by themselves.
  const isDeveloper = member !== null && !isProductOwner && !isScrumMaster;

  const canCreateTask = isProductOwner;
  const canEditBacklogTask = isProductOwner;
  const canEditSprintTask = isDeveloper;
  const canDeleteBacklogTask = isProductOwner;
  const canDeleteSprintTask = isDeveloper;
  const canMoveTask = isDeveloper;
  const canPlanSprint = isProductOwner || isDeveloper;
  const canAddToActiveSprint = isDeveloper;
  const canManageSprint = isScrumMaster;
  const canCreatePokerSession = isScrumMaster || isProductOwner;

  return {
    member,
    loading,
    isAdmin,
    isScrumMaster,
    isProductOwner,
    isDeveloper,
    canCreateTask,
    canEditBacklogTask,
    canEditSprintTask,
    canDeleteBacklogTask,
    canDeleteSprintTask,
    canMoveTask,
    canPlanSprint,
    canAddToActiveSprint,
    canManageSprint,
    canCreatePokerSession,
  };
}