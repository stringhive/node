import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pullCommand } from '../pull.js';

vi.mock('../../api/client.js');
vi.mock('../../config/loader.js');
vi.mock('../../formats/index.js');

const { StringhiveClient } = await import('../../api/client.js');
const { loadStringhiveConfig } = await import('../../config/loader.js');
const formats = await import('../../formats/index.js');

const mockWrite = vi.fn().mockResolvedValue(undefined);
const mockClient = {
  locales: vi.fn().mockResolvedValue([
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
  ]),
  export: vi.fn().mockResolvedValue({ hello: 'Bonjour' }),
};

describe('pullCommand', () => {
  beforeEach(() => {
    vi.mocked(StringhiveClient).mockImplementation(() => mockClient as never);
    vi.mocked(loadStringhiveConfig).mockResolvedValue({});
    vi.mocked(formats.getFormatHandler).mockReturnValue({
      read: vi.fn(),
      write: mockWrite,
    });
    vi.mocked(formats.resolveLocalePath).mockImplementation((_base, locale) => `/lang/${locale}.json`);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => vi.clearAllMocks());

  it('fetches all available locales when none specified', async () => {
    await pullCommand('my-app', { quiet: true });
    expect(mockClient.locales).toHaveBeenCalled();
    expect(mockClient.export).toHaveBeenCalledTimes(2);
    expect(mockClient.export).toHaveBeenCalledWith('my-app', 'fr', 'json');
    expect(mockClient.export).toHaveBeenCalledWith('my-app', 'de', 'json');
  });

  it('excludes source locale by default', async () => {
    mockClient.locales.mockResolvedValue([
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'French' },
    ]);
    await pullCommand('my-app', { sourceLocale: 'en', quiet: true });
    expect(mockClient.export).toHaveBeenCalledTimes(1);
    expect(mockClient.export).toHaveBeenCalledWith('my-app', 'fr', 'json');
  });

  it('includes source locale when --include-source is set', async () => {
    mockClient.locales.mockResolvedValue([
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'French' },
    ]);
    await pullCommand('my-app', { includeSource: true, sourceLocale: 'en', quiet: true });
    expect(mockClient.export).toHaveBeenCalledTimes(2);
  });

  it('only pulls specified locales when --locale is set', async () => {
    await pullCommand('my-app', { locale: ['fr'], quiet: true });
    expect(mockClient.locales).not.toHaveBeenCalled();
    expect(mockClient.export).toHaveBeenCalledTimes(1);
    expect(mockClient.export).toHaveBeenCalledWith('my-app', 'fr', 'json');
  });

  it('writes each locale file to the resolved path', async () => {
    await pullCommand('my-app', { locale: ['fr'], quiet: true });
    expect(mockWrite).toHaveBeenCalledWith('/lang/fr.json', { hello: 'Bonjour' });
  });

  it('does not write files during --dry-run', async () => {
    await pullCommand('my-app', { dryRun: true, quiet: true });
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockClient.export).not.toHaveBeenCalled();
  });

  it('logs nothing when --quiet', async () => {
    await pullCommand('my-app', { locale: ['fr'], quiet: true });
    expect(process.stdout.write).not.toHaveBeenCalled();
  });
});
