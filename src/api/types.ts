export interface Locale {
  code: string;
  name: string;
}

export interface Hive {
  slug: string;
  name: string;
  locale: string;
}

export interface HiveStats extends Hive {
  string_count: number;
  translation_count: number;
}

export interface SourceString {
  key: string;
  value: string;
  description?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ImportPayload {
  strings: Array<{
    key: string;
    value: string;
    description?: string;
  }>;
}

export interface SyncPayload extends ImportPayload {
  conflict_strategy: 'keep' | 'clear';
}

export interface TranslationPayload {
  locale: string;
  strings: Array<{
    key: string;
    value: string;
  }>;
}

export type ExportFormat = 'json' | 'json_nested';
