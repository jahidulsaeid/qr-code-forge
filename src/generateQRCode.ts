import QRCode from 'qrcode';
import type {
  QRCodeOptions,
  QRCodeResult,
  QRContent,
  ErrorCorrectionLevel,
  OutputFormat,
} from './types.js';
import { ValidationError } from './types.js';
import { validateOptions } from './validators.js';
import { formatContent } from './formatters/index.js';

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_SIZE = 256;
const DEFAULT_MARGIN = 4;
const DEFAULT_DARK = '#000000';
const DEFAULT_LIGHT = '#ffffff';
const DEFAULT_EC: ErrorCorrectionLevel = 'M';
const DEFAULT_FORMAT: OutputFormat = 'png';
const DEFAULT_LOGO_SIZE_PERCENT = 20;
const DEFAULT_LOGO_MARGIN = 4;

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Generate a QR code from the provided options.
 *
 * ```ts
 * // Simplest usage — URL string
 * const result = await generateQRCode({ content: 'https://example.com' });
 *
 * // Typed content
 * const result = await generateQRCode({
 *   content: { type: 'contact', name: 'Jane', phone: '+1234567890' },
 *   format: 'svg',
 * });
 * ```
 */
export async function generateQRCode(options: QRCodeOptions): Promise<QRCodeResult> {
  // ── Validate top-level options ──────────────────────────────────────────
  validateOptions(options);

  // ── Normalise content ──────────────────────────────────────────────────
  const content: QRContent = normaliseContent(options.content);

  // ── Resolve defaults ───────────────────────────────────────────────────
  const format = options.format ?? DEFAULT_FORMAT;
  const size = options.size ?? DEFAULT_SIZE;
  const margin = options.margin ?? DEFAULT_MARGIN;
  const darkColor = options.darkColor ?? DEFAULT_DARK;
  const lightColor = options.lightColor ?? DEFAULT_LIGHT;

  // Auto-raise error correction when a logo is used
  let errorCorrectionLevel: ErrorCorrectionLevel =
    options.errorCorrectionLevel ?? DEFAULT_EC;
  if (options.logo && !options.errorCorrectionLevel) {
    errorCorrectionLevel = 'H';
  }

  // ── Format content into QR payload string ──────────────────────────────
  const encodedContent = formatContent(content);

  // ── Generate QR ────────────────────────────────────────────────────────
  const qrOptions: QRCode.QRCodeToBufferOptions & QRCode.QRCodeToStringOptions = {
    errorCorrectionLevel,
    margin,
    width: size,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  };

  let data: Buffer | string;
  let mimeType: string;

  switch (format) {
    case 'svg': {
      data = await QRCode.toString(encodedContent, {
        ...qrOptions,
        type: 'svg',
      });
      mimeType = 'image/svg+xml';
      break;
    }
    case 'dataurl': {
      data = await QRCode.toDataURL(encodedContent, {
        ...qrOptions,
        type: 'image/png',
      } as QRCode.QRCodeToDataURLOptions);
      mimeType = 'text/plain';
      break;
    }
    case 'png':
    default: {
      data = await QRCode.toBuffer(encodedContent, {
        ...qrOptions,
        type: 'png',
      });
      mimeType = 'image/png';
      break;
    }
  }

  // ── Logo embedding (PNG only, Node.js only) ───────────────────────────
  if (options.logo && format === 'png' && Buffer.isBuffer(data)) {
    // Dynamic import keeps Node-only deps (fs, zlib) out of browser bundles
    const { embedLogo } = await import('./logo/embedLogo.js');
    data = await embedLogo({
      qrBuffer: data,
      source: options.logo.source,
      sizePercent: options.logo.sizePercent ?? DEFAULT_LOGO_SIZE_PERCENT,
      margin: options.logo.margin ?? DEFAULT_LOGO_MARGIN,
    });
  } else if (options.logo && format !== 'png') {
    // We intentionally do not throw — just ignore logo for non-PNG formats
    // so callers can switch formats without code changes.
  }

  return {
    data,
    mimeType,
    format,
    encodedContent,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * If the caller passes a plain string, treat it as a URL.
 */
function normaliseContent(input: QRContent | string): QRContent {
  if (typeof input === 'string') {
    return { type: 'url', url: input };
  }
  if (!input || typeof input !== 'object' || !('type' in input)) {
    throw new ValidationError('content', 'Content must be a string (URL) or a typed content object.');
  }
  return input;
}
