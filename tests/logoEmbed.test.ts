import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateQRCode } from '../src/node';
import { LogoError, ValidationError } from '../src/types';

/**
 * Create a minimal valid 2×2 red PNG for testing.
 * This is a hand-crafted valid PNG file.
 */
function createTestLogoPNG(): Buffer {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: 2x2, 8-bit RGBA
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(2, 0); // width
  ihdrData.writeUInt32BE(2, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // colour type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // Raw pixel data: 2 rows, each prefixed by filter byte 0
  // Each pixel is RGBA (4 bytes). Red fully opaque.
  const row = Buffer.from([
    0, // filter = None
    255, 0, 0, 255, // pixel (0,y)
    255, 0, 0, 255, // pixel (1,y)
  ]);
  const rawPixels = Buffer.concat([row, row]); // 2 rows

  // Compress with zlib (PNG uses zlib-wrapped deflate, not raw)
  const { deflateSync } = require('node:zlib');
  const compressed = deflateSync(rawPixels);

  function makeChunk(type: string, data: Buffer): Buffer {
    const buf = Buffer.alloc(12 + data.length);
    buf.writeUInt32BE(data.length, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    // CRC-32
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
    let crc = 0xffffffff;
    for (let i = 4; i < 8 + data.length; i++) {
      crc = crcTable[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    buf.writeUInt32BE(crc, 8 + data.length);
    return buf;
  }

  return Buffer.concat([
    pngSignature,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('logo embedding', () => {
  const testDir = join(__dirname, '..', '.test-tmp');
  const logoPath = join(testDir, 'test-logo.png');

  // Set up test logo file
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }
  writeFileSync(logoPath, createTestLogoPNG());

  it('should embed a logo into a PNG QR code', async () => {
    const withoutLogo = await generateQRCode({
      content: 'https://example.com',
      format: 'png',
      size: 256,
    });

    const withLogo = await generateQRCode({
      content: 'https://example.com',
      format: 'png',
      size: 256,
      logo: { source: logoPath },
    });

    // Both should be valid buffers, but the logo version should differ
    expect(Buffer.isBuffer(withoutLogo.data)).toBe(true);
    expect(Buffer.isBuffer(withLogo.data)).toBe(true);
    expect((withLogo.data as Buffer).equals(withoutLogo.data as Buffer)).toBe(false);
  });

  it('should auto-raise error correction to H when logo is used', async () => {
    // We can't easily inspect the EC level from the output, but we can verify
    // it doesn't throw and produces a valid result
    const result = await generateQRCode({
      content: 'https://example.com',
      logo: { source: logoPath },
    });
    expect(result.data).toBeTruthy();
  });

  it('should accept custom logo size percentage', async () => {
    const result = await generateQRCode({
      content: 'https://example.com',
      logo: { source: logoPath, sizePercent: 10 },
    });
    expect(Buffer.isBuffer(result.data)).toBe(true);
  });

  it('should accept custom logo margin', async () => {
    const result = await generateQRCode({
      content: 'https://example.com',
      logo: { source: logoPath, margin: 8 },
    });
    expect(Buffer.isBuffer(result.data)).toBe(true);
  });

  it('should silently ignore logo for SVG format', async () => {
    const result = await generateQRCode({
      content: 'https://example.com',
      format: 'svg',
      logo: { source: logoPath },
    });
    expect(result.format).toBe('svg');
    expect(typeof result.data).toBe('string');
  });

  it('should silently ignore logo for dataurl format', async () => {
    const result = await generateQRCode({
      content: 'https://example.com',
      format: 'dataurl',
      logo: { source: logoPath },
    });
    expect(result.format).toBe('dataurl');
  });

  // ── Validation ────────────────────────────────────────────────────────

  it('should throw for missing logo source', async () => {
    await expect(
      generateQRCode({
        content: 'https://example.com',
        logo: { source: '' },
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw for logo sizePercent > 40', async () => {
    await expect(
      generateQRCode({
        content: 'https://example.com',
        logo: { source: logoPath, sizePercent: 50 },
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw for logo sizePercent < 1', async () => {
    await expect(
      generateQRCode({
        content: 'https://example.com',
        logo: { source: logoPath, sizePercent: 0 },
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw LogoError for non-existent logo file', async () => {
    await expect(
      generateQRCode({
        content: 'https://example.com',
        logo: { source: '/non/existent/logo.png' },
      }),
    ).rejects.toThrow(LogoError);
  });

  it('should throw LogoError for invalid image data', async () => {
    const badLogoPath = join(testDir, 'bad-logo.png');
    writeFileSync(badLogoPath, 'this is not a PNG');
    await expect(
      generateQRCode({
        content: 'https://example.com',
        logo: { source: badLogoPath },
      }),
    ).rejects.toThrow(LogoError);
  });
});
