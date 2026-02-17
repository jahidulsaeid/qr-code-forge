/**
 * Formatter registry — central map of content-type → formatter.
 *
 * This module uses the Strategy pattern so new content types
 * (email, phone, wifi …) can be added without touching the core logic.
 */

import type { QRContent, ContentFormatter, FormatterRegistry } from '../types.js';
import { ValidationError } from '../types.js';
import { formatURL } from './urlFormatter.js';
import { formatText } from './textFormatter.js';
import { formatContact } from './contactFormatter.js';

// ─── Global registry ────────────────────────────────────────────────────────

const registry: FormatterRegistry = new Map<string, ContentFormatter<any>>();

// Register built-in formatters
registry.set('url', formatURL as ContentFormatter);
registry.set('text', formatText as ContentFormatter);
registry.set('contact', formatContact as ContentFormatter);

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Register (or override) a formatter for the given content type.
 *
 * @example
 * ```ts
 * registerFormatter('email', (content) => {
 *   return `mailto:${content.to}?subject=${content.subject}`;
 * });
 * ```
 */
export function registerFormatter<T extends QRContent>(
  type: string,
  formatter: ContentFormatter<T>,
): void {
  registry.set(type, formatter as ContentFormatter);
}

/**
 * Look up the formatter for a content type and produce the QR payload string.
 */
export function formatContent(content: QRContent): string {
  const formatter = registry.get(content.type);
  if (!formatter) {
    throw new ValidationError(
      'content.type',
      `Unknown content type "${content.type}". ` +
        `Registered types: ${[...registry.keys()].join(', ')}.`,
    );
  }
  return formatter(content);
}

/**
 * Check whether a formatter is registered for the given type.
 */
export function hasFormatter(type: string): boolean {
  return registry.has(type);
}
