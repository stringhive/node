import { describe, it, expect, vi, afterEach } from 'vitest';
import { JsonFlatHandler } from '../json-flat.js';

vi.mock('node:fs/promises');

const fsMock = await import('node:fs/promises');

describe('JsonFlatHandler', () => {
  afterEach(() => vi.clearAllMocks());

  const handler = new JsonFlatHandler();

  describe('read()', () => {
    it('returns empty object when file does not exist', async () => {
      vi.mocked(fsMock.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      expect(await handler.read('/lang/en.json')).toEqual({});
    });

    it('parses flat JSON file', async () => {
      vi.mocked(fsMock.readFile).mockResolvedValue(JSON.stringify({ hello: 'Hello', world: 'World' }) as never);
      expect(await handler.read('/lang/en.json')).toEqual({ hello: 'Hello', world: 'World' });
    });

    it('re-throws non-ENOENT errors', async () => {
      vi.mocked(fsMock.readFile).mockRejectedValue(new Error('Permission denied'));
      await expect(handler.read('/lang/en.json')).rejects.toThrow('Permission denied');
    });
  });

  describe('write()', () => {
    it('writes JSON with 2-space indent and trailing newline', async () => {
      vi.mocked(fsMock.mkdir).mockResolvedValue(undefined as never);
      vi.mocked(fsMock.writeFile).mockResolvedValue(undefined as never);
      await handler.write('/lang/en.json', { hello: 'Hello' });
      expect(vi.mocked(fsMock.writeFile)).toHaveBeenCalledWith(
        '/lang/en.json',
        '{\n  "hello": "Hello"\n}\n',
        'utf-8',
      );
    });

    it('creates parent directory', async () => {
      vi.mocked(fsMock.mkdir).mockResolvedValue(undefined as never);
      vi.mocked(fsMock.writeFile).mockResolvedValue(undefined as never);
      await handler.write('/lang/nested/en.json', {});
      expect(vi.mocked(fsMock.mkdir)).toHaveBeenCalledWith('/lang/nested', { recursive: true });
    });
  });
});
