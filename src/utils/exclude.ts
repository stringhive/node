import { basename } from 'node:path';

function matchGlob(pattern: string, str: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = escaped.replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${regexStr}$`).test(str);
}

export function isExcluded(filename: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const base = basename(filename);
  return patterns.some((p) => matchGlob(p, filename) || matchGlob(p, base));
}

export function isIncluded(filename: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true;
  const base = basename(filename);
  return patterns.some((p) => matchGlob(p, filename) || matchGlob(p, base));
}
