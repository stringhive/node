import { StringhiveClient } from '../api/client.js';
import { getFormatHandler, discoverLocales, resolveLocalePath } from '../formats/index.js';
import { loadStringhiveConfig } from '../config/loader.js';
import type { FormatName } from '../formats/types.js';

export interface PushOptions {
  sync?: boolean;
  conflictStrategy?: 'keep' | 'clear';
  withTranslations?: boolean;
  sourceLocale?: string;
  langPath?: string;
  format?: FormatName;
  quiet?: boolean;
}

export async function pushCommand(hive: string, cliOptions: PushOptions): Promise<void> {
  const fileConfig = await loadStringhiveConfig();

  const options: Required<PushOptions> = {
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

  const sourcePath = resolveLocalePath(options.langPath, options.sourceLocale, options.format);
  const sourceStrings = await handler.read(sourcePath);
  const entries = Object.entries(sourceStrings);

  if (entries.length === 0) {
    throw new Error(
      `No source strings found at ${sourcePath}. Check --lang-path and --source-locale.`,
    );
  }

  const stringPayload = entries.map(([key, value]) => ({ key, value }));

  if (options.sync) {
    log(`Syncing ${entries.length} strings to hive '${hive}' (conflict strategy: ${options.conflictStrategy})...`);
    await client.syncStrings(hive, {
      strings: stringPayload,
      conflict_strategy: options.conflictStrategy,
    });
  } else {
    log(`Pushing ${entries.length} strings to hive '${hive}'...`);
    await client.importStrings(hive, { strings: stringPayload });
  }

  log(`✓ Source strings pushed.`);

  if (options.withTranslations) {
    const allLocales = await discoverLocales(options.langPath);
    const translationLocales = allLocales.filter((l) => l !== options.sourceLocale);

    for (const locale of translationLocales) {
      const localePath = resolveLocalePath(options.langPath, locale, options.format);
      const translations = await handler.read(localePath);
      const translationEntries = Object.entries(translations);
      if (translationEntries.length === 0) continue;

      log(`  Pushing ${translationEntries.length} translations for locale '${locale}'...`);
      await client.importTranslations(hive, {
        locale,
        strings: translationEntries.map(([key, value]) => ({ key, value })),
      });
    }

    log(`✓ Translations pushed for ${translationLocales.length} locale(s).`);
  }
}
