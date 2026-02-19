import {
  type QRCodeOptions,
  type QRContent,
  type LogoOptions,
  ValidationError,
} from './types.js';

// ─── URL validation ──────────────────────────────────────────────────────────

/**
 * Validate that a string is a well-formed HTTP(S) URL.
 * Throws `ValidationError` if the check fails.
 */
export function validateURL(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new ValidationError('url', 'URL must be a non-empty string.');
  }
  // Try the built-in URL parser first (more lenient), then the regex
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ValidationError('url', `Invalid URL protocol "${parsed.protocol}". Only http and https are supported.`);
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError('url', `Invalid URL: "${url}".`);
  }
}

// ─── Text validation ─────────────────────────────────────────────────────────

/** Maximum number of characters we allow in a QR text payload. */
const MAX_TEXT_LENGTH = 4296;

export function validateText(text: string): void {
  if (!text || typeof text !== 'string') {
    throw new ValidationError('text', 'Text must be a non-empty string.');
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new ValidationError(
      'text',
      `Text is too long (${text.length} chars). Maximum is ${MAX_TEXT_LENGTH}.`,
    );
  }
}

// ─── Contact validation ──────────────────────────────────────────────────────

export function validateContact(content: Extract<QRContent, { type: 'contact' }>): void {
  if (!content.name || typeof content.name !== 'string') {
    throw new ValidationError('contact.name', 'Contact name is required and must be a non-empty string.');
  }
  if (!content.phone || typeof content.phone !== 'string') {
    throw new ValidationError('contact.phone', 'Contact phone is required and must be a non-empty string.');
  }
  if (content.email !== undefined) {
    if (typeof content.email !== 'string' || !content.email.includes('@')) {
      throw new ValidationError('contact.email', 'Contact email must be a valid email address.');
    }
  }
  if (content.website !== undefined) {
    validateURL(content.website);
  }
}

// ─── Options validation ──────────────────────────────────────────────────────

const VALID_FORMATS = new Set(['png', 'svg', 'dataurl']);
const VALID_EC_LEVELS = new Set(['L', 'M', 'Q', 'H']);

export function validateOptions(options: QRCodeOptions): void {
  // --- format ---
  if (options.format !== undefined && !VALID_FORMATS.has(options.format)) {
    throw new ValidationError('format', `Invalid format "${options.format}". Expected one of: png, svg, dataurl.`);
  }

  // --- size ---
  if (options.size !== undefined) {
    if (typeof options.size !== 'number' || options.size < 1 || options.size > 2048) {
      throw new ValidationError('size', 'Size must be a number between 1 and 2048.');
    }
  }

  // --- margin ---
  if (options.margin !== undefined) {
    if (typeof options.margin !== 'number' || options.margin < 0) {
      throw new ValidationError('margin', 'Margin must be a non-negative number.');
    }
  }

  // --- error correction ---
  if (
    options.errorCorrectionLevel !== undefined &&
    !VALID_EC_LEVELS.has(options.errorCorrectionLevel)
  ) {
    throw new ValidationError(
      'errorCorrectionLevel',
      `Invalid error correction level "${options.errorCorrectionLevel}". Expected one of: L, M, Q, H.`,
    );
  }

  // --- logo ---
  if (options.logo) {
    validateLogoOptions(options.logo);
  }
}

export function validateLogoOptions(logo: LogoOptions): void {
  if (!logo.source || typeof logo.source !== 'string') {
    throw new ValidationError('logo.source', 'Logo source must be a non-empty string (path or URL).');
  }
  if (logo.sizePercent !== undefined) {
    if (typeof logo.sizePercent !== 'number' || logo.sizePercent < 1 || logo.sizePercent > 40) {
      throw new ValidationError('logo.sizePercent', 'Logo sizePercent must be between 1 and 40.');
    }
  }
  if (logo.margin !== undefined) {
    if (typeof logo.margin !== 'number' || logo.margin < 0) {
      throw new ValidationError('logo.margin', 'Logo margin must be a non-negative number.');
    }
  }
}
