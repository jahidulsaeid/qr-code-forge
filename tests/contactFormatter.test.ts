import { describe, it, expect } from 'vitest';
import { formatContact } from '../src/formatters/contactFormatter';
import { ValidationError } from '../src/types';

describe('contactFormatter', () => {
  const minimalContact = {
    type: 'contact' as const,
    name: 'John Doe',
    phone: '+1234567890',
  };

  it('should generate a valid vCard 3.0 string', () => {
    const result = formatContact(minimalContact);
    expect(result).toContain('BEGIN:VCARD');
    expect(result).toContain('VERSION:3.0');
    expect(result).toContain('FN:John Doe');
    expect(result).toContain('TEL:+1234567890');
    expect(result).toContain('END:VCARD');
  });

  it('should produce structured name (N:) field', () => {
    const result = formatContact(minimalContact);
    expect(result).toContain('N:Doe;John;;;');
  });

  it('should handle single-word names', () => {
    const result = formatContact({ ...minimalContact, name: 'Madonna' });
    expect(result).toContain('N:Madonna;;;;');
  });

  it('should include email when provided', () => {
    const result = formatContact({ ...minimalContact, email: 'john@example.com' });
    expect(result).toContain('EMAIL:john@example.com');
  });

  it('should include organization when provided', () => {
    const result = formatContact({ ...minimalContact, organization: 'Acme Inc' });
    expect(result).toContain('ORG:Acme Inc');
  });

  it('should include title when provided', () => {
    const result = formatContact({ ...minimalContact, title: 'CEO' });
    expect(result).toContain('TITLE:CEO');
  });

  it('should include website when provided', () => {
    const result = formatContact({ ...minimalContact, website: 'https://example.com' });
    expect(result).toContain('URL:https://example.com');
  });

  it('should include all optional fields when provided', () => {
    const full = {
      ...minimalContact,
      email: 'john@example.com',
      organization: 'Acme',
      title: 'CEO',
      website: 'https://acme.com',
    };
    const result = formatContact(full);
    expect(result).toContain('EMAIL:john@example.com');
    expect(result).toContain('ORG:Acme');
    expect(result).toContain('TITLE:CEO');
    expect(result).toContain('URL:https://acme.com');
  });

  it('should escape special vCard characters', () => {
    const result = formatContact({
      ...minimalContact,
      name: 'John; Doe, Jr.',
    });
    expect(result).toContain('FN:John\\; Doe\\, Jr.');
  });

  // ── Validation errors ────────────────────────────────────────────────

  it('should throw ValidationError when name is missing', () => {
    expect(() =>
      formatContact({ type: 'contact', name: '', phone: '+1' }),
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError when phone is missing', () => {
    expect(() =>
      formatContact({ type: 'contact', name: 'John', phone: '' }),
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid email', () => {
    expect(() =>
      formatContact({ ...minimalContact, email: 'not-an-email' }),
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid website URL', () => {
    expect(() =>
      formatContact({ ...minimalContact, website: 'not-a-url' }),
    ).toThrow(ValidationError);
  });
});
