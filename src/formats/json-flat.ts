import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { FormatHandler } from './types.js';

export class JsonFlatHandler implements FormatHandler {
  async read(filePath: string): Promise<Record<string, string>> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as Record<string, string>;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw err;
    }
  }

  async write(filePath: string, strings: Record<string, string>): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(strings, null, 2) + '\n', 'utf-8');
  }
}
