import { JsonFlatHandler } from './json-flat.js';
import type { FormatName, FormatHandler } from './types.js';

const handlers: Record<FormatName, FormatHandler> = {
  json: new JsonFlatHandler(),
};

export function getFormatHandler(format: FormatName): FormatHandler {
  return handlers[format];
}

export type { FormatName, FormatHandler };
export { resolveLocalePath, discoverLocales } from './discovery.js';
