import { render, screen } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import { AssigneeAvatar, AssigneeDropdown } from './AssigneePicker';
import { EpicDropdown } from './EpicPicker';
import { LabelChip, LabelMultiSelect } from './LabelPicker';
import { renderWithProviders } from '../../test/testUtils';
import type { Epic, Label } from '../../types';

const labels = [
  { id: 'l1', projectId: 'p1', name: 'Backend', color: '#ff0000' },
  { id: 'l2', projectId: 'p1', name: 'Frontend', color: '#00ff00' },
] as Label[];
const epics = [{ id: 'e1', projectId: 'p1', name: 'Launch', color: '#123456' }] as Epic[];

describe('kanban pickers', () => {
  it('renders avatar images or deterministic initials', () => {
    const { rerender } = render(<AssigneeAvatar name="Ada Lovelace" />);
    expect(screen.getByText('AL')).toBeInTheDocument();
    rerender(<AssigneeAvatar name="Ada" avatarUrl="/avatar.png" />);
    expect(screen.getByRole('img', { name: 'Ada' })).toHaveAttribute('src', '/avatar.png');
  });

  it('selects and clears an assignee', async () => {
    const change = jest.fn();
    const props = {
      value: '', change,
      members: [{ userId: 'u1' }], userMap: { u1: { username: 'ada', fullName: 'Ada Lovelace' } },
      placeholder: 'Unassigned', onChange: change,
    };
    const { user } = renderWithProviders(<AssigneeDropdown {...props} />);
    await user.click(screen.getByRole('button', { name: /Unassigned/ }));
    await user.click(screen.getByRole('button', { name: /Ada Lovelace/ }));
    expect(change).toHaveBeenCalledWith('u1');
  });

  it('selects an epic and supports the no-epic option', async () => {
    const change = jest.fn();
    const { user } = renderWithProviders(<EpicDropdown value="" onChange={change} epics={epics} placeholder="No epic" />);
    await user.click(screen.getByRole('button', { name: /No epic/ }));
    await user.click(screen.getByRole('button', { name: 'Launch' }));
    expect(change).toHaveBeenCalledWith('e1');
  });

  it('renders label chips and toggles multi-selection', async () => {
    render(<LabelChip label={labels[0]} />);
    expect(screen.getByText('Backend')).toBeInTheDocument();
    const change = jest.fn();
    const { user } = renderWithProviders(<LabelMultiSelect labels={labels} selected={['l1']} onChange={change} />);
    await user.click(screen.getByRole('button', { name: /Backend/ }));
    await user.click(screen.getAllByRole('button', { name: /Backend/ })[1]);
    expect(change).toHaveBeenCalledWith([]);
  });
});
