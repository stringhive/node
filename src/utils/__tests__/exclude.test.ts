import { describe, it, expect } from 'vitest';
import { isExcluded } from '../exclude.js';

describe('isExcluded', () => {
  it('returns false for empty patterns', () => {
    expect(isExcluded('auth.json', [])).toBe(false);
  });

  it('returns true for an exact match', () => {
    expect(isExcluded('auth.json', ['auth.json'])).toBe(true);
  });

  it('returns false when no pattern matches', () => {
    expect(isExcluded('auth.json', ['app.json', 'passwords.json'])).toBe(false);
  });

  it('supports * glob wildcard', () => {
    expect(isExcluded('auth.json', ['*.json'])).toBe(true);
    expect(isExcluded('auth.json', ['*.php'])).toBe(false);
  });

  it('supports ? wildcard', () => {
    expect(isExcluded('en.json', ['??.json'])).toBe(true);
    expect(isExcluded('en.json', ['???.json'])).toBe(false);
  });

  it('matches against basename for paths containing slashes', () => {
    expect(isExcluded('es/auth.json', ['auth.json'])).toBe(true);
    expect(isExcluded('fr/auth.json', ['*.json'])).toBe(true);
    expect(isExcluded('es/auth.json', ['app.json'])).toBe(false);
  });
});
