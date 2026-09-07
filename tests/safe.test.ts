import { describe, it, expect } from 'vitest';
import { isSafeHref, externalAttrs } from '../src/lib/safe';

// Security boundary: CMS singletons + feed data supply hrefs as free strings. A poisoned
// value (javascript:, data:, …) must never render as a clickable sink. These tests pin the
// allowlist so a well-meaning refactor can't quietly widen it.
describe('isSafeHref', () => {
  it('allows http(s) and mailto', () => {
    expect(isSafeHref('https://example.com')).toBe(true);
    expect(isSafeHref('http://example.com')).toBe(true);
    expect(isSafeHref('mailto:a@b.com')).toBe(true);
  });

  it('allows our own relative / anchor URLs (no scheme)', () => {
    expect(isSafeHref('/showcase/#work')).toBe(true);
    expect(isSafeHref('#games')).toBe(true);
    expect(isSafeHref('cv.pdf')).toBe(true);
    expect(isSafeHref('./games/drive')).toBe(true);
  });

  it('blocks dangerous schemes', () => {
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
    expect(isSafeHref('data:text/html,<script>')).toBe(false);
    expect(isSafeHref('vbscript:msgbox')).toBe(false);
    expect(isSafeHref('file:///etc/passwd')).toBe(false);
  });

  it('is scheme-case-insensitive (JavaScript: must still be blocked; HTTPS allowed)', () => {
    expect(isSafeHref('JavaScript:alert(1)')).toBe(false);
    expect(isSafeHref('HTTPS://example.com')).toBe(true);
  });

  it('rejects empty / null / whitespace', () => {
    expect(isSafeHref('')).toBe(false);
    expect(isSafeHref(null)).toBe(false);
    expect(isSafeHref(undefined)).toBe(false);
    expect(isSafeHref('   ')).toBe(false);
  });
});

describe('externalAttrs', () => {
  it('opens http(s) links in a new tab with noopener', () => {
    expect(externalAttrs('https://example.com')).toEqual({ target: '_blank', rel: 'noopener' });
  });
  it('leaves relative / anchor / mailto links untouched', () => {
    expect(externalAttrs('#work')).toEqual({});
    expect(externalAttrs('/showcase/')).toEqual({});
    expect(externalAttrs('mailto:a@b.com')).toEqual({});
  });
});
