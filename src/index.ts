// ─── Public API surface ──────────────────────────────────────────────────────

// Main function
export { generateQRCode } from './generateQRCode.js';

// Formatter registry (for extensibility)
export { registerFormatter, hasFormatter, formatContent } from './formatters/index.js';

// Individual formatters (for standalone use / testing)
export { formatURL } from './formatters/urlFormatter.js';
export { formatText } from './formatters/textFormatter.js';
export { formatContact } from './formatters/contactFormatter.js';

// Logo embedding
export { embedLogo } from './logo/embedLogo.js';
export type { EmbedLogoParams } from './logo/embedLogo.js';

// All public types
export type {
  ErrorCorrectionLevel,
  OutputFormat,
  URLContent,
  TextContent,
  ContactContent,
  QRContent,
  LogoOptions,
  QRCodeOptions,
  QRCodeResult,
  ContentFormatter,
  FormatterRegistry,
} from './types.js';

// Error classes
export { QRCodeForgeError, ValidationError, LogoError } from './types.js';
