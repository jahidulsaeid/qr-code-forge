import { describe, it, expect } from 'vitest';
import { formatText } from '../src/formatters/textFormatter';
import { ValidationError } from '../src/types';

describe('textFormatter', () => {
  it('should return plain text unchanged', () => {
    expect(formatText({ type: 'text', text: 'Hello World' })).toBe('Hello World');
  });

  it('should accept multi-line text', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    expect(formatText({ type: 'text', text })).toBe(text);
  });

  it('should accept unicode text', () => {
    const text = '你好世界 🌍';
    expect(formatText({ type: 'text', text })).toBe(text);
  });

  it('should throw ValidationError for empty string', () => {
    expect(() => formatText({ type: 'text', text: '' })).toThrow(ValidationError);
  });

  it('should throw ValidationError for text exceeding max length', () => {
    const longText = 'A'.repeat(5000);
    expect(() => formatText({ type: 'text', text: longText })).toThrow(ValidationError);
    expect(() => formatText({ type: 'text', text: longText })).toThrow(/too long/);
  });

  it('should accept text at the boundary of max length', () => {
    const text = 'A'.repeat(4296);
    expect(formatText({ type: 'text', text })).toBe(text);
  });
});
