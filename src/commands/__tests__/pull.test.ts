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
  export: vi.fn().mockResolvedValue({
    files: {
      'fr.json': '{"hello":"Bonjour"}',
      'de.json': '{"hello":"Hallo"}',
      'en.json': '{"hello":"Hello"}',
    },
  }),
};

describe('pullCommand', () => {
  beforeEach(() => {
    vi.mocked(StringhiveClient).mockImplementation(() => mockClient as never);
    vi.mocked(loadStringhiveConfig).mockResolvedValue({});
    vi.mocked(formats.getFormatHandler).mockReturnValue({
      read: vi.fn(),
      write: mockWrite,
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => vi.clearAllMocks());

  it('calls export once without a locale', async () => {
    await pullCommand('my-app', { quiet: true });
    expect(mockClient.export).toHaveBeenCalledOnce();
    expect(mockClient.export).toHaveBeenCalledWith('my-app', 'json');
  });

  it('excludes source locale by default', async () => {
    await pullCommand('my-app', { sourceLocale: 'en', quiet: true });
    expect(mockWrite).not.toHaveBeenCalledWith(expect.stringContaining('en.json'), expect.anything());
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('fr.json'), expect.anything());
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('de.json'), expect.anything());
  });

  it('includes source locale when --include-source is set', async () => {
    await pullCommand('my-app', { includeSource: true, sourceLocale: 'en', quiet: true });
    expect(mockWrite).toHaveBeenCalledTimes(3);
  });

  it('filters to requested locales when --locale is set', async () => {
    await pullCommand('my-app', { locale: ['fr'], quiet: true });
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('fr.json'), { hello: 'Bonjour' });
  });

  it('writes files to langPath + filename from response', async () => {
    await pullCommand('my-app', { locale: ['fr'], langPath: '/lang', quiet: true });
    expect(mockWrite).toHaveBeenCalledWith('/lang/fr.json', { hello: 'Bonjour' });
  });

  it('does not write files during --dry-run', async () => {
    await pullCommand('my-app', { dryRun: true, quiet: true });
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('logs nothing when --quiet', async () => {
    await pullCommand('my-app', { locale: ['fr'], quiet: true });
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it('skips files matching exclude pattern during pull', async () => {
    await pullCommand('my-app', { sourceLocale: 'en', exclude: ['fr.json'], quiet: true });
    expect(mockWrite).not.toHaveBeenCalledWith(expect.stringContaining('fr.json'), expect.anything());
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('de.json'), expect.anything());
  });

  it('skips files matching glob exclude pattern during pull', async () => {
    await pullCommand('my-app', { sourceLocale: 'en', exclude: ['*.json'], quiet: true });
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('merges config exclude with cli exclude for pull', async () => {
    vi.mocked(loadStringhiveConfig).mockResolvedValue({ exclude: ['fr.json'] });
    await pullCommand('my-app', { sourceLocale: 'en', exclude: ['de.json'], quiet: true });
    expect(mockWrite).not.toHaveBeenCalledWith(expect.stringContaining('fr.json'), expect.anything());
    expect(mockWrite).not.toHaveBeenCalledWith(expect.stringContaining('de.json'), expect.anything());
  });

  it('skips files by basename when path contains locale prefix', async () => {
    mockClient.export.mockResolvedValue({
      files: {
        'es/app.json': '{"hello":"Hola"}',
        'es/auth.json': '{"login":"Iniciar"}',
        'fr/app.json': '{"hello":"Bonjour"}',
      },
    });
    await pullCommand('my-app', { exclude: ['auth.json'], quiet: true });
    expect(mockWrite).not.toHaveBeenCalledWith(expect.stringContaining('auth.json'), expect.anything());
    expect(mockWrite).toHaveBeenCalledTimes(2);
  });
});
