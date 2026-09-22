import { describe, it, expect } from 'vitest';
import { applyToggles, sectionDefaults, type SectionDef } from '../src/config/sections';

const shown = (defs: SectionDef[]) => defs.filter((s) => s.enabled).map((s) => s.id);
const allIds = sectionDefaults.map((s) => s.id);

describe('section registry', () => {
  it('has unique ids and every section on by default', () => {
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(sectionDefaults.every((s) => s.enabled)).toBe(true);
  });
});

describe('applyToggles', () => {
  it('leaves everything on when every switch is on', () => {
    const on = Object.fromEntries(allIds.map((id) => [id, true]));
    expect(shown(applyToggles(sectionDefaults, on))).toEqual(allIds);
  });

  it('hides exactly the sections switched off and keeps the order of the rest', () => {
    const out = applyToggles(sectionDefaults, { games: false, music: false });
    expect(shown(out)).toEqual(['work', 'writing', 'photography', 'films']);
    expect(out.map((s) => s.id)).toEqual(allIds);
  });

  it('treats a missing switch as on (a never-saved file hides nothing)', () => {
    expect(shown(applyToggles(sectionDefaults, {}))).toEqual(allIds);
  });

  it('cannot resurrect a section the code disabled', () => {
    const defs: SectionDef[] = [{ id: 'x', title: 'X', kind: 'fed', enabled: false }];
    expect(shown(applyToggles(defs, { x: true }))).toEqual([]);
  });

  it('does not mutate the defaults', () => {
    const before = JSON.stringify(sectionDefaults);
    applyToggles(sectionDefaults, { work: false });
    expect(JSON.stringify(sectionDefaults)).toBe(before);
  });
});
