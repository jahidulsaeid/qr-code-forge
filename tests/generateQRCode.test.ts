import { describe, it, expect } from 'vitest';
import { generateQRCode } from '../src/generateQRCode';
import { ValidationError } from '../src/types';

describe('generateQRCode', () => {
  // ── URL QR codes ───────────────────────────────────────────────────────

  describe('URL content', () => {
    it('should generate a PNG buffer by default', async () => {
      const result = await generateQRCode({ content: 'https://example.com' });
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect(result.format).toBe('png');
      expect(result.mimeType).toBe('image/png');
      expect(result.encodedContent).toBe('https://example.com');
    });

    it('should treat a plain string as a URL', async () => {
      const result = await generateQRCode({ content: 'https://github.com' });
      expect(result.encodedContent).toBe('https://github.com');
    });

    it('should accept typed URL content', async () => {
      const result = await generateQRCode({
        content: { type: 'url', url: 'https://example.com' },
      });
      expect(result.encodedContent).toBe('https://example.com');
    });

    it('should throw for invalid URL', async () => {
      await expect(
        generateQRCode({ content: 'not a url' }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── Text QR codes ─────────────────────────────────────────────────────

  describe('text content', () => {
    it('should generate a QR for plain text', async () => {
      const result = await generateQRCode({
        content: { type: 'text', text: 'Hello, QR World!' },
      });
      expect(result.encodedContent).toBe('Hello, QR World!');
    });

    it('should handle long text up to the limit', async () => {
      const longText = 'X'.repeat(2000);
      const result = await generateQRCode({
        content: { type: 'text', text: longText },
      });
      expect(result.encodedContent).toBe(longText);
    });
  });

  // ── Contact QR codes ──────────────────────────────────────────────────

  describe('contact content', () => {
    it('should generate a vCard QR', async () => {
      const result = await generateQRCode({
        content: {
          type: 'contact',
          name: 'Jane Smith',
          phone: '+1555123456',
          email: 'jane@example.com',
          organization: 'Acme Corp',
          title: 'CTO',
          website: 'https://acme.com',
        },
      });
      expect(result.encodedContent).toContain('BEGIN:VCARD');
      expect(result.encodedContent).toContain('FN:Jane Smith');
      expect(result.encodedContent).toContain('TEL:+1555123456');
      expect(result.encodedContent).toContain('EMAIL:jane@example.com');
      expect(result.encodedContent).toContain('ORG:Acme Corp');
      expect(result.encodedContent).toContain('END:VCARD');
    });

    it('should throw for missing required contact fields', async () => {
      await expect(
        generateQRCode({
          content: { type: 'contact', name: '', phone: '+1' },
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── Output formats ────────────────────────────────────────────────────

  describe('output formats', () => {
    it('should generate SVG output', async () => {
      const result = await generateQRCode({
        content: 'https://example.com',
        format: 'svg',
      });
      expect(typeof result.data).toBe('string');
      expect(result.mimeType).toBe('image/svg+xml');
      expect(result.format).toBe('svg');
      expect((result.data as string)).toContain('<svg');
      expect((result.data as string)).toContain('</svg>');
    });

    it('should generate DataURL output', async () => {
      const result = await generateQRCode({
        content: 'https://example.com',
        format: 'dataurl',
      });
      expect(typeof result.data).toBe('string');
      expect((result.data as string).startsWith('data:image/png;base64,')).toBe(true);
      expect(result.format).toBe('dataurl');
    });

    it('should generate PNG output explicitly', async () => {
      const result = await generateQRCode({
        content: 'https://example.com',
        format: 'png',
      });
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect(result.format).toBe('png');
    });
  });

  // ── Customisation ─────────────────────────────────────────────────────

  describe('customisation', () => {
    it('should accept custom size', async () => {
      const result = await generateQRCode({
        content: 'https://example.com',
        size: 512,
      });
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });

    it('should accept custom margin', async () => {
      const result = await generateQRCode({
        content: 'https://example.com',
        margin: 2,
      });
      expect(result.data).toBeTruthy();
    });

    it('should accept custom colours', async () => {
      const result = await generateQRCode({
        content: 'https://example.com',
        darkColor: '#ff0000',
        lightColor: '#00ff00',
      });
      expect(result.data).toBeTruthy();
    });

    it('should accept custom error correction level', async () => {
      const result = await generateQRCode({
        content: 'https://example.com',
        errorCorrectionLevel: 'H',
      });
      expect(result.data).toBeTruthy();
    });

    it('should accept large size up to 2048', async () => {
      const result = await generateQRCode({
        content: 'https://example.com',
        size: 2048,
      });
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });
  });

  // ── Validation ────────────────────────────────────────────────────────

  describe('validation', () => {
    it('should throw for invalid format', async () => {
      await expect(
        generateQRCode({ content: 'https://example.com', format: 'gif' as any }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw for size > 2048', async () => {
      await expect(
        generateQRCode({ content: 'https://example.com', size: 3000 }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw for size < 1', async () => {
      await expect(
        generateQRCode({ content: 'https://example.com', size: 0 }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw for negative margin', async () => {
      await expect(
        generateQRCode({ content: 'https://example.com', margin: -1 }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw for invalid error correction level', async () => {
      await expect(
        generateQRCode({
          content: 'https://example.com',
          errorCorrectionLevel: 'X' as any,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw for invalid content object', async () => {
      await expect(
        generateQRCode({ content: 42 as any }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
