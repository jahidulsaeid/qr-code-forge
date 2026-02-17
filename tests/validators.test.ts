import { describe, it, expect } from 'vitest';
import {
  validateURL,
  validateText,
  validateContact,
  validateOptions,
} from '../src/validators';
import { ValidationError } from '../src/types';

describe('validators', () => {
  describe('validateURL', () => {
    it('should accept valid https URL', () => {
      expect(() => validateURL('https://example.com')).not.toThrow();
    });

    it('should accept valid http URL', () => {
      expect(() => validateURL('http://example.com')).not.toThrow();
    });

    it('should reject empty string', () => {
      expect(() => validateURL('')).toThrow(ValidationError);
    });

    it('should reject ftp URLs', () => {
      expect(() => validateURL('ftp://example.com')).toThrow(ValidationError);
    });
  });

  describe('validateText', () => {
    it('should accept normal text', () => {
      expect(() => validateText('Hello')).not.toThrow();
    });

    it('should reject empty text', () => {
      expect(() => validateText('')).toThrow(ValidationError);
    });

    it('should reject overly long text', () => {
      expect(() => validateText('A'.repeat(5000))).toThrow(ValidationError);
    });
  });

  describe('validateContact', () => {
    it('should accept valid contact', () => {
      expect(() =>
        validateContact({ type: 'contact', name: 'John', phone: '+1' }),
      ).not.toThrow();
    });

    it('should reject missing name', () => {
      expect(() =>
        validateContact({ type: 'contact', name: '', phone: '+1' }),
      ).toThrow(ValidationError);
    });

    it('should reject missing phone', () => {
      expect(() =>
        validateContact({ type: 'contact', name: 'John', phone: '' }),
      ).toThrow(ValidationError);
    });

    it('should reject invalid email', () => {
      expect(() =>
        validateContact({ type: 'contact', name: 'John', phone: '+1', email: 'bad' }),
      ).toThrow(ValidationError);
    });
  });

  describe('validateOptions', () => {
    it('should accept minimal valid options', () => {
      expect(() =>
        validateOptions({ content: 'https://example.com' }),
      ).not.toThrow();
    });

    it('should reject invalid format', () => {
      expect(() =>
        validateOptions({ content: 'https://example.com', format: 'bmp' as any }),
      ).toThrow(ValidationError);
    });

    it('should reject size > 2048', () => {
      expect(() =>
        validateOptions({ content: 'https://example.com', size: 9999 }),
      ).toThrow(ValidationError);
    });

    it('should reject negative margin', () => {
      expect(() =>
        validateOptions({ content: 'https://example.com', margin: -5 }),
      ).toThrow(ValidationError);
    });

    it('should reject invalid error correction level', () => {
      expect(() =>
        validateOptions({
          content: 'https://example.com',
          errorCorrectionLevel: 'Z' as any,
        }),
      ).toThrow(ValidationError);
    });
  });
});
