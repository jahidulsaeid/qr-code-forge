/**
 * Logo embedding — composites a logo image on top of a QR PNG buffer.
 *
 * This is a **pure-Node** implementation that manipulates raw PNG data
 * without any native dependencies (no canvas, no sharp).  It keeps the
 * package install fast and cross-platform.
 *
 * Approach:
 * 1. Decode the QR PNG (using the built-in zlib + manual PNG parser).
 * 2. Decode the logo image (PNG only for simplicity).
 * 3. Composite the logo in the centre of the QR image.
 * 4. Re-encode to PNG.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDeflate, createInflate } from 'node:zlib';
import { LogoError } from '../types.js';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface EmbedLogoParams {
  /** QR code as a PNG buffer. */
  qrBuffer: Buffer;
  /** Logo file path or HTTP(S) URL. */
  source: string;
  /** Logo size as a percentage of the QR width (1-40). */
  sizePercent: number;
  /** Padding pixels around the logo. */
  margin: number;
}

/**
 * Embed a logo in the centre of a QR-code PNG.
 * Returns a new PNG buffer.
 */
export async function embedLogo(params: EmbedLogoParams): Promise<Buffer> {
  const { qrBuffer, source, sizePercent, margin } = params;

  // 1. Load the logo bytes
  const logoBytes = await loadImage(source);

  // 2. Decode both images
  let qrImage: RawImage;
  let logoImage: RawImage;

  try {
    qrImage = await decodePNG(qrBuffer);
  } catch {
    throw new LogoError('Failed to decode QR PNG image.');
  }

  try {
    logoImage = await decodePNG(logoBytes);
  } catch {
    throw new LogoError(
      'Failed to decode logo image. Only PNG format is supported for logo embedding.',
    );
  }

  // 3. Compute target logo size
  const targetWidth = Math.round((qrImage.width * sizePercent) / 100);
  const targetHeight = Math.round(
    (targetWidth / logoImage.width) * logoImage.height,
  );

  // 4. Scale logo
  const scaledLogo = scaleImage(logoImage, targetWidth, targetHeight);

  // 5. Composite with white margin background
  const totalWidth = targetWidth + margin * 2;
  const totalHeight = targetHeight + margin * 2;
  const offsetX = Math.round((qrImage.width - totalWidth) / 2);
  const offsetY = Math.round((qrImage.height - totalHeight) / 2);

  // Draw white background for the logo area
  fillRect(qrImage, offsetX, offsetY, totalWidth, totalHeight, 255, 255, 255, 255);

  // Draw the scaled logo
  compositeOver(qrImage, scaledLogo, offsetX + margin, offsetY + margin);

  // 6. Encode back to PNG
  return encodePNG(qrImage);
}

// ─── Image loading ───────────────────────────────────────────────────────────

async function loadImage(source: string): Promise<Buffer> {
  // HTTP(S) URL
  if (/^https?:\/\//i.test(source)) {
    try {
      const res = await fetch(source);
      if (!res.ok) {
        throw new LogoError(`Failed to fetch logo from URL: ${res.status} ${res.statusText}`);
      }
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    } catch (err) {
      if (err instanceof LogoError) throw err;
      throw new LogoError(`Failed to fetch logo from URL "${source}": ${(err as Error).message}`);
    }
  }

  // Local path
  const abs = resolve(source);
  if (!existsSync(abs)) {
    throw new LogoError(`Logo file not found: "${abs}".`);
  }
  return readFile(abs);
}

// ─── Minimal PNG codec ───────────────────────────────────────────────────────

interface RawImage {
  width: number;
  height: number;
  /** RGBA pixel data, row-major. */
  data: Uint8Array;
}

/** PNG magic bytes */
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function decodePNG(buf: Buffer): Promise<RawImage> {
  return new Promise((resolve, reject) => {
    // Validate signature
    if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) {
      return reject(new Error('Not a valid PNG'));
    }

    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idatChunks: Buffer[] = [];

    let offset = 8;
    while (offset < buf.length) {
      const length = buf.readUInt32BE(offset);
      const type = buf.toString('ascii', offset + 4, offset + 8);
      const data = buf.subarray(offset + 8, offset + 8 + length);

      if (type === 'IHDR') {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8]!;
        colorType = data[9]!;
      } else if (type === 'IDAT') {
        idatChunks.push(Buffer.from(data));
      } else if (type === 'IEND') {
        break;
      }

      offset += 12 + length; // 4 len + 4 type + data + 4 crc
    }

    if (width === 0 || height === 0) {
      return reject(new Error('Invalid PNG: missing IHDR'));
    }

    // Only support 8-bit RGBA(6) and RGB(2) and grayscale(0) and gray+alpha(4) and palette(3)
    const compressed = Buffer.concat(idatChunks);
    const inflate = createInflate();
    const chunks: Buffer[] = [];

    inflate.on('data', (chunk: Buffer) => chunks.push(chunk));
    inflate.on('end', () => {
      try {
        const raw = Buffer.concat(chunks);
        const pixels = unfilterPNG(raw, width, height, colorType, bitDepth);
        resolve({ width, height, data: pixels });
      } catch (e) {
        reject(e);
      }
    });
    inflate.on('error', reject);
    inflate.end(compressed);
  });
}

function unfilterPNG(
  raw: Buffer,
  width: number,
  height: number,
  colorType: number,
  bitDepth: number,
): Uint8Array {
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const bpp = (channels * bitDepth) / 8; // bytes per pixel
  const stride = width * bpp;
  const output = new Uint8Array(width * height * 4); // always RGBA

  let srcOff = 0;
  const prevRow = new Uint8Array(stride);
  const curRow = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const filterByte = raw[srcOff++]!;
    for (let i = 0; i < stride; i++) {
      curRow[i] = raw[srcOff++]!;
    }

    // Apply PNG filter
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? curRow[i - bpp]! : 0;
      const b = prevRow[i]!;
      const c = i >= bpp ? prevRow[i - bpp]! : 0;

      switch (filterByte) {
        case 0: break; // None
        case 1: curRow[i] = (curRow[i]! + a) & 0xff; break; // Sub
        case 2: curRow[i] = (curRow[i]! + b) & 0xff; break; // Up
        case 3: curRow[i] = (curRow[i]! + ((a + b) >> 1)) & 0xff; break; // Average
        case 4: curRow[i] = (curRow[i]! + paethPredictor(a, b, c)) & 0xff; break; // Paeth
      }
    }

    // Convert row to RGBA
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      if (channels === 4) {
        output[dstIdx] = curRow[x * 4]!;
        output[dstIdx + 1] = curRow[x * 4 + 1]!;
        output[dstIdx + 2] = curRow[x * 4 + 2]!;
        output[dstIdx + 3] = curRow[x * 4 + 3]!;
      } else if (channels === 3) {
        output[dstIdx] = curRow[x * 3]!;
        output[dstIdx + 1] = curRow[x * 3 + 1]!;
        output[dstIdx + 2] = curRow[x * 3 + 2]!;
        output[dstIdx + 3] = 255;
      } else if (channels === 2) {
        const gray = curRow[x * 2]!;
        output[dstIdx] = gray;
        output[dstIdx + 1] = gray;
        output[dstIdx + 2] = gray;
        output[dstIdx + 3] = curRow[x * 2 + 1]!;
      } else {
        const gray = curRow[x]!;
        output[dstIdx] = gray;
        output[dstIdx + 1] = gray;
        output[dstIdx + 2] = gray;
        output[dstIdx + 3] = 255;
      }
    }

    prevRow.set(curRow);
  }

  return output;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function encodePNG(image: RawImage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { width, height, data } = image;

    // Build raw scanlines with filter byte 0 (None) for simplicity
    const rawBuf = Buffer.alloc(height * (1 + width * 4));
    let offset = 0;
    for (let y = 0; y < height; y++) {
      rawBuf[offset++] = 0; // filter None
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        rawBuf[offset++] = data[idx]!;
        rawBuf[offset++] = data[idx + 1]!;
        rawBuf[offset++] = data[idx + 2]!;
        rawBuf[offset++] = data[idx + 3]!;
      }
    }

    // Compress
    const deflate = createDeflate({ level: 6 });
    const chunks: Buffer[] = [];
    deflate.on('data', (c: Buffer) => chunks.push(c));
    deflate.on('end', () => {
      const compressed = Buffer.concat(chunks);

      // Assemble PNG
      const parts: Buffer[] = [];
      parts.push(Buffer.from(PNG_SIG));

      // IHDR
      const ihdr = Buffer.alloc(13);
      ihdr.writeUInt32BE(width, 0);
      ihdr.writeUInt32BE(height, 4);
      ihdr[8] = 8; // bit depth
      ihdr[9] = 6; // RGBA
      ihdr[10] = 0; // compression
      ihdr[11] = 0; // filter
      ihdr[12] = 0; // interlace
      parts.push(makeChunk('IHDR', ihdr));

      // IDAT
      parts.push(makeChunk('IDAT', compressed));

      // IEND
      parts.push(makeChunk('IEND', Buffer.alloc(0)));

      resolve(Buffer.concat(parts));
    });
    deflate.on('error', reject);
    deflate.end(rawBuf);
  });
}

function makeChunk(type: string, data: Buffer): Buffer {
  const buf = Buffer.alloc(12 + data.length);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + data.length));
  buf.writeUInt32BE(crc >>> 0, 8 + data.length);
  return buf;
}

// ─── CRC-32 ──────────────────────────────────────────────────────────────────

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer | Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── Image helpers ───────────────────────────────────────────────────────────

/** Nearest-neighbour scaling. */
function scaleImage(src: RawImage, dstW: number, dstH: number): RawImage {
  const dst = new Uint8Array(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    const srcY = Math.min(Math.round((y / dstH) * src.height), src.height - 1);
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.min(Math.round((x / dstW) * src.width), src.width - 1);
      const si = (srcY * src.width + srcX) * 4;
      const di = (y * dstW + x) * 4;
      dst[di] = src.data[si]!;
      dst[di + 1] = src.data[si + 1]!;
      dst[di + 2] = src.data[si + 2]!;
      dst[di + 3] = src.data[si + 3]!;
    }
  }
  return { width: dstW, height: dstH, data: dst };
}

/** Fill a rectangle with a solid colour. */
function fillRect(
  img: RawImage,
  x: number, y: number, w: number, h: number,
  r: number, g: number, b: number, a: number,
): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || px >= img.width || py < 0 || py >= img.height) continue;
      const idx = (py * img.width + px) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = a;
    }
  }
}

/** Alpha-composite src over dst at (ox, oy). */
function compositeOver(dst: RawImage, src: RawImage, ox: number, oy: number): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const dx = ox + x;
      const dy = oy + y;
      if (dx < 0 || dx >= dst.width || dy < 0 || dy >= dst.height) continue;

      const si = (y * src.width + x) * 4;
      const di = (dy * dst.width + dx) * 4;

      const sa = src.data[si + 3]! / 255;
      const da = dst.data[di + 3]! / 255;
      const outA = sa + da * (1 - sa);

      if (outA === 0) {
        dst.data[di] = 0;
        dst.data[di + 1] = 0;
        dst.data[di + 2] = 0;
        dst.data[di + 3] = 0;
      } else {
        dst.data[di] = Math.round((src.data[si]! * sa + dst.data[di]! * da * (1 - sa)) / outA);
        dst.data[di + 1] = Math.round((src.data[si + 1]! * sa + dst.data[di + 1]! * da * (1 - sa)) / outA);
        dst.data[di + 2] = Math.round((src.data[si + 2]! * sa + dst.data[di + 2]! * da * (1 - sa)) / outA);
        dst.data[di + 3] = Math.round(outA * 255);
      }
    }
  }
}
