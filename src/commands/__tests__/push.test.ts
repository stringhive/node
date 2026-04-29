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
      files: { 'en.json': { hello: 'Hello', world: 'World' } },
    });
    expect(mockClient.syncStrings).not.toHaveBeenCalled();
  });

  it('calls syncStrings with conflict_strategy when --sync is set', async () => {
    await pushCommand('my-app', { sync: true, conflictStrategy: 'clear', quiet: true });
    expect(mockClient.syncStrings).toHaveBeenCalledWith('my-app', {
      files: expect.any(Object),
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
    expect(mockClient.importTranslations).toHaveBeenCalledWith('my-app', 'fr', expect.any(Object));
    expect(mockClient.importTranslations).toHaveBeenCalledWith('my-app', 'de', expect.any(Object));
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

  it('skips push when source file matches exclude pattern', async () => {
    await pushCommand('my-app', { sourceLocale: 'en', exclude: ['en.json'], quiet: true });
    expect(mockClient.importStrings).not.toHaveBeenCalled();
    expect(mockClient.syncStrings).not.toHaveBeenCalled();
  });

  it('skips push when source file matches glob exclude pattern', async () => {
    await pushCommand('my-app', { sourceLocale: 'en', exclude: ['*.json'], quiet: true });
    expect(mockClient.importStrings).not.toHaveBeenCalled();
  });

  it('merges config exclude with cli exclude for push', async () => {
    vi.mocked(loadStringhiveConfig).mockResolvedValue({ exclude: ['en.json'] });
    await pushCommand('my-app', { sourceLocale: 'en', exclude: ['fr.json'], quiet: true });
    expect(mockClient.importStrings).not.toHaveBeenCalled();
  });

  it('skips excluded translation locales when --with-translations is set', async () => {
    vi.mocked(formats.discoverLocales).mockResolvedValue(['en', 'fr', 'de']);
    await pushCommand('my-app', {
      withTranslations: true,
      sourceLocale: 'en',
      exclude: ['fr.json'],
      quiet: true,
    });
    expect(mockClient.importTranslations).toHaveBeenCalledTimes(1);
    expect(mockClient.importTranslations).toHaveBeenCalledWith('my-app', 'de', expect.any(Object));
    expect(mockClient.importTranslations).not.toHaveBeenCalledWith('my-app', 'fr', expect.any(Object));
  });
});
