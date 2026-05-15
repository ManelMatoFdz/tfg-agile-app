import projectClient from './projectClient';
import type { WorkspaceInvitation } from '../types';

export const invitationsApi = {
  getPending: () =>
    projectClient.get<WorkspaceInvitation[]>('/invitations/pending'),

  accept: (invitationId: string) =>
    projectClient.post<WorkspaceInvitation>(`/invitations/${invitationId}/accept`, {}),

  reject: (invitationId: string) =>
    projectClient.post<WorkspaceInvitation>(`/invitations/${invitationId}/reject`, {}),
};