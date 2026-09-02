import type { TeamMember, User, UserSummary, WorkspaceMember } from '../types';

export const userFixture = (overrides: Partial<User> = {}): User => ({
  id: 'user-1', username: 'tester', email: 'tester@example.com', fullName: 'Test User', ...overrides,
});

export const userSummaryFixture = (overrides: Partial<UserSummary> = {}): UserSummary => ({
  id: 'user-1', username: 'tester', fullName: 'Test User', avatarUrl: '/assets/avatars/test.png', ...overrides,
});

export const teamMemberFixture = (overrides: Partial<TeamMember> = {}): TeamMember => ({
  id: 'team-member-1', userId: 'user-1', role: 'MEMBER', scrumRole: 'DEVELOPER',
  joinedAt: '2026-01-01T00:00:00Z', ...overrides,
});

export const workspaceMemberFixture = (overrides: Partial<WorkspaceMember> = {}): WorkspaceMember => ({
  id: 'workspace-member-1', workspaceId: 'workspace-1', userId: 'user-1', role: 'MEMBER',
  joinedAt: '2026-01-01T00:00:00Z', ...overrides,
});
