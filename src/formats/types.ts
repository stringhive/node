export type FormatName = 'json' | 'json_nested';

export interface FormatHandler {
  read(filePath: string): Promise<Record<string, string>>;
  write(filePath: string, strings: Record<string, string>): Promise<void>;
}
