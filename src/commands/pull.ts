import { StringhiveClient } from '../api/client.js';
import { getFormatHandler, discoverLocales, resolveLocalePath } from '../formats/index.js';
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

  let targetLocales: string[];
  if (options.locale && options.locale.length > 0) {
    targetLocales = options.locale;
  } else {
    const allLocales = (await client.locales()).map((l) => l.code);
    targetLocales = options.includeSource
      ? allLocales
      : allLocales.filter((l) => l !== options.sourceLocale);
  }

  if (targetLocales.length === 0) {
    log('No locales to pull.');
    return;
  }

  if (options.dryRun) {
    log(`Dry run — would pull ${targetLocales.length} locale(s): ${targetLocales.join(', ')}`);
    return;
  }

  log(`Pulling ${targetLocales.length} locale(s) from hive '${resolvedHive}'...`);

  let totalKeys = 0;
  for (const locale of targetLocales) {
    const strings = await client.export(resolvedHive, locale, options.format);
    const count = Object.keys(strings).length;
    totalKeys += count;

    const outPath = resolveLocalePath(options.langPath, locale, options.format);
    await handler.write(outPath, strings);
    log(`  ✓ ${locale}: ${count} keys → ${outPath}`);
  }

  log(`✓ Done. ${totalKeys} total keys written across ${targetLocales.length} locale(s).`);
}
