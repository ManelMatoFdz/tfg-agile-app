import { describe, expect, it } from '@jest/globals';
import { EMPTY_FILTERS, activeFilterCount, hasActiveFilters } from './kanban/TaskFilterBar';
import { parseRetrospective } from './sprints/RetrospectiveModal';

describe('task filter helpers', () => {
  it('recognizes the canonical empty state', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('counts each selected value and the search query', () => {
    const filters = {
      priorities: ['HIGH', 'CRITICAL'],
      assigneeIds: ['u1'],
      labelIds: ['l1', 'l2'],
      statuses: ['TODO'],
      epicIds: ['e1'],
      search: 'checkout',
    } as typeof EMPTY_FILTERS;

    expect(hasActiveFilters(filters)).toBe(true);
    expect(activeFilterCount(filters)).toBe(6);
  });

  it('ignores empty filter categories', () => {
    const filters = { ...EMPTY_FILTERS, search: '' };
    expect(hasActiveFilters(filters)).toBe(false);
    expect(activeFilterCount(filters)).toBe(0);
  });
});

describe('retrospective parsing', () => {
  it('returns null only for missing or empty notes', () => {
    expect(parseRetrospective(null)).toBeNull();
    expect(parseRetrospective(undefined)).toBeNull();
    expect(parseRetrospective('')).toBeNull();
  });

  it('keeps legacy plain-text notes intact', () => {
    expect(parseRetrospective('A useful legacy note')).toBe('A useful legacy note');
    expect(parseRetrospective('{not-json')).toBe('{not-json');
    expect(parseRetrospective('  ')).toBe('  ');
  });

  it('parses valid structured retrospective data', () => {
    const structured = {
      technique: 'START_STOP_CONTINUE',
      answers: { start: ['Pair more'], stop: ['Long meetings'], continue: ['Small PRs'] },
    };
    expect(parseRetrospective(JSON.stringify(structured))).toEqual(structured);
  });

  it('rejects JSON that does not match the retrospective schema', () => {
    const text = JSON.stringify({ technique: 'UNKNOWN', columns: {} });
    expect(parseRetrospective(text)).toBe(text);
  });
});
