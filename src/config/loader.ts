import { loadConfig } from 'c12';
import type { StringhiveConfig } from './types.js';

export async function loadStringhiveConfig(): Promise<StringhiveConfig> {
  const { config } = await loadConfig<StringhiveConfig>({
    name: 'stringhive',
    rcFile: false,
    globalRc: false,
  });
  return config ?? {};
}
