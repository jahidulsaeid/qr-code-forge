import type { ContactContent } from '../types.js';
import { validateContact } from '../validators.js';

/**
 * Formats a contact content object into a vCard 3.0 string.
 *
 * The output follows RFC 6350 / vCard 3.0 so it is universally
 * scannable by smartphone cameras and QR reader apps.
 */
export function formatContact(content: ContactContent): string {
  validateContact(content);

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(content.name)}`,
    `N:${buildStructuredName(content.name)}`,
    `TEL:${escapeVCard(content.phone)}`,
  ];

  if (content.email) {
    lines.push(`EMAIL:${escapeVCard(content.email)}`);
  }
  if (content.organization) {
    lines.push(`ORG:${escapeVCard(content.organization)}`);
  }
  if (content.title) {
    lines.push(`TITLE:${escapeVCard(content.title)}`);
  }
  if (content.website) {
    lines.push(`URL:${escapeVCard(content.website)}`);
  }

  lines.push('END:VCARD');
  return lines.join('\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Escape special characters for vCard values.
 * vCard uses backslash-escaping for commas, semicolons, and backslashes.
 */
function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Build the structured N: field from a full name.
 * Splits on the first space: everything before is the given name,
 * everything after is the family name.
 */
function buildStructuredName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return `${escapeVCard(parts[0]!)};;;;`;
  }
  const familyName = parts[parts.length - 1]!;
  const givenName = parts.slice(0, -1).join(' ');
  return `${escapeVCard(familyName)};${escapeVCard(givenName)};;;`;
}
