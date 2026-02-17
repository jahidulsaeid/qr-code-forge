import type { TextContent } from '../types.js';
import { validateText } from '../validators.js';

/**
 * Formats a text content object into a plain string for QR encoding.
 */
export function formatText(content: TextContent): string {
  validateText(content.text);
  return content.text;
}
