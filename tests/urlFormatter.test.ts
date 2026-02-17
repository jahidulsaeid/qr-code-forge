import { describe, it, expect } from 'vitest';
import { formatURL } from '../src/formatters/urlFormatter';
import { ValidationError } from '../src/types';

describe('urlFormatter', () => {
  it('should return a valid URL unchanged', () => {
    expect(formatURL({ type: 'url', url: 'https://example.com' })).toBe('https://example.com');
  });

  it('should accept http URLs', () => {
    expect(formatURL({ type: 'url', url: 'http://example.com' })).toBe('http://example.com');
  });

  it('should accept URLs with paths and query strings', () => {
    const url = 'https://example.com/path?q=hello&lang=en#section';
    expect(formatURL({ type: 'url', url })).toBe(url);
  });

  it('should throw ValidationError for empty string', () => {
    expect(() => formatURL({ type: 'url', url: '' })).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-http protocol', () => {
    expect(() => formatURL({ type: 'url', url: 'ftp://example.com' })).toThrow(ValidationError);
  });

  it('should throw ValidationError for garbage input', () => {
    expect(() => formatURL({ type: 'url', url: 'not a url at all' })).toThrow(ValidationError);
  });

  it('should set the field property on ValidationError', () => {
    try {
      formatURL({ type: 'url', url: '' });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe('url');
    }
  });
});
