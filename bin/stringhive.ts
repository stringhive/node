import { Command } from 'commander';
import { pushCommand } from '../src/commands/push.js';
import { pullCommand } from '../src/commands/pull.js';
import {
  StringhiveError,
  AuthenticationException,
  ForbiddenException,
  HiveNotFoundException,
  StringLimitException,
  ValidationException,
  NetworkException,
} from '../src/api/errors.js';

declare const __STRINGHIVE_VERSION__: string;

const program = new Command();

program
  .name('stringhive')
  .description('Stringhive CLI — push and pull translation strings')
  .version(__STRINGHIVE_VERSION__);

program
  .command('push [hive]')
  .description('Push source strings to Stringhive')
  .option('--sync', 'Use sync mode (update existing strings, apply conflict strategy)')
  .option('--conflict-strategy <strategy>', 'How to handle changed source strings: keep or clear')
  .option('--with-translations', 'Also push local translated files')
  .option('--source-locale <locale>', 'Source locale code')
  .option('--lang-path <path>', 'Path to language files directory')
  .option('--format <format>', 'File format (json)')
  .option('--exclude <patterns...>', 'Glob pattern(s) of files to skip (repeatable; merged with config exclude)')
  .option('--include <patterns...>', 'Glob pattern(s) of files to include exclusively (repeatable; merged with config include)')
  .option('--quiet', 'Suppress progress output')
  .action(async (hive: string | undefined, options) => {
    await pushCommand(hive, {
      sync: options.sync as boolean | undefined,
      conflictStrategy: options.conflictStrategy as 'keep' | 'clear' | undefined,
      withTranslations: options.withTranslations as boolean | undefined,
      sourceLocale: options.sourceLocale as string | undefined,
      langPath: options.langPath as string | undefined,
      format: options.format as 'json' | undefined,
      exclude: options.exclude as string[] | undefined,
      include: options.include as string[] | undefined,
      quiet: options.quiet as boolean | undefined,
    }).catch(handleError);
  });

program
  .command('pull [hive]')
  .description('Pull translations from Stringhive')
  .option('--locale <locales...>', 'Specific locales to pull (default: all available)')
  .option('--format <format>', 'File format (json)')
  .option('--dry-run', 'Preview what would be written without writing files')
  .option('--include-source', 'Include the source locale in the pull')
  .option('--source-locale <locale>', 'Source locale code (excluded from pull by default)')
  .option('--lang-path <path>', 'Path to language files directory')
  .option('--exclude <patterns...>', 'Glob pattern(s) of files to skip (repeatable; merged with config exclude)')
  .option('--include <patterns...>', 'Glob pattern(s) of files to include exclusively (repeatable; merged with config include)')
  .option('--quiet', 'Suppress progress output')
  .action(async (hive: string | undefined, options) => {
    await pullCommand(hive, {
      locale: options.locale as string[] | undefined,
      format: options.format as 'json' | undefined,
      dryRun: options.dryRun as boolean | undefined,
      includeSource: options.includeSource as boolean | undefined,
      sourceLocale: options.sourceLocale as string | undefined,
      langPath: options.langPath as string | undefined,
      exclude: options.exclude as string[] | undefined,
      include: options.include as string[] | undefined,
      quiet: options.quiet as boolean | undefined,
    }).catch(handleError);
  });

program
  .command('hives')
  .description('List all hives accessible with your token')
  .action(async () => {
    const { StringhiveClient } = await import('../src/api/client.js');
    const client = new StringhiveClient();
    const hives = await client.hives().catch(handleError);
    for (const hive of hives) {
      process.stdout.write(`${hive.slug}  ${hive.name}  [${hive.source_locale}]\n`);
    }
  });

program
  .command('locales <hive>')
  .description('List available locales for a hive')
  .action(async (hive: string) => {
    const { StringhiveClient } = await import('../src/api/client.js');
    const client = new StringhiveClient();
    const locales = await client.locales().catch(handleError);
    const stats = await client.hive(hive).catch(handleError);
    process.stdout.write(`Hive: ${stats.name} (${stats.string_count} strings)\n\n`);
    for (const locale of locales) {
      process.stdout.write(`${locale.code}  ${locale.name}\n`);
    }
  });

function handleError(err: unknown): never {
  const debug = process.env['STRINGHIVE_DEBUG'] === '1';

  if (err instanceof AuthenticationException) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.stderr.write('Set the STRINGHIVE_TOKEN environment variable and try again.\n');
  } else if (err instanceof ForbiddenException) {
    process.stderr.write(`Error: ${err.message}\n`);
  } else if (err instanceof HiveNotFoundException) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.stderr.write('Run `stringhive hives` to see available hives.\n');
  } else if (err instanceof ValidationException) {
    process.stderr.write('Validation error:\n');
    for (const [field, messages] of Object.entries(err.errors)) {
      process.stderr.write(`  ${field}: ${messages.join(', ')}\n`);
    }
  } else if (err instanceof StringLimitException) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.stderr.write('Visit stringhive.com to upgrade your plan.\n');
  } else if (err instanceof NetworkException) {
    process.stderr.write(`Network error: ${err.message}\n`);
  } else if (err instanceof StringhiveError) {
    process.stderr.write(`Error (${err.statusCode}): ${err.message}\n`);
  } else if (err instanceof Error) {
    process.stderr.write(`Error: ${err.message}\n`);
  } else {
    process.stderr.write(`Unexpected error: ${String(err)}\n`);
  }

  if (debug && err instanceof Error && err.stack) {
    process.stderr.write(`\n${err.stack}\n`);
  }

  process.exit(1);
}

program.parseAsync(process.argv);
