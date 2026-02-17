/**
 * Node.js-only exports.
 *
 * These rely on Node built-ins (fs, zlib) and must NOT be imported in
 * browser bundles. Use `import { embedLogo } from 'qr-code-forge/node'`.
 */
export { embedLogo } from './logo/embedLogo.js';
export type { EmbedLogoParams } from './logo/embedLogo.js';
