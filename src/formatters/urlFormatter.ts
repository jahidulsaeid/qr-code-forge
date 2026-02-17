import type { URLContent } from '../types.js';
import { validateURL } from '../validators.js';

/**
 * Formats a URL content object into a plain URL string for QR encoding.
 */
export function formatURL(content: URLContent): string {
  validateURL(content.url);
  return content.url;
}
