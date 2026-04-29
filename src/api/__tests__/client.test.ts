import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StringhiveClient } from '../client.js';
import {
  AuthenticationException,
  ForbiddenException,
  HiveNotFoundException,
  NetworkException,
  StringLimitException,
  ValidationException,
} from '../errors.js';

function mockFetch(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  });
}

describe('StringhiveClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, STRINGHIVE_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('throws when no token is provided', () => {
      delete process.env['STRINGHIVE_TOKEN'];
      expect(() => new StringhiveClient()).toThrow('STRINGHIVE_TOKEN is required');
    });

    it('reads token from env', () => {
      expect(() => new StringhiveClient()).not.toThrow();
    });

    it('accepts token via config', () => {
      delete process.env['STRINGHIVE_TOKEN'];
      expect(() => new StringhiveClient({ token: 'direct-token' })).not.toThrow();
    });
  });

  describe('locales()', () => {
    it('calls /locales and returns data array', async () => {
      const data = [{ code: 'en', name: 'English' }];
      global.fetch = mockFetch(200, { data });
      const client = new StringhiveClient();
      const result = await client.locales();
      expect(result).toEqual(data);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/locales'),
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('hives()', () => {
    it('returns data array', async () => {
      const data = [{ slug: 'my-app', name: 'My App', locale: 'en' }];
      global.fetch = mockFetch(200, { data });
      const client = new StringhiveClient();
      const result = await client.hives();
      expect(result).toEqual(data);
    });
  });

  describe('hive()', () => {
    it('calls /hives/:slug', async () => {
      const data = { slug: 'my-app', name: 'My App', locale: 'en', string_count: 10, translation_count: 5 };
      global.fetch = mockFetch(200, { data });
      const client = new StringhiveClient();
      const result = await client.hive('my-app');
      expect(result).toEqual(data);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/hives/my-app'),
        expect.anything(),
      );
    });
  });

  describe('allStrings()', () => {
    it('auto-paginates through all pages', async () => {
      const page1 = {
        data: [{ key: 'a', value: 'A' }],
        meta: { current_page: 1, last_page: 2, per_page: 1, total: 2 },
      };
      const page2 = {
        data: [{ key: 'b', value: 'B' }],
        meta: { current_page: 2, last_page: 2, per_page: 1, total: 2 },
      };
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });

      const client = new StringhiveClient();
      const result = await client.allStrings('my-app');
      expect(result).toEqual([{ key: 'a', value: 'A' }, { key: 'b', value: 'B' }]);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('returns all results from a single page without extra requests', async () => {
      const page1 = {
        data: [{ key: 'a', value: 'A' }],
        meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
      };
      global.fetch = mockFetch(200, page1);
      const client = new StringhiveClient();
      const result = await client.allStrings('my-app');
      expect(result).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('throws AuthenticationException on 401', async () => {
      global.fetch = mockFetch(401, { message: 'Unauthenticated.' }, false);
      const client = new StringhiveClient();
      await expect(client.locales()).rejects.toBeInstanceOf(AuthenticationException);
    });

    it('throws ForbiddenException on 403', async () => {
      global.fetch = mockFetch(403, { message: 'Forbidden.' }, false);
      const client = new StringhiveClient();
      await expect(client.locales()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws HiveNotFoundException on 404', async () => {
      global.fetch = mockFetch(404, { message: 'Not found.' }, false);
      const client = new StringhiveClient();
      await expect(client.hive('missing')).rejects.toBeInstanceOf(HiveNotFoundException);
    });

    it('throws ValidationException on 422 with errors key', async () => {
      const body = { errors: { key: ['The key field is required.'] } };
      global.fetch = mockFetch(422, body, false);
      const client = new StringhiveClient();
      await expect(client.importStrings('my-app', { strings: [] })).rejects.toBeInstanceOf(
        ValidationException,
      );
    });

    it('throws StringLimitException on 422 without errors key', async () => {
      const body = { message: 'String limit exceeded.' };
      global.fetch = mockFetch(422, body, false);
      const client = new StringhiveClient();
      await expect(client.importStrings('my-app', { strings: [] })).rejects.toBeInstanceOf(
        StringLimitException,
      );
    });

    it('throws NetworkException when fetch rejects', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
      const client = new StringhiveClient();
      await expect(client.locales()).rejects.toBeInstanceOf(NetworkException);
    });
  });

  describe('importStrings()', () => {
    it('sends POST with strings payload', async () => {
      global.fetch = mockFetch(204, undefined);
      const client = new StringhiveClient();
      const payload = { strings: [{ key: 'hello', value: 'Hello' }] };
      await client.importStrings('my-app', payload);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/hives/my-app/strings/import'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('syncStrings()', () => {
    it('sends POST to sync endpoint with conflict_strategy', async () => {
      global.fetch = mockFetch(204, undefined);
      const client = new StringhiveClient();
      await client.syncStrings('my-app', { strings: [], conflict_strategy: 'clear' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/hives/my-app/strings/sync'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('export()', () => {
    it('calls export endpoint with locale and format params', async () => {
      const translations = { 'auth.login': 'Se connecter' };
      global.fetch = mockFetch(200, translations);
      const client = new StringhiveClient();
      const result = await client.export('my-app', 'fr', 'json');
      expect(result).toEqual(translations);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('locale=fr'),
        expect.anything(),
      );
    });
  });
});
