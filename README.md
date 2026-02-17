# qr-code-forge

Production-ready QR code generator for Node.js with support for multiple content types, logo embedding, and customizable output formats.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

---

## Features

- **Multiple content types** — URL, plain text, contact (vCard 3.0)
- **Output formats** — PNG, SVG, Data URL (base64)
- **Logo embedding** — center a logo on any PNG QR code with auto error-correction boost
- **Customisable** — size, margin, colours, error correction level
- **Extensible** — register custom formatters for new content types (email, Wi-Fi, etc.)
- **Type-safe** — full TypeScript types with discriminated unions and strict mode
- **Dual module** — ESM + CommonJS output, tree-shakable, `sideEffects: false`
- **Zero native deps** — only `qrcode` as a runtime dependency

---

## Installation

```bash
npm install qr-code-forge
```

---

## Quick Start

```ts
import { generateQRCode } from 'qr-code-forge';

// Generate a QR code for a URL (default behaviour)
const result = await generateQRCode({ content: 'https://example.com' });
// result.data → PNG Buffer
```

---

## Usage Examples

### URL QR Code

```ts
import { generateQRCode } from 'qr-code-forge';
import { writeFileSync } from 'node:fs';

const result = await generateQRCode({
  content: 'https://example.com',
  size: 512,
});

writeFileSync('qr-url.png', result.data);
```

### Plain Text QR Code

```ts
const result = await generateQRCode({
  content: { type: 'text', text: 'Hello from QR Code Forge! 🚀' },
  format: 'svg',
});

writeFileSync('qr-text.svg', result.data);
```

### Contact (vCard) QR Code

```ts
const result = await generateQRCode({
  content: {
    type: 'contact',
    name: 'Jane Smith',
    phone: '+1-555-123-4567',
    email: 'jane@example.com',
    organization: 'Acme Corp',
    title: 'CTO',
    website: 'https://acme.com',
  },
});

writeFileSync('qr-contact.png', result.data);
```

### QR Code with Logo

```ts
const result = await generateQRCode({
  content: 'https://example.com',
  size: 512,
  logo: {
    source: './my-logo.png',   // local path or URL
    sizePercent: 20,           // 20% of QR width
    margin: 6,                 // px padding around logo
  },
});

writeFileSync('qr-with-logo.png', result.data);
```

> **Note:** Logo embedding is only supported for PNG output. Error correction is automatically raised to `H` when a logo is used (unless you explicitly set a level).

### Custom Colours

```ts
const result = await generateQRCode({
  content: 'https://example.com',
  darkColor: '#1a1a2e',
  lightColor: '#e0e0e0',
  size: 400,
  margin: 2,
  errorCorrectionLevel: 'Q',
});
```

### Data URL for Browser/HTML

```ts
const result = await generateQRCode({
  content: 'https://example.com',
  format: 'dataurl',
});

// Use directly in an <img> tag:
// <img src="${result.data}" />
console.log(result.data); // data:image/png;base64,iVBOR...
```

---

## API Reference

### `generateQRCode(options: QRCodeOptions): Promise<QRCodeResult>`

Main entry point. Generates a QR code from the given options.

#### `QRCodeOptions`

| Property               | Type                    | Default      | Description                                                |
| ---------------------- | ----------------------- | ------------ | ---------------------------------------------------------- |
| `content`              | `QRContent \| string`   | *(required)* | Content to encode. A plain string is treated as a URL.     |
| `format`               | `'png' \| 'svg' \| 'dataurl'` | `'png'` | Output format.                                             |
| `size`                 | `number`                | `256`        | Width/height in pixels (1 – 2048).                         |
| `margin`               | `number`                | `4`          | Quiet-zone margin in modules.                              |
| `darkColor`            | `string`                | `'#000000'`  | Foreground colour (CSS colour).                            |
| `lightColor`           | `string`                | `'#ffffff'`  | Background colour (CSS colour).                            |
| `errorCorrectionLevel` | `'L' \| 'M' \| 'Q' \| 'H'` | `'M'`   | Error correction level. Auto-raised to `H` when logo used. |
| `logo`                 | `LogoOptions`           | —            | Optional logo to embed (PNG only).                         |

#### `QRContent` (discriminated union)

```ts
// URL (default when string is passed)
{ type: 'url'; url: string }

// Plain text
{ type: 'text'; text: string }

// Contact / vCard
{
  type: 'contact';
  name: string;        // required
  phone: string;       // required
  email?: string;
  organization?: string;
  title?: string;
  website?: string;
}
```

#### `LogoOptions`

| Property      | Type     | Default | Description                                |
| ------------- | -------- | ------- | ------------------------------------------ |
| `source`      | `string` | —       | Local file path or HTTP(S) URL.            |
| `sizePercent` | `number` | `20`    | Logo width as % of QR width (1 – 40).     |
| `margin`      | `number` | `4`     | Padding in pixels around the logo.         |

#### `QRCodeResult`

| Property         | Type              | Description                         |
| ---------------- | ----------------- | ----------------------------------- |
| `data`           | `Buffer \| string` | PNG buffer, SVG string, or data URL. |
| `mimeType`       | `string`          | MIME type of the output.            |
| `format`         | `OutputFormat`    | The format that was used.           |
| `encodedContent` | `string`          | Raw string encoded in the QR matrix.|

---

### `registerFormatter(type, formatter)`

Register a custom content-type formatter at runtime.

```ts
import { registerFormatter, generateQRCode } from 'qr-code-forge';
```

See the [Extending with a New Formatter](#extending-with-a-new-formatter-example-email) section below.

---

## Extending with a New Formatter (Example: Email)

You can add new content types **without modifying the core source**:

```ts
import { registerFormatter, generateQRCode } from 'qr-code-forge';

// 1. Define your content interface
interface EmailContent {
  type: 'email';
  to: string;
  subject?: string;
  body?: string;
}

// 2. Register a formatter
registerFormatter<EmailContent>('email', (content) => {
  const params = new URLSearchParams();
  if (content.subject) params.set('subject', content.subject);
  if (content.body) params.set('body', content.body);
  const qs = params.toString();
  return `mailto:${content.to}${qs ? '?' + qs : ''}`;
});

// 3. Use it
const result = await generateQRCode({
  content: {
    type: 'email',
    to: 'hello@example.com',
    subject: 'Hi there!',
  } as any, // cast needed since EmailContent isn't in the base union
});
```

Other types you might add: `phone` (`tel:`), `sms` (`smsto:`), `wifi` (`WIFI:...`), `geo` (`geo:lat,lng`).

---

## Browser Usage

The `dataurl` and `svg` formats work directly in the browser. Use a bundler (Vite, webpack, esbuild) that can handle the Node `qrcode` package:

```ts
import { generateQRCode } from 'qr-code-forge';

const result = await generateQRCode({
  content: 'https://example.com',
  format: 'dataurl',
});

const img = document.createElement('img');
img.src = result.data as string;
document.body.appendChild(img);
```

> **Note:** Logo embedding uses Node.js `fs` and `zlib` APIs and is not available in browsers. Use server-side rendering for logo QR codes.

---

## React Usage

A built-in `useQRCode` hook is available at `qr-code-forge/react`:

### Basic Example

```tsx
import { useQRCode } from 'qr-code-forge/react';

function QRCodeImage() {
  const { qrCode, loading, error } = useQRCode({
    content: 'https://example.com',
    size: 256,
  });

  if (loading) return <p>Generating…</p>;
  if (error)   return <p>Error: {error.message}</p>;
  if (!qrCode) return null;

  return <img src={qrCode.data as string} alt="QR Code" />;
}
```

### With Dynamic Content (e.g. from URL params)

```tsx
import { useSearchParams } from 'react-router-dom';
import { useQRCode } from 'qr-code-forge/react';

function DynamicQR() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url') ?? 'https://example.com';

  const { qrCode, loading, error } = useQRCode({
    content: url,
    format: 'dataurl',   // default for the hook
    size: 512,
    darkColor: '#1a1a2e',
  });

  if (loading) return <p>Generating…</p>;
  if (error)   return <p>Error: {error.message}</p>;
  if (!qrCode) return null;

  return <img src={qrCode.data as string} alt="QR Code" />;
}
```

### SVG Output (inline rendering)

```tsx
import { useQRCode } from 'qr-code-forge/react';

function InlineSVG() {
  const { qrCode } = useQRCode({
    content: 'https://example.com',
    format: 'svg',
  });

  if (!qrCode) return null;

  return <div dangerouslySetInnerHTML={{ __html: qrCode.data as string }} />;
}
```

### Contact Card QR

```tsx
import { useQRCode } from 'qr-code-forge/react';

function ContactQR() {
  const { qrCode } = useQRCode({
    content: {
      type: 'contact',
      name: 'Jane Smith',
      phone: '+1-555-123-4567',
      email: 'jane@example.com',
      organization: 'Acme Corp',
    },
  });

  if (!qrCode) return null;
  return <img src={qrCode.data as string} alt="Contact QR" />;
}
```

### Conditional Generation

```tsx
import { useQRCode } from 'qr-code-forge/react';
import { useState } from 'react';

function ConditionalQR() {
  const [url, setUrl] = useState('');

  const { qrCode, loading } = useQRCode({
    content: url || 'https://example.com',
    enabled: url.length > 0,  // only generate when there's input
  });

  return (
    <div>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter URL…" />
      {loading && <p>Generating…</p>}
      {qrCode && <img src={qrCode.data as string} alt="QR" />}
    </div>
  );
}
```

### `useQRCode` API

```ts
function useQRCode(options: UseQRCodeOptions): UseQRCodeReturn;
```

| Option    | Type                                   | Default      | Description                                  |
| --------- | -------------------------------------- | ------------ | -------------------------------------------- |
| `content` | `QRContent \| string`                  | *(required)* | Content to encode.                           |
| `format`  | `'svg' \| 'dataurl'`                   | `'dataurl'`  | Output format (logo/PNG not available in browser). |
| `size`    | `number`                               | `256`        | Image size in pixels.                        |
| `enabled` | `boolean`                              | `true`       | Set `false` to defer generation.             |
| …         | All other `QRCodeOptions` (except `logo`) | —         | See main API docs above.                     |

Returns `{ qrCode: QRCodeResult | null, loading: boolean, error: Error | null }`.

---

## Node.js Usage

```ts
const { generateQRCode } = require('qr-code-forge');     // CommonJS
// import { generateQRCode } from 'qr-code-forge';       // ESM

const result = await generateQRCode({
  content: 'https://example.com',
  format: 'png',
  size: 1024,
  errorCorrectionLevel: 'H',
});

require('fs').writeFileSync('qr.png', result.data);
```

---

## Error Handling

All errors are typed and extend `QRCodeForgeError`:

```ts
import { ValidationError, LogoError, QRCodeForgeError } from 'qr-code-forge';

try {
  await generateQRCode({ content: 'not-a-url' });
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(`Validation failed on field "${err.field}": ${err.message}`);
  } else if (err instanceof LogoError) {
    console.error(`Logo error: ${err.message}`);
  }
}
```

---

## Edge Cases Handled

| Scenario                        | Behaviour                                   |
| ------------------------------- | ------------------------------------------- |
| Very long text (> 4 296 chars)  | `ValidationError` thrown                     |
| Logo on SVG / DataURL format    | Silently ignored (no crash)                  |
| Invalid logo image file         | `LogoError` thrown                           |
| Non-existent logo path          | `LogoError` thrown                           |
| Size > 2 048                    | `ValidationError` thrown                     |
| Non-HTTP URL protocol           | `ValidationError` thrown                     |
| Missing required contact fields | `ValidationError` with field name            |
| Logo used without explicit EC   | Error correction auto-raised to `H`          |

---

## Project Structure

```
src/
├── index.ts                 # Public API barrel
├── generateQRCode.ts        # Main function
├── types.ts                 # All types, interfaces, error classes
├── validators.ts            # Input validation
├── formatters/
│   ├── index.ts             # Formatter registry (strategy pattern)
│   ├── urlFormatter.ts      # URL → string
│   ├── textFormatter.ts     # Text → string
│   └── contactFormatter.ts  # Contact → vCard 3.0 string
└── logo/
    └── embedLogo.ts         # PNG logo compositing (pure Node, no native deps)
```

---

## Build

```bash
npm run build       # ESM + CJS via tsup
npm run lint        # Type-check without emit
npm test            # Vitest
npm run test:coverage
```

---

## License

[MIT](./LICENSE)
