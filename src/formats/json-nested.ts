import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { FormatHandler } from './types.js';

type NestedObject = { [key: string]: string | NestedObject };

function flatten(obj: NestedObject, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (value !== null && typeof value === 'object') {
      Object.assign(result, flatten(value, fullKey));
    }
  }
  return result;
}

function unflatten(flat: Record<string, string>): NestedObject {
  const result: NestedObject = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cursor: NestedObject = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part in cursor) || typeof cursor[part] === 'string') {
        cursor[part] = {};
      }
      cursor = cursor[part] as NestedObject;
    }
    cursor[parts[parts.length - 1]!] = value;
  }
  return result;
}

export class JsonNestedHandler implements FormatHandler {
  async read(filePath: string): Promise<Record<string, string>> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const nested = JSON.parse(content) as NestedObject;
      return flatten(nested);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw err;
    }
  }

  async write(filePath: string, strings: Record<string, string>): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const nested = unflatten(strings);
    await writeFile(filePath, JSON.stringify(nested, null, 2) + '\n', 'utf-8');
  }
}
