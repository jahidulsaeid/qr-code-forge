// ─── Error Correction Levels ──────────────────────────────────────────────────

/** QR error correction level. Higher levels allow more damage but reduce capacity. */
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// ─── Output Formats ──────────────────────────────────────────────────────────

/** Supported QR output formats. */
export type OutputFormat = 'png' | 'svg' | 'dataurl';

// ─── Content Types (Discriminated Union) ─────────────────────────────────────

/** URL content. Default type when none is specified. */
export interface URLContent {
  type: 'url';
  url: string;
}

/** Plain-text content. */
export interface TextContent {
  type: 'text';
  text: string;
}

/** Contact information used to build a vCard. */
export interface ContactContent {
  type: 'contact';
  /** Full name (required). */
  name: string;
  /** Phone number (required). */
  phone: string;
  /** Email address (optional). */
  email?: string;
  /** Organisation / company (optional). */
  organization?: string;
  /** Job title (optional). */
  title?: string;
  /** Website URL (optional). */
  website?: string;
}

/**
 * Discriminated union of every supported content type.
 * Extend this union when adding new formatters (email, phone, wifi …).
 */
export type QRContent = URLContent | TextContent | ContactContent;

// ─── Logo Options ────────────────────────────────────────────────────────────

/** Options for embedding a logo in the centre of the QR code. */
export interface LogoOptions {
  /** Path to a local image **or** an HTTP(S) URL. */
  source: string;
  /** Logo width as a percentage of the QR image (1–40). Default `20`. */
  sizePercent?: number;
  /** Margin (px) around the logo. Default `4`. */
  margin?: number;
}

// ─── Main Options ────────────────────────────────────────────────────────────

/** Full set of options accepted by `generateQRCode`. */
export interface QRCodeOptions {
  /**
   * Content to encode.
   * If a plain `string` is provided it is treated as a URL (`{ type: 'url', url: value }`).
   */
  content: QRContent | string;

  /** Output format. Default `'png'`. */
  format?: OutputFormat;

  /** Image width/height in pixels. Default `256`. Max `2048`. */
  size?: number;

  /** Quiet-zone margin in modules. Default `4`. */
  margin?: number;

  /** Foreground colour (CSS colour string). Default `'#000000'`. */
  darkColor?: string;

  /** Background colour (CSS colour string). Default `'#ffffff'`. */
  lightColor?: string;

  /** Error correction level. Default `'M'` (auto-raised to `'H'` when a logo is used). */
  errorCorrectionLevel?: ErrorCorrectionLevel;

  /** Optional logo to embed in the QR code centre (PNG output only). */
  logo?: LogoOptions;
}

// ─── Result ──────────────────────────────────────────────────────────────────

/** Object returned by `generateQRCode`. */
export interface QRCodeResult {
  /** The generated QR data (Buffer for PNG, string for SVG / DataURL). */
  data: Buffer | string;
  /** MIME type of the output. */
  mimeType: string;
  /** The format that was used. */
  format: OutputFormat;
  /** The raw string that was encoded in the QR matrix. */
  encodedContent: string;
}

// ─── Formatter Registry ─────────────────────────────────────────────────────

/**
 * A formatter converts a typed content object into the raw string that will be
 * encoded in the QR matrix.
 */
export type ContentFormatter<T extends QRContent = QRContent> = (content: T) => string;

/**
 * Map of content-type discriminant → formatter function.
 * New types can be registered at runtime via `registerFormatter`.
 */
export type FormatterRegistry = Map<string, ContentFormatter<any>>;

// ─── Custom Errors ───────────────────────────────────────────────────────────

/** Base error for all QR-code-forge errors. */
export class QRCodeForgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QRCodeForgeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when input validation fails. */
export class ValidationError extends QRCodeForgeError {
  public readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/** Thrown when logo processing fails. */
export class LogoError extends QRCodeForgeError {
  constructor(message: string) {
    super(message);
    this.name = 'LogoError';
  }
}
