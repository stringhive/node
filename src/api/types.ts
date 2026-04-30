export interface Locale {
  code: string;
  name: string;
  region?: string;
  rtl?: boolean;
  is_popular?: boolean;
}

export interface Hive {
  slug: string;
  name: string;
  source_locale: string;
  locales: string[];
  string_count: number;
}

export interface HiveStats {
  slug: string;
  name: string;
  source_locale: string;
  string_count: number;
  locales: Record<string, {
    translated: number;
    approved: number;
    warning: number;
    empty: number;
    translated_percent: number;
    approved_percent: number;
  }>;
}

export interface SourceString {
  key: string;
  value: string;
  is_plural: boolean;
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

export type StringFiles = Record<string, Record<string, string>>;

export interface ImportPayload {
  conflict_strategy?: 'keep' | 'clear';
  files: StringFiles;
}

export interface TranslationPayload {
  overwrite_strategy?: 'skip' | 'overwrite';
  files: StringFiles;
}

export interface ExportResponse {
  files: Record<string, string>;
}

export type ExportFormat = 'json';
