import { describe, it, expect } from 'vitest';
import { cvName, cvSource, cvMonthPattern } from '../src/config/cv.mjs';

describe('cvName', () => {
  it('dates the file from the admin month', () => {
    expect(cvName('Oct 2026')).toBe('Abdullah_Aletai_CV_Oct_2026.pdf');
  });

  it('falls back to an undated name when the month is empty or malformed', () => {
    expect(cvName('')).toBe('Abdullah_Aletai_CV.pdf');
    expect(cvName(undefined)).toBe('Abdullah_Aletai_CV.pdf');
    expect(cvName("OCT '26")).toBe('Abdullah_Aletai_CV.pdf');
  });
});

describe('cvMonthPattern', () => {
  it('accepts a short month + year, or nothing (the field is optional)', () => {
    for (const ok of ['Oct 2026', 'Jan 2027', '']) expect(cvMonthPattern.test(ok)).toBe(true);
    for (const bad of ['October 2026', 'oct 2026', 'Oct 26', 'Oct  2026', '10/2026']) expect(cvMonthPattern.test(bad)).toBe(false);
  });
});

describe('cvSource', () => {
  it('maps the admin value to the file in the upload folder', () => {
    expect(cvSource('/cv/cvUrl.pdf')).toBe('cv/cvUrl.pdf');
  });

  it('is null when no CV is set', () => {
    expect(cvSource('')).toBeNull();
  });
});
