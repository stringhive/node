import type { FormatName } from '../formats/types.js';

export interface StringhiveConfig {
  token?: string;
  url?: string;
  hive?: string;
  langPath?: string;
  sourceLocale?: string;
  format?: FormatName;
  exclude?: string[];
  include?: string[];
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
