import { describe, it, expect, vi, afterEach } from 'vitest';
import { JsonNestedHandler } from '../json-nested.js';

vi.mock('node:fs/promises');

const fsMock = await import('node:fs/promises');

describe('JsonNestedHandler', () => {
  afterEach(() => vi.clearAllMocks());

  const handler = new JsonNestedHandler();

  describe('read()', () => {
    it('returns empty object when file does not exist', async () => {
      vi.mocked(fsMock.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      expect(await handler.read('/lang/en.json')).toEqual({});
    });

    it('flattens nested JSON to dot-notation keys', async () => {
      const nested = { auth: { login: 'Login', logout: 'Logout' }, common: { ok: 'OK' } };
      vi.mocked(fsMock.readFile).mockResolvedValue(JSON.stringify(nested) as never);
      expect(await handler.read('/lang/en.json')).toEqual({
        'auth.login': 'Login',
        'auth.logout': 'Logout',
        'common.ok': 'OK',
      });
    });

    it('handles deeply nested structures', async () => {
      const nested = { a: { b: { c: 'deep' } } };
      vi.mocked(fsMock.readFile).mockResolvedValue(JSON.stringify(nested) as never);
      expect(await handler.read('/lang/en.json')).toEqual({ 'a.b.c': 'deep' });
    });

    it('handles flat keys (no nesting) unchanged', async () => {
      const flat = { hello: 'Hello' };
      vi.mocked(fsMock.readFile).mockResolvedValue(JSON.stringify(flat) as never);
      expect(await handler.read('/lang/en.json')).toEqual({ hello: 'Hello' });
    });
  });

  describe('write()', () => {
    it('unflattens dot-notation keys to nested JSON', async () => {
      vi.mocked(fsMock.mkdir).mockResolvedValue(undefined as never);
      vi.mocked(fsMock.writeFile).mockResolvedValue(undefined as never);
      await handler.write('/lang/fr.json', { 'auth.login': 'Connexion', 'common.ok': 'OK' });
      const written = vi.mocked(fsMock.writeFile).mock.calls[0]![1] as string;
      expect(JSON.parse(written)).toEqual({
        auth: { login: 'Connexion' },
        common: { ok: 'OK' },
      });
    });

    it('writes with trailing newline', async () => {
      vi.mocked(fsMock.mkdir).mockResolvedValue(undefined as never);
      vi.mocked(fsMock.writeFile).mockResolvedValue(undefined as never);
      await handler.write('/lang/fr.json', { hello: 'Bonjour' });
      const written = vi.mocked(fsMock.writeFile).mock.calls[0]![1] as string;
      expect(written.endsWith('\n')).toBe(true);
    });
  });

  describe('round-trip', () => {
    it('flatten then unflatten produces identical structure', async () => {
      const original = {
        auth: { login: 'Login', logout: 'Logout' },
        nav: { home: 'Home', about: 'About' },
      };

      vi.mocked(fsMock.readFile).mockResolvedValue(JSON.stringify(original) as never);
      vi.mocked(fsMock.mkdir).mockResolvedValue(undefined as never);
      vi.mocked(fsMock.writeFile).mockResolvedValue(undefined as never);

      const flat = await handler.read('/lang/en.json');
      await handler.write('/lang/en.json', flat);

      const written = vi.mocked(fsMock.writeFile).mock.calls[0]![1] as string;
      expect(JSON.parse(written)).toEqual(original);
    });
  });
});
