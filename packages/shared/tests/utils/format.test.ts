import { describe, it, expect } from 'vitest';
import { formatDownloads, parseModelId } from '../../src/utils/format';

describe('formatDownloads', () => {
  it('adds thousand separators', () => {
    expect(formatDownloads(1234)).toBe('1,234');
    expect(formatDownloads(1000000)).toBe('1,000,000');
  });

  it('handles small numbers', () => {
    expect(formatDownloads(0)).toBe('0');
    expect(formatDownloads(42)).toBe('42');
  });
});

describe('parseModelId', () => {
  it('parses standard HF model ID', () => {
    expect(parseModelId('clemsail/micro-kiki-v3')).toEqual({
      owner: 'clemsail',
      name: 'micro-kiki-v3',
    });
  });

  it('returns null for invalid formats', () => {
    expect(parseModelId('no-slash')).toBeNull();
    expect(parseModelId('a/b/c')).toBeNull();
    expect(parseModelId('/name')).toBeNull();
    expect(parseModelId('owner/')).toBeNull();
  });
});
