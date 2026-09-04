import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import RetrospectiveModal, { parseRetrospective } from './RetrospectiveModal';
import { renderWithProviders } from '../../test/testUtils';
import { sprintsApi } from '../../api/sprints';
import type { Sprint } from '../../types';
import i18n from '../../i18n';

jest.mock('../../api/sprints', () => ({
  sprintsApi: {
    saveRetrospective: jest.fn(),
  },
}));

const mockSaveRetrospective = jest.mocked(sprintsApi.saveRetrospective);

function sprintFixture(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: 'sprint-1',
    projectId: 'project-1',
    name: 'Sprint 7',
    goal: 'Stabilize the CI flow',
    status: 'COMPLETED',
    startDate: '2026-08-20',
    endDate: '2026-09-03',
    reviewNotes: null,
    createdAt: '2026-08-20T08:00:00Z',
    updatedAt: '2026-09-04T08:00:00Z',
    ...overrides,
  };
}

describe('RetrospectiveModal', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('parses retrospective payloads and falls back to plain text for malformed notes', () => {
    expect(parseRetrospective(null)).toBeNull();
    expect(parseRetrospective('plain notes')).toBe('plain notes');
    expect(parseRetrospective('{bad json')).toBe('{bad json');
    expect(parseRetrospective(JSON.stringify({
      technique: 'START_STOP_CONTINUE',
      answers: { start: 'Keep shipping' },
    }))).toEqual({
      technique: 'START_STOP_CONTINUE',
      answers: { start: 'Keep shipping' },
    });
  });

  it('lets the user select a technique, fill answers and save successfully', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    mockSaveRetrospective.mockResolvedValueOnce(
      sprintFixture({
        reviewNotes: JSON.stringify({
          technique: 'START_STOP_CONTINUE',
          answers: { start: 'Cover the frontend hotspots' },
        }),
      }) as never,
    );

    const { user } = renderWithProviders(
      <RetrospectiveModal sprint={sprintFixture()} onClose={onClose} onSaved={onSaved} />,
    );

    await user.click(screen.getByRole('button', {
      name: new RegExp(i18n.t('projects.sprints.retrospective.techniques.START_STOP_CONTINUE.name')),
    }));

    const fields = screen.getAllByRole('textbox');
    await user.type(fields[0], 'Cover the frontend hotspots');
    await user.type(fields[1], 'Stop shipping flaky selectors');

    const saveButton = screen.getByRole('button', {
      name: i18n.t('projects.sprints.retrospective.save'),
    });
    fireEvent.mouseEnter(saveButton);
    fireEvent.mouseLeave(saveButton);
    await user.click(saveButton);

    await waitFor(() => expect(mockSaveRetrospective).toHaveBeenCalledWith('sprint-1', JSON.stringify({
      technique: 'START_STOP_CONTINUE',
      answers: {
        start: 'Cover the frontend hotspots',
        stop: 'Stop shipping flaky selectors',
      },
    })));
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('loads existing data, allows going back and shows the translated error on save failure', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    mockSaveRetrospective.mockRejectedValueOnce(new Error('boom'));

    const existing = sprintFixture({
      reviewNotes: JSON.stringify({
        technique: 'MAD_SAD_GLAD',
        answers: { glad: 'New CI coverage' },
      }),
    });

    const { user } = renderWithProviders(
      <RetrospectiveModal sprint={existing} onClose={onClose} onSaved={onSaved} />,
    );

    expect(screen.getByDisplayValue('New CI coverage')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: i18n.t('projects.sprints.retrospective.backToTechniques'),
    }));
    await user.click(screen.getByRole('button', {
      name: new RegExp(i18n.t('projects.sprints.retrospective.techniques.MAD_SAD_GLAD.name')),
    }));

    const areas = screen.getAllByRole('textbox');
    await user.clear(areas[0]);
    await user.type(areas[0], 'Still good');
    await user.click(screen.getByRole('button', {
      name: i18n.t('projects.sprints.retrospective.save'),
    }));

    expect(await screen.findByText(i18n.t('projects.sprints.retrospective.error'))).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
