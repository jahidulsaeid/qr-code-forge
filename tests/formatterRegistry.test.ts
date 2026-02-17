import { describe, it, expect } from 'vitest';
import {
  registerFormatter,
  hasFormatter,
  formatContent,
} from '../src/formatters/index';
import { ValidationError } from '../src/types';

describe('formatter registry', () => {
  it('should have url, text, and contact formatters registered', () => {
    expect(hasFormatter('url')).toBe(true);
    expect(hasFormatter('text')).toBe(true);
    expect(hasFormatter('contact')).toBe(true);
  });

  it('should return false for unregistered types', () => {
    expect(hasFormatter('email')).toBe(false);
    expect(hasFormatter('wifi')).toBe(false);
  });

  it('should format url content', () => {
    const result = formatContent({ type: 'url', url: 'https://example.com' });
    expect(result).toBe('https://example.com');
  });

  it('should format text content', () => {
    const result = formatContent({ type: 'text', text: 'hello' });
    expect(result).toBe('hello');
  });

  it('should throw for unknown content type', () => {
    expect(() =>
      formatContent({ type: 'wifi' } as any),
    ).toThrow(ValidationError);
    expect(() =>
      formatContent({ type: 'wifi' } as any),
    ).toThrow(/Unknown content type/);
  });

  it('should allow registering a custom formatter', () => {
    registerFormatter('email', (content: any) => {
      return `mailto:${content.to}?subject=${encodeURIComponent(content.subject ?? '')}`;
    });

    expect(hasFormatter('email')).toBe(true);

    const result = formatContent({
      type: 'email',
      to: 'test@example.com',
      subject: 'Hello World',
    } as any);

    expect(result).toBe('mailto:test@example.com?subject=Hello%20World');
  });
});
