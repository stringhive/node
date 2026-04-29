import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    splitting: false,
    platform: 'node',
    target: 'node18',
  },
  {
    entry: { 'bin/stringhive': 'bin/stringhive.ts' },
    format: ['esm'],
    dts: false,
    splitting: false,
    platform: 'node',
    target: 'node18',
    banner: {
      js: '#!/usr/bin/env node',
    },
    define: {
      __STRINGHIVE_VERSION__: JSON.stringify(version),
    },
  },
]);
