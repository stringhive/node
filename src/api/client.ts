import {
  AuthenticationException,
  ForbiddenException,
  HiveNotFoundException,
  NetworkException,
  StringhiveError,
  StringLimitException,
  ValidationException,
} from './errors.js';
import type {
  ExportFormat,
  Hive,
  HiveStats,
  ImportPayload,
  Locale,
  PaginatedResponse,
  SourceString,
  SyncPayload,
  TranslationPayload,
} from './types.js';

export interface StringhiveClientConfig {
  token?: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://www.stringhive.com/api';

export class StringhiveClient {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config?: StringhiveClientConfig) {
    this.token = config?.token ?? process.env['STRINGHIVE_TOKEN'] ?? '';
    this.baseUrl = config?.baseUrl ?? process.env['STRINGHIVE_URL'] ?? DEFAULT_BASE_URL;

    if (!this.token) {
      throw new Error(
        'STRINGHIVE_TOKEN is required. Pass it via config or set the STRINGHIVE_TOKEN environment variable.',
      );
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new NetworkException(err);
    }

    if (response.ok) {
      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text().catch(() => null);
    }

    switch (response.status) {
      case 401:
        throw new AuthenticationException(responseBody);
      case 403:
        throw new ForbiddenException(responseBody);
      case 404:
        throw new HiveNotFoundException(path.split('/')[2] ?? path, responseBody);
      case 422: {
        const body422 = responseBody as Record<string, unknown>;
        if (body422 && typeof body422 === 'object' && 'errors' in body422) {
          throw new ValidationException(
            body422.errors as Record<string, string[]>,
            responseBody,
          );
        }
        throw new StringLimitException(responseBody);
      }
      default:
        throw new StringhiveError(
          `Request failed with status ${response.status}`,
          response.status,
          responseBody,
        );
    }
  }

  async locales(): Promise<Locale[]> {
    const response = await this.request<{ data: Locale[] }>('GET', '/locales');
    return response.data;
  }

  async hives(): Promise<Hive[]> {
    const response = await this.request<{ data: Hive[] }>('GET', '/hives');
    return response.data;
  }

  async hive(slug: string): Promise<HiveStats> {
    const response = await this.request<{ data: HiveStats }>('GET', `/hives/${slug}`);
    return response.data;
  }

  async strings(slug: string, page = 1): Promise<PaginatedResponse<SourceString>> {
    return this.request<PaginatedResponse<SourceString>>(
      'GET',
      `/hives/${slug}/strings?page=${page}`,
    );
  }

  async allStrings(slug: string): Promise<SourceString[]> {
    const first = await this.strings(slug, 1);
    const results = [...first.data];

    for (let page = 2; page <= first.meta.last_page; page++) {
      const next = await this.strings(slug, page);
      results.push(...next.data);
    }

    return results;
  }

  async importStrings(slug: string, payload: ImportPayload): Promise<void> {
    await this.request<void>('POST', `/hives/${slug}/strings/import`, payload);
  }

  async syncStrings(slug: string, payload: SyncPayload): Promise<void> {
    await this.request<void>('POST', `/hives/${slug}/strings/sync`, payload);
  }

  async importTranslations(slug: string, payload: TranslationPayload): Promise<void> {
    await this.request<void>('POST', `/hives/${slug}/translations/import`, payload);
  }

  async export(
    slug: string,
    locale: string,
    format: ExportFormat,
  ): Promise<Record<string, string>> {
    return this.request<Record<string, string>>(
      'GET',
      `/hives/${slug}/export?locale=${locale}&format=${format}`,
    );
  }
}
