import { JsonFlatHandler } from './json-flat.js';
import { JsonNestedHandler } from './json-nested.js';
import type { FormatName, FormatHandler } from './types.js';

const handlers: Record<FormatName, FormatHandler> = {
  json: new JsonFlatHandler(),
  json_nested: new JsonNestedHandler(),
};

export function getFormatHandler(format: FormatName): FormatHandler {
  return handlers[format];
}

export type { FormatName, FormatHandler };
export { resolveLocalePath, discoverLocales } from './discovery.js';
