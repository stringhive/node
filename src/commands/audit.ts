import { readFile, glob } from 'node:fs/promises';
import { StringhiveClient } from '../api/client.js';
import { getFormatHandler, resolveLocalePath } from '../formats/index.js';
import { loadStringhiveConfig } from '../config/loader.js';
import type { FormatName } from '../formats/types.js';

export interface AuditOptions {
  format?: 'text' | 'json';
  failOnOrphaned?: boolean;
  failOnMissing?: boolean;
  sourceLocale?: string;
  langPath?: string;
  fileFormat?: FormatName;
  scanSource?: string;
}

interface ScanReport {
  source_key_count: number;
  undefined: string[];
  unused: string[];
}

interface AuditReport {
  hive: string;
  local_key_count: number;
  api_key_count: number;
  unpushed: string[];
  orphaned: string[];
  scan?: ScanReport;
}

export async function auditCommand(hive: string | undefined, cliOptions: AuditOptions): Promise<void> {
  const fileConfig = await loadStringhiveConfig();

  const resolvedHive = hive ?? fileConfig.hive;
  if (!resolvedHive) {
    throw new Error('No hive specified. Pass it as an argument or set "hive" in stringhive.config.ts.');
  }

  const options = {
    format: cliOptions.format ?? 'text',
    failOnOrphaned: cliOptions.failOnOrphaned ?? false,
    failOnMissing: cliOptions.failOnMissing ?? false,
    sourceLocale: cliOptions.sourceLocale ?? fileConfig.sourceLocale ?? 'en',
    langPath: cliOptions.langPath ?? fileConfig.langPath ?? './lang',
    fileFormat: (cliOptions.fileFormat ?? fileConfig.format ?? 'json') as FormatName,
    scanSource: cliOptions.scanSource,
  };

  const client = new StringhiveClient({
    token: fileConfig.token,
    baseUrl: fileConfig.url,
  });

  const handler = getFormatHandler(options.fileFormat);
  const sourcePath = resolveLocalePath(options.langPath, options.sourceLocale, options.fileFormat);
  const localStrings = await handler.read(sourcePath);
  const localKeys = new Set(Object.keys(localStrings));

  if (localKeys.size === 0) {
    throw new Error(
      `No source strings found at ${sourcePath}. Check --lang-path and --source-locale.`,
    );
  }

  const apiStrings = await client.allStrings(resolvedHive);
  const apiKeys = new Set(apiStrings.map((s) => s.key));

  const unpushed = [...localKeys].filter((k) => !apiKeys.has(k)).sort();
  const orphaned = [...apiKeys].filter((k) => !localKeys.has(k)).sort();

  const report: AuditReport = {
    hive: resolvedHive,
    local_key_count: localKeys.size,
    api_key_count: apiKeys.size,
    unpushed,
    orphaned,
  };

  if (options.scanSource) {
    const sourceKeys = await extractSourceKeys(options.scanSource);
    report.scan = {
      source_key_count: sourceKeys.size,
      undefined: [...sourceKeys].filter((k) => !localKeys.has(k)).sort(),
      unused: [...localKeys].filter((k) => !sourceKeys.has(k)).sort(),
    };
  }

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    printTextReport(report);
  }

  const shouldFail =
    (options.failOnOrphaned && orphaned.length > 0) ||
    (options.failOnMissing && unpushed.length > 0);

  if (shouldFail) {
    process.exit(1);
  }
}

const SOURCE_KEY_REGEXES = [
  /\bt\(['"]([^'"]+)['"]\)/g,
  /\$t\(['"]([^'"]+)['"]\)/g,
  /\bi18n\.t\(['"]([^'"]+)['"]\)/g,
];

async function extractSourceKeys(pattern: string): Promise<Set<string>> {
  const keys = new Set<string>();

  for await (const file of glob(pattern)) {
    const content = await readFile(file, 'utf-8');
    for (const regex of SOURCE_KEY_REGEXES) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]!);
      }
    }
  }

  return keys;
}

function printSection(title: string, keys: string[], okMsg: string, detail: string): void {
  process.stdout.write('\n');
  if (keys.length === 0) {
    process.stdout.write(`✓ ${okMsg}\n`);
  } else {
    process.stdout.write(`✗ ${title} (${keys.length}) — ${detail}:\n`);
    for (const key of keys) {
      process.stdout.write(`    ${key}\n`);
    }
  }
}

function printTextReport(report: AuditReport): void {
  process.stdout.write(`Audit: ${report.hive}\n`);
  process.stdout.write(`  Local keys:      ${report.local_key_count}\n`);
  process.stdout.write(`  Stringhive keys: ${report.api_key_count}\n`);
  if (report.scan) {
    process.stdout.write(`  Source refs:     ${report.scan.source_key_count}\n`);
  }

  printSection(
    'Unpushed',
    report.unpushed,
    'No unpushed keys.',
    'local but not in Stringhive',
  );

  printSection(
    'Orphaned',
    report.orphaned,
    'No orphaned keys.',
    'in Stringhive but not in local file',
  );

  if (report.scan) {
    printSection(
      'Undefined',
      report.scan.undefined,
      'No undefined keys (all source references exist in local file).',
      'referenced in source but missing from local file',
    );

    printSection(
      'Unused',
      report.scan.unused,
      'No unused keys (all local keys are referenced in source).',
      'defined locally but not referenced in source',
    );
  }

  process.stdout.write('\n');
}
