import { join } from 'node:path';
import { StringhiveClient } from '../api/client.js';
import { getFormatHandler } from '../formats/index.js';
import { loadStringhiveConfig } from '../config/loader.js';
import type { FormatName } from '../formats/types.js';

export interface PullOptions {
  locale?: string[];
  format?: FormatName;
  dryRun?: boolean;
  includeSource?: boolean;
  sourceLocale?: string;
  langPath?: string;
  quiet?: boolean;
}

export async function pullCommand(hive: string | undefined, cliOptions: PullOptions): Promise<void> {
  const fileConfig = await loadStringhiveConfig();

  const resolvedHive = hive ?? fileConfig.hive;
  if (!resolvedHive) {
    throw new Error('No hive specified. Pass it as an argument or set "hive" in stringhive.config.ts.');
  }

  const configLocales = fileConfig.pull?.locale;
  const configLocaleList = configLocales
    ? Array.isArray(configLocales)
      ? configLocales
      : [configLocales]
    : undefined;

  const options = {
    locale: cliOptions.locale ?? configLocaleList,
    format: cliOptions.format ?? fileConfig.format ?? ('json' as FormatName),
    dryRun: cliOptions.dryRun ?? fileConfig.pull?.dryRun ?? false,
    includeSource: cliOptions.includeSource ?? fileConfig.pull?.includeSource ?? false,
    sourceLocale: cliOptions.sourceLocale ?? fileConfig.sourceLocale ?? 'en',
    langPath: cliOptions.langPath ?? fileConfig.langPath ?? './lang',
    quiet: cliOptions.quiet ?? false,
  };

  const client = new StringhiveClient({
    token: fileConfig.token,
    baseUrl: fileConfig.url,
  });

  const handler = getFormatHandler(options.format);
  const log = options.quiet ? () => {} : (msg: string) => process.stdout.write(msg + '\n');

  const result = await client.export(resolvedHive, options.format);
  let files = result.files;

  if (!options.includeSource) {
    files = Object.fromEntries(
      Object.entries(files).filter(([filename]) =>
        !filename.startsWith(`${options.sourceLocale}.`) &&
        !filename.startsWith(`${options.sourceLocale}/`),
      ),
    );
  }

  if (options.locale && options.locale.length > 0) {
    files = Object.fromEntries(
      Object.entries(files).filter(([filename]) =>
        options.locale!.some(
          (locale) => filename.startsWith(`${locale}.`) || filename.startsWith(`${locale}/`),
        ),
      ),
    );
  }

  const fileEntries = Object.entries(files);

  if (fileEntries.length === 0) {
    log('No files to pull.');
    return;
  }

  if (options.dryRun) {
    log(`Dry run — would write ${fileEntries.length} file(s): ${fileEntries.map(([f]) => f).join(', ')}`);
    return;
  }

  log(`Pulling from hive '${resolvedHive}'...`);

  let totalKeys = 0;
  for (const [filename, content] of fileEntries) {
    const outPath = join(options.langPath, filename);
    await handler.write(outPath, content);
    const count = Object.keys(content).length;
    totalKeys += count;
    log(`  ✓ ${filename}: ${count} keys → ${outPath}`);
  }

  log(`✓ Done. ${totalKeys} total keys written across ${fileEntries.length} file(s).`);
}
