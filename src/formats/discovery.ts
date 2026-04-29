import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { FormatName } from './types.js';

export function resolveLocalePath(langPath: string, locale: string, _format: FormatName): string {
  return join(langPath, `${locale}.json`);
}

export async function discoverLocales(langPath: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(langPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const locales: string[] = [];
  for (const entry of entries) {
    const fullPath = join(langPath, entry);
    const info = await stat(fullPath).catch(() => null);
    if (!info) continue;

    if (info.isDirectory()) {
      locales.push(entry);
    } else if (info.isFile() && extname(entry) === '.json') {
      locales.push(entry.slice(0, -5));
    }
  }

  return locales;
}
