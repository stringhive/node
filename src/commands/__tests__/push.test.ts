import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pushCommand } from '../push.js';

vi.mock('../../api/client.js');
vi.mock('../../config/loader.js');
vi.mock('../../formats/index.js');

const { StringhiveClient } = await import('../../api/client.js');
const { loadStringhiveConfig } = await import('../../config/loader.js');
const formats = await import('../../formats/index.js');

const mockClient = {
  importStrings: vi.fn().mockResolvedValue(undefined),
  syncStrings: vi.fn().mockResolvedValue(undefined),
  importTranslations: vi.fn().mockResolvedValue(undefined),
};

describe('pushCommand', () => {
  beforeEach(() => {
    vi.mocked(StringhiveClient).mockImplementation(() => mockClient as never);
    vi.mocked(loadStringhiveConfig).mockResolvedValue({});
    vi.mocked(formats.getFormatHandler).mockReturnValue({
      read: vi.fn().mockResolvedValue({ hello: 'Hello', world: 'World' }),
      write: vi.fn(),
    });
    vi.mocked(formats.resolveLocalePath).mockReturnValue('/lang/en.json');
    vi.mocked(formats.discoverLocales).mockResolvedValue([]);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => vi.clearAllMocks());

  it('calls importStrings when --sync is not set', async () => {
    await pushCommand('my-app', { quiet: true });
    expect(mockClient.importStrings).toHaveBeenCalledWith('my-app', {
      strings: [{ key: 'hello', value: 'Hello' }, { key: 'world', value: 'World' }],
    });
    expect(mockClient.syncStrings).not.toHaveBeenCalled();
  });

  it('calls syncStrings with conflict_strategy when --sync is set', async () => {
    await pushCommand('my-app', { sync: true, conflictStrategy: 'clear', quiet: true });
    expect(mockClient.syncStrings).toHaveBeenCalledWith('my-app', {
      strings: expect.any(Array),
      conflict_strategy: 'clear',
    });
    expect(mockClient.importStrings).not.toHaveBeenCalled();
  });

  it('uses conflict strategy from config file when not passed via CLI', async () => {
    vi.mocked(loadStringhiveConfig).mockResolvedValue({ push: { conflictStrategy: 'clear' } });
    await pushCommand('my-app', { sync: true, quiet: true });
    expect(mockClient.syncStrings).toHaveBeenCalledWith(
      'my-app',
      expect.objectContaining({ conflict_strategy: 'clear' }),
    );
  });

  it('pushes translations for each non-source locale when --with-translations is set', async () => {
    vi.mocked(formats.discoverLocales).mockResolvedValue(['en', 'fr', 'de']);
    vi.mocked(formats.getFormatHandler).mockReturnValue({
      read: vi.fn().mockResolvedValue({ hello: 'Hallo' }),
      write: vi.fn(),
    });
    await pushCommand('my-app', { withTranslations: true, sourceLocale: 'en', quiet: true });
    expect(mockClient.importTranslations).toHaveBeenCalledTimes(2);
    expect(mockClient.importTranslations).toHaveBeenCalledWith('my-app', expect.objectContaining({ locale: 'fr' }));
    expect(mockClient.importTranslations).toHaveBeenCalledWith('my-app', expect.objectContaining({ locale: 'de' }));
  });

  it('skips translation locales with no strings', async () => {
    vi.mocked(formats.discoverLocales).mockResolvedValue(['en', 'fr']);
    vi.mocked(formats.getFormatHandler).mockReturnValue({
      read: vi.fn()
        .mockResolvedValueOnce({ hello: 'Hello' })
        .mockResolvedValueOnce({}),
      write: vi.fn(),
    });
    await pushCommand('my-app', { withTranslations: true, sourceLocale: 'en', quiet: true });
    expect(mockClient.importTranslations).not.toHaveBeenCalled();
  });

  it('throws when source locale file is empty', async () => {
    vi.mocked(formats.getFormatHandler).mockReturnValue({
      read: vi.fn().mockResolvedValue({}),
      write: vi.fn(),
    });
    await expect(pushCommand('my-app', { quiet: true })).rejects.toThrow('No source strings found');
  });
});
