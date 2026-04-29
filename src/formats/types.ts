export type FormatName = 'json';

export interface FormatHandler {
  read(filePath: string): Promise<Record<string, string>>;
  write(filePath: string, strings: Record<string, string>): Promise<void>;
}
