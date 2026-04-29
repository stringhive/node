import { StringhiveClient } from '../api/client.js';
import { getFormatHandler, discoverLocales, resolveLocalePath } from '../formats/index.js';
import { loadStringhiveConfig } from '../config/loader.js';
import { isExcluded, isIncluded } from '../utils/exclude.js';
import type { FormatName } from '../formats/types.js';

export interface PushOptions {
  sync?: boolean;
  conflictStrategy?: 'keep' | 'clear';
  withTranslations?: boolean;
  sourceLocale?: string;
  langPath?: string;
  format?: FormatName;
  exclude?: string[];
  include?: string[];
  quiet?: boolean;
}

export async function pushCommand(hive: string | undefined, cliOptions: PushOptions): Promise<void> {
  const fileConfig = await loadStringhiveConfig();

  const resolvedHive = hive ?? fileConfig.hive;
  if (!resolvedHive) {
    throw new Error('No hive specified. Pass it as an argument or set "hive" in stringhive.config.ts.');
  }

  const exclude = [...(fileConfig.exclude ?? []), ...(cliOptions.exclude ?? [])];
  const include = [...(fileConfig.include ?? []), ...(cliOptions.include ?? [])];

  const options: Required<Omit<PushOptions, 'exclude' | 'include'>> = {
    sync: cliOptions.sync ?? false,
    conflictStrategy: cliOptions.conflictStrategy ?? fileConfig.push?.conflictStrategy ?? 'keep',
    withTranslations: cliOptions.withTranslations ?? fileConfig.push?.withTranslations ?? false,
    sourceLocale: cliOptions.sourceLocale ?? fileConfig.sourceLocale ?? 'en',
    langPath: cliOptions.langPath ?? fileConfig.langPath ?? './lang',
    format: cliOptions.format ?? fileConfig.format ?? 'json',
    quiet: cliOptions.quiet ?? false,
  };

  const client = new StringhiveClient({
    token: fileConfig.token,
    baseUrl: fileConfig.url,
  });

  const handler = getFormatHandler(options.format);
  const log = options.quiet ? () => {} : (msg: string) => process.stdout.write(msg + '\n');

  const filename = `${options.sourceLocale}.json`;

  if (isExcluded(filename, exclude) || !isIncluded(filename, include)) {
    log(`Source file '${filename}' is excluded — nothing to push.`);
    return;
  }

  const sourcePath = resolveLocalePath(options.langPath, options.sourceLocale, options.format);
  const sourceStrings = await handler.read(sourcePath);
  const entries = Object.entries(sourceStrings);

  if (entries.length === 0) {
    throw new Error(
      `No source strings found at ${sourcePath}. Check --lang-path and --source-locale.`,
    );
  }

  const files = { [filename]: sourceStrings };

  if (options.sync) {
    log(`Syncing ${entries.length} strings to hive '${resolvedHive}' (conflict strategy: ${options.conflictStrategy})...`);
    await client.syncStrings(resolvedHive, { files, conflict_strategy: options.conflictStrategy });
  } else {
    log(`Pushing ${entries.length} strings to hive '${resolvedHive}'...`);
    await client.importStrings(resolvedHive, { files });
  }

  log(`✓ Source strings pushed.`);

  if (options.withTranslations) {
    const allLocales = await discoverLocales(options.langPath);
    const translationLocales = allLocales.filter((l) => l !== options.sourceLocale);

    for (const locale of translationLocales) {
      if (isExcluded(`${locale}.json`, exclude) || !isIncluded(`${locale}.json`, include)) continue;
      const localePath = resolveLocalePath(options.langPath, locale, options.format);
      const translations = await handler.read(localePath);
      const translationEntries = Object.entries(translations);
      if (translationEntries.length === 0) continue;

      log(`  Pushing ${translationEntries.length} translations for locale '${locale}'...`);
      await client.importTranslations(resolvedHive, locale, {
        files: { [`${locale}.json`]: translations },
      });
    }

    log(`✓ Translations pushed for ${translationLocales.length} locale(s).`);
  }
}
