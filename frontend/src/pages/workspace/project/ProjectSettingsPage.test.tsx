import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import ProjectSettingsPage from './ProjectSettingsPage';
import { renderWithProviders } from '../../../test/testUtils';
import { labelsApi } from '../../../api/labels';
import { projectsApi } from '../../../api/projects';
import { categoriesApi } from '../../../api/categories';
import { workspacesApi } from '../../../api/workspaces';
import { gitApi } from '../../../api/git';
import { useAuthStore } from '../../../store/authStore';
import { teamMemberFixture, userFixture, workspaceMemberFixture } from '../../../test/fixtures';
import i18n from '../../../i18n';
import type { Label, Project } from '../../../types';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

jest.mock('../../../api/projects', () => ({ projectsApi: {
  getById: jest.fn(), getTeamMembers: jest.fn(), update: jest.fn(), delete: jest.fn(),
} }));
jest.mock('../../../api/categories', () => ({ categoriesApi: { list: jest.fn() } }));
jest.mock('../../../api/workspaces', () => ({ workspacesApi: { getMembers: jest.fn() } }));
jest.mock('../../../api/labels', () => ({ labelsApi: {
  getByProject: jest.fn(), create: jest.fn(), update: jest.fn(), usage: jest.fn(), delete: jest.fn(),
} }));
jest.mock('../../../api/git', () => ({ gitApi: { getConfig: jest.fn(), setup: jest.fn(), disconnect: jest.fn() } }));

const project: Project = {
  id: 'project-1',
  workspaceId: 'workspace-1',
  teamId: 'team-1',
  name: 'Project One',
  description: '',
  color: '#6366f1',
  visibility: 'PRIVATE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const label: Label = {
  id: 'label-1',
  name: 'Backend',
  color: '#2563EB',
};

const axiosResponse = <T,>(data: T) => ({ data }) as never;

const renderProjectSettings = () => renderWithProviders(<ProjectSettingsPage />, {
  route: '/workspaces/workspace-1/projects/project-1/settings',
  path: '/workspaces/:workspaceId/projects/:projectId/settings',
});

describe('ProjectSettingsPage label deletion', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
    useAuthStore.setState({ accessToken: 'token', refreshToken: null, user: userFixture({ id: 'user-1' }) });
    jest.mocked(projectsApi.getById).mockResolvedValue(axiosResponse(project));
    jest.mocked(projectsApi.getTeamMembers).mockResolvedValue(axiosResponse([
      teamMemberFixture({ userId: 'user-1', role: 'ADMIN' }),
    ]));
    jest.mocked(categoriesApi.list).mockResolvedValue(axiosResponse([]));
    jest.mocked(workspacesApi.getMembers).mockResolvedValue(axiosResponse([
      workspaceMemberFixture({ userId: 'user-1', role: 'MEMBER' }),
    ]));
    jest.mocked(labelsApi.getByProject).mockResolvedValue([label]);
    jest.mocked(labelsApi.usage).mockResolvedValue({ labelId: label.id, taskCount: 2 });
    jest.mocked(labelsApi.delete).mockResolvedValue(undefined as never);
    jest.mocked(gitApi.getConfig).mockResolvedValue(null);
  });

  it('shows usage before deleting a label and removes it only after confirmation', async () => {
    const { user } = renderProjectSettings();

    await screen.findByText('Backend');

    await user.click(screen.getByRole('button', { name: 'Delete label Backend' }));

    expect(labelsApi.usage).toHaveBeenCalledWith('label-1');
    const dialog = await screen.findByRole('dialog', { name: 'Delete label' });
    expect(within(dialog).getByText(/assigned to 2 tasks/i)).toBeInTheDocument();
    expect(labelsApi.delete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Delete label' }));

    await waitFor(() => expect(labelsApi.delete).toHaveBeenCalledWith('label-1'));
    await waitFor(() => expect(screen.queryByText('Backend')).not.toBeInTheDocument());
  });

  it('does not delete the label when the confirmation modal is cancelled', async () => {
    const { user } = renderProjectSettings();

    await screen.findByText('Backend');
    await user.click(screen.getByRole('button', { name: 'Delete label Backend' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete label' });

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(labelsApi.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Delete label' })).not.toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });
});
