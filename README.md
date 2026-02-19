# qr-code-forge

Production-ready QR code generator for Node.js and React with support for multiple content types, logo embedding, and customizable output formats.

[![npm version](https://img.shields.io/npm/v/qr-code-forge.svg)](https://www.npmjs.com/package/qr-code-forge)
[![npm downloads](https://img.shields.io/npm/dm/qr-code-forge.svg)](https://www.npmjs.com/package/qr-code-forge)
[![CI](https://github.com/jahidulsaeid/qr-code-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/jahidulsaeid/qr-code-forge/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D16-brightgreen)](https://nodejs.org)

---

## Features

- **Multiple content types** — URL, plain text, contact (vCard 3.0)
- **Output formats** — PNG, SVG, Data URL (base64)
- **Logo embedding** — center a logo on any PNG QR code (Node.js / server only)
- **React components** — drop-in `<QRCode>` and `<QRCodeSVG>` components with `forwardRef`
- **React hook** — `useQRCode` with `regenerate`, `isIdle`, and reactive option tracking
- **Customisable** — size, margin, colours, error correction level
- **Extensible** — register custom formatters for new content types (email, Wi-Fi, etc.)
- **Type-safe** — full TypeScript types with discriminated unions and strict mode
- **Dual module** — ESM + CommonJS, tree-shakable, `sideEffects: false`
- **Zero native deps** — only `qrcode` as a runtime dependency

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Node.js Usage](#nodejs-usage)
- [React Usage](#react-usage)
  - [Components](#components)
  - [Hook](#hook)
- [Browser Usage](#browser-usage)
- [API Reference](#api-reference)
- [Logo Embedding](#logo-embedding)
- [Custom Formatters](#custom-formatters)
- [Error Handling](#error-handling)
- [Publishing (npm + GitHub Packages)](#publishing-npm--github-packages)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
# npm
npm install qr-code-forge

# pnpm
pnpm add qr-code-forge

# yarn
yarn add qr-code-forge
```

> **GitHub Packages** (alternative registry):
> ```bash
> npm install @jahidulsaeid/qr-code-forge --registry https://npm.pkg.github.com
> ```

---

## Quick Start

```ts
import { generateQRCode } from 'qr-code-forge';

const result = await generateQRCode({ content: 'https://example.com' });
// result.data → PNG Buffer
```

---

## Node.js Usage

```ts
import { generateQRCode } from 'qr-code-forge';
import { writeFileSync } from 'node:fs';

// URL QR → PNG
const png = await generateQRCode({ content: 'https://example.com', size: 512 });
writeFileSync('qr.png', png.data);

// Plain text → SVG
const svg = await generateQRCode({
  content: { type: 'text', text: 'Hello from QR Code Forge! 🚀' },
  format: 'svg',
});
writeFileSync('qr.svg', svg.data);

// Contact card (vCard 3.0)
const contact = await generateQRCode({
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
writeFileSync('qr-contact.png', contact.data);

// Custom colours
const colored = await generateQRCode({
  content: 'https://example.com',
  darkColor: '#1a1a2e',
  lightColor: '#e0e0e0',
  size: 400,
  margin: 2,
  errorCorrectionLevel: 'Q',
});
```

---

## Logo Embedding

Logo embedding requires **PNG format** and the **Node.js entry** (`qr-code-forge/node`).
Error correction is automatically raised to `H` when a logo is used.

```ts
import { generateQRCode } from 'qr-code-forge/node';  // ← /node entry
import { writeFileSync } from 'node:fs';

const result = await generateQRCode({
  content: 'https://example.com',
  size: 512,
  logo: {
    source: './my-logo.png',  // local path or https:// URL
    sizePercent: 20,          // logo takes 20% of QR width (1–40)
    margin: 6,                // px padding around logo
  },
});

writeFileSync('qr-with-logo.png', result.data);
```

> **Browser / React:** Logo embedding is not available in the browser. See [Logo overlay (browser)](#logo-overlay-browser) below.

---

## React Usage

```bash
npm install qr-code-forge react react-dom
```

```ts
import { QRCode, QRCodeSVG, useQRCode } from 'qr-code-forge/react';
```

### Components

#### `<QRCode>` — Data-URL `<img>`

Renders an `<img>` element. Accepts all standard `<img>` HTML attributes.

```tsx
import { QRCode } from 'qr-code-forge/react';

// Minimal
<QRCode content="https://example.com" />

// All options
<QRCode
  content="https://example.com"
  size={300}
  darkColor="#1a1a2e"
  lightColor="#f0f0f0"
  errorCorrectionLevel="H"
  alt="My QR Code"
  className="rounded-xl shadow-lg"
  style={{ border: '1px solid #eee' }}
/>

// Contact card
<QRCode
  content={{ type: 'contact', name: 'Jane Doe', phone: '+1234567890' }}
  size={300}
/>

// Custom loading / error slots
<QRCode
  content="https://example.com"
  loading={<Spinner />}
  onError={(err) => <p className="text-red-500">{err.message}</p>}
/>

// Deferred generation
<QRCode content={url} enabled={url.length > 0} />

// Ref forwarding
const imgRef = useRef<HTMLImageElement>(null);
<QRCode ref={imgRef} content="https://example.com" />
```

#### `<QRCodeSVG>` — Inline SVG

Injects SVG markup via `dangerouslySetInnerHTML`. Fully styleable with CSS.

```tsx
import { QRCodeSVG } from 'qr-code-forge/react';

<QRCodeSVG content="https://example.com" />

// Tailwind CSS
<QRCodeSVG
  content="https://example.com"
  darkColor="#4f46e5"
  className="w-48 h-48"
/>

// Ref forwarding (gives the wrapper <div>)
const divRef = useRef<HTMLDivElement>(null);
<QRCodeSVG ref={divRef} content="https://example.com" />
```

#### Logo overlay (browser)

Use a CSS overlay — set `errorCorrectionLevel="H"` so the QR stays scannable with the logo covering ~30% of it.

```tsx
function QRWithLogo() {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <QRCode content="https://example.com" size={256} errorCorrectionLevel="H" />
      <img
        src="/logo.png"
        alt=""
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 52, height: 52,
          background: '#fff',
          borderRadius: 8,
          padding: 4,
        }}
      />
    </div>
  );
}
```

Or generate the PNG server-side and serve it via an API route:

```ts
// Next.js — app/api/qr/route.ts
import { generateQRCode } from 'qr-code-forge/node';

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url') ?? 'https://example.com'\;
  const result = await generateQRCode({
    content: url,
    format: 'png',
    logo: { source: './public/logo.png', sizePercent: 20 },
  });
  return new Response(result.data as Buffer, {
    headers: { 'Content-Type': 'image/png' },
  });
}
```

```tsx
<img src={`/api/qr?url=${encodeURIComponent(url)}`} alt="QR Code" />
```

---

### Hook

`useQRCode` is for full control when you need custom rendering logic.

```tsx
import { useQRCode } from 'qr-code-forge/react';

function MyQR() {
  const { qrCode, loading, error, isIdle, regenerate } = useQRCode({
    content: 'https://example.com',
    format: 'dataurl',
    size: 256,
  });

  if (loading) return <p>Generating…</p>;
  if (error)   return <p>Error: {error.message}</p>;
  if (!qrCode) return null;

  return (
    <>
      <img src={qrCode.data as string} alt="QR Code" />
      <button onClick={regenerate}>↺ Refresh</button>
    </>
  );
}
```

**Dynamic URL (auto-regenerates on change):**

```tsx
const [url, setUrl] = useState('https://example.com');
const { qrCode, loading } = useQRCode({ content: url });

return (
  <>
    <input value={url} onChange={(e) => setUrl(e.target.value)} />
    {loading && <span>Generating…</span>}
    {qrCode && <img src={qrCode.data as string} alt="QR" />}
  </>
);
```

**Deferred generation (`enabled`):**

```tsx
const { qrCode } = useQRCode({
  content: url,
  enabled: url.length > 0,  // won't generate until url is non-empty
});
```

#### `useQRCode` API

| Option                 | Type                          | Default      | Description                                    |
|------------------------|-------------------------------|--------------|------------------------------------------------|
| `content`              | `QRContent \| string`         | *(required)* | Content to encode.                             |
| `format`               | `'svg' \| 'dataurl'`          | `'dataurl'`  | Output format (PNG not available in browser).  |
| `size`                 | `number`                      | `256`        | Image size in pixels.                          |
| `margin`               | `number`                      | `4`          | Quiet-zone margin in modules.                  |
| `darkColor`            | `string`                      | `'#000000'`  | Foreground colour.                             |
| `lightColor`           | `string`                      | `'#ffffff'`  | Background colour.                             |
| `errorCorrectionLevel` | `'L' \| 'M' \| 'Q' \| 'H'`   | `'M'`        | Error correction level.                        |
| `enabled`              | `boolean`                     | `true`       | Set `false` to defer generation.               |

**Returns:**

| Field        | Type                   | Description                                                     |
|--------------|------------------------|-----------------------------------------------------------------|
| `qrCode`     | `QRCodeResult \| null` | Generated result, or `null` while loading / on error.           |
| `loading`    | `boolean`              | `true` while generating.                                        |
| `isIdle`     | `boolean`              | `true` when `enabled` is `false`.                               |
| `error`      | `Error \| null`        | Error if generation failed.                                     |
| `regenerate` | `() => void`           | Manually re-trigger generation (e.g. a Refresh button).         |

---

## Browser Usage

```ts
import { generateQRCode } from 'qr-code-forge';

const result = await generateQRCode({
  content: 'https://example.com',
  format: 'dataurl',  // or 'svg'
});

const img = document.createElement('img');
img.src = result.data as string;
document.body.appendChild(img);
```

---

## API Reference

### `generateQRCode(options): Promise<QRCodeResult>`

Import from `'qr-code-forge'` (browser-safe) or `'qr-code-forge/node'` (logo support).

#### `QRCodeOptions`

| Property               | Type                          | Default      | Description                                              |
|------------------------|-------------------------------|--------------|----------------------------------------------------------|
| `content`              | `QRContent \| string`         | *(required)* | Content to encode. A plain string is treated as a URL.   |
| `format`               | `'png' \| 'svg' \| 'dataurl'` | `'png'`      | Output format.                                           |
| `size`                 | `number`                      | `256`        | Width/height in pixels (1–2048).                         |
| `margin`               | `number`                      | `4`          | Quiet-zone margin in modules.                            |
| `darkColor`            | `string`                      | `'#000000'`  | Foreground colour (CSS colour string).                   |
| `lightColor`           | `string`                      | `'#ffffff'`  | Background colour (CSS colour string).                   |
| `errorCorrectionLevel` | `'L' \| 'M' \| 'Q' \| 'H'`   | `'M'`        | Auto-raised to `H` when a logo is used.                  |
| `logo`                 | `LogoOptions`                 | —            | Optional logo — **PNG + Node.js entry only**.            |

#### `QRContent` (discriminated union)

```ts
{ type: 'url';  url: string }

{ type: 'text'; text: string }

{
  type: 'contact';
  name: string;           // required
  phone: string;          // required
  email?: string;
  organization?: string;
  title?: string;
  website?: string;
}
```

#### `LogoOptions`

| Property      | Type     | Default | Description                              |
|---------------|----------|---------|------------------------------------------|
| `source`      | `string` | —       | Local file path or HTTP(S) URL.          |
| `sizePercent` | `number` | `20`    | Logo width as % of QR width (1–40).      |
| `margin`      | `number` | `4`     | Padding in pixels around the logo.       |

#### `QRCodeResult`

| Property         | Type               | Description                             |
|------------------|--------------------|-----------------------------------------|
| `data`           | `Buffer \| string` | PNG buffer, SVG string, or data URL.    |
| `mimeType`       | `string`           | MIME type of the output.                |
| `format`         | `OutputFormat`     | The format that was used.               |
| `encodedContent` | `string`           | Raw string encoded in the QR matrix.    |

---

## Custom Formatters

Register any new content type without touching core source:

```ts
import { registerFormatter, generateQRCode } from 'qr-code-forge';

// Wi-Fi QR
interface WifiContent { type: 'wifi'; ssid: string; password: string; encryption?: 'WPA' | 'WEP' | 'nopass' }

registerFormatter<WifiContent>('wifi', (c) =>
  `WIFI:T:${c.encryption ?? 'WPA'};S:${c.ssid};P:${c.password};;`
);

const result = await generateQRCode({
  content: { type: 'wifi', ssid: 'MyNetwork', password: 'secret' } as any,
});
```

Other common types: `email` (`mailto:`), `phone` (`tel:`), `sms` (`smsto:`), `geo` (`geo:lat,lng`).

---

## Error Handling

```ts
import { ValidationError, LogoError, QRCodeForgeError } from 'qr-code-forge';

try {
  await generateQRCode({ content: 'not-a-url' });
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(`Validation failed on "${err.field}": ${err.message}`);
  } else if (err instanceof LogoError) {
    console.error(`Logo error: ${err.message}`);
  }
}
```

| Scenario                        | Behaviour                                    |
|---------------------------------|----------------------------------------------|
| Very long text (> 4 296 chars)  | `ValidationError` thrown                     |
| Logo on SVG / DataURL format    | Silently ignored                             |
| Invalid / missing logo file     | `LogoError` thrown                           |
| `size` > 2048                   | `ValidationError` thrown                     |
| Non-HTTP(S) URL protocol        | `ValidationError` thrown                     |
| Missing required contact fields | `ValidationError` with field name            |
| Logo without explicit EC level  | Error correction auto-raised to `H`          |

---
<!-- 
## Publishing (npm + GitHub Packages)

This package is published to **both** registries automatically via GitHub Actions on every release.

| Registry            | Package name                       | Install command                                                            |
|---------------------|------------------------------------|----------------------------------------------------------------------------|
| **npm**             | `qr-code-forge`                    | `npm install qr-code-forge`                                                |
| **GitHub Packages** | `@jahidulsaeid/qr-code-forge`      | `npm install @jahidulsaeid/qr-code-forge --registry https://npm.pkg.github.com` |

### How to publish a new version

1. Bump the version:
   ```bash
   npm version patch   # 1.0.3 → 1.0.4
   npm version minor   # 1.0.3 → 1.1.0
   npm version major   # 1.0.3 → 2.0.0
   ```

2. Push the tag to trigger CI/publish:
   ```bash
   git push && git push --tags
   ```

   Or [create a GitHub Release](https://github.com/jahidulsaeid/qr-code-forge/releases/new) — the workflow runs automatically.

### Required secrets

Set these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret       | Value                                              |
|--------------|----------------------------------------------------|
| `NPM_TOKEN`  | npm access token — run `npm token create` locally  |

> `GITHUB_TOKEN` is provided automatically by GitHub Actions.

--- -->

## Contributing

Contributions are welcome — bug fixes, new formatters, docs improvements, or new features. All PRs are appreciated.

### Setup

```bash
# 1. Fork & clone
git clone https://github.com/jahidulsaeid/qr-code-forge.git
cd qr-code-forge

# 2. Install dependencies
npm install

# 3. Create a branch
git checkout -b feat/my-feature

# 4. Make changes and run checks
npm test          # run tests
npm run lint      # type-check
npm run build     # build bundles

# 5. Commit (Conventional Commits)
git commit -m "feat: add my feature"

# 6. Push and open a Pull Request
git push origin feat/my-feature
```

### Development scripts

| Command                  | Description                              |
|--------------------------|------------------------------------------|
| `npm run build`          | Build ESM + CJS bundles via tsup         |
| `npm run dev`            | Build in watch mode                      |
| `npm test`               | Run all tests (Vitest)                   |
| `npm run test:watch`     | Run tests in watch mode                  |
| `npm run test:coverage`  | Run tests with coverage report           |
| `npm run lint`           | Type-check without emitting              |

### Commit conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | When to use                         |
|-------------|-------------------------------------|
| `feat:`     | New feature                         |
| `fix:`      | Bug fix                             |
| `docs:`     | Documentation only                  |
| `test:`     | Tests only                          |
| `refactor:` | Code change, no feature/fix         |
| `chore:`    | Build, tooling, CI changes          |

### Adding a new formatter

1. Create `src/formatters/myTypeFormatter.ts`
2. Register it in `src/formatters/index.ts`
3. Export from `src/index.ts`
4. Add tests in `tests/myType.test.ts`

### Reporting bugs

Open an issue at [github.com/jahidulsaeid/qr-code-forge/issues](https://github.com/jahidulsaeid/qr-code-forge/issues) with:
- Steps to reproduce
- Expected vs actual behaviour
- Node.js / browser / React version

---

## Project Structure

```
src/
├── index.ts                 # Public API barrel
├── generateQRCode.ts        # Core generation function
├── types.ts                 # Types, interfaces, error classes
├── validators.ts            # Input validation
├── react.tsx                # React hook + components (browser-safe)
├── node.ts                  # Node.js entry (logo support)
├── formatters/
│   ├── index.ts             # Formatter registry (strategy pattern)
│   ├── urlFormatter.ts      # URL → string
│   ├── textFormatter.ts     # Text → string
│   └── contactFormatter.ts  # Contact → vCard 3.0
└── logo/
    └── embedLogo.ts         # PNG logo compositing (Node.js only)
```

---

## License

[MIT](./LICENSE) © [Jahidul Saeid](https://github.com/jahidulsaeid)
