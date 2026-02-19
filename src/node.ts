/**
 * Node.js-only exports.
 *
 * These rely on Node built-ins (fs, zlib) and must NOT be imported in
 * browser bundles. Use `import { ... } from 'qr-code-forge/node'`.
 */
export { embedLogo } from './logo/embedLogo.js';
export type { EmbedLogoParams } from './logo/embedLogo.js';

import { generateQRCode as _generateQRCode } from './generateQRCode.js';
import { embedLogo } from './logo/embedLogo.js';
import type { QRCodeOptions, QRCodeResult } from './types.js';

const DEFAULT_LOGO_SIZE_PERCENT = 20;
const DEFAULT_LOGO_MARGIN = 4;

/**
 * Node.js version of `generateQRCode` with logo embedding support.
 *
 * Use this instead of the base `generateQRCode` when you need logo
 * embedding on PNG output.
 *
 * ```ts
 * import { generateQRCode } from 'qr-code-forge/node';
 * const result = await generateQRCode({
 *   content: 'https://example.com',
 *   format: 'png',
 *   logo: { source: './logo.png' },
 * });
 * ```
 */
export async function generateQRCode(options: QRCodeOptions): Promise<QRCodeResult> {
  const result = await _generateQRCode(options);

  // Logo embedding (PNG only, Node.js only)
  const format = options.format ?? 'png';
  if (options.logo && format === 'png' && Buffer.isBuffer(result.data)) {
    result.data = await embedLogo({
      qrBuffer: result.data,
      source: options.logo.source,
      sizePercent: options.logo.sizePercent ?? DEFAULT_LOGO_SIZE_PERCENT,
      margin: options.logo.margin ?? DEFAULT_LOGO_MARGIN,
    });
  }

  return result;
}
