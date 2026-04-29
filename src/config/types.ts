import type { FormatName } from '../formats/types.js';

export interface StringhiveConfig {
  token?: string;
  url?: string;
  hive?: string;
  langPath?: string;
  sourceLocale?: string;
  format?: FormatName;
  push?: {
    conflictStrategy?: 'keep' | 'clear';
    withTranslations?: boolean;
  };
  pull?: {
    locale?: string | string[];
    includeSource?: boolean;
    dryRun?: boolean;
  };
}
