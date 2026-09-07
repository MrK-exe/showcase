import { describe, it, expect } from 'vitest';
import { workKind, statusLabel } from '../src/lib/work';

describe('workKind', () => {
  it('calls personal-tagged entries side quests, everything else work', () => {
    expect(workKind(['personal'])).toBe('Side quest');
    expect(workKind(['#work'])).toBe('Work');
    expect(workKind([])).toBe('Work');
  });
});

describe('statusLabel', () => {
  it('maps the CMS values to their human labels and passes unknown values through', () => {
    expect(statusLabel('wip')).toBe('in progress');
    expect(statusLabel('shipped')).toBe('shipped');
    expect(statusLabel('Steam')).toBe('Steam');
    expect(statusLabel(undefined)).toBeUndefined();
  });
});
