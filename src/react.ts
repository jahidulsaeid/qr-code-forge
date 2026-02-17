/**
 * React hook for generating QR codes.
 *
 * Works in browser environments (Vite, Next.js, CRA, etc.).
 * Uses `dataurl` or `svg` format so the result can be rendered
 * directly in an `<img>` tag or as inline SVG.
 *
 * @example
 * ```tsx
 * import { useQRCode } from 'qr-code-forge/react';
 *
 * function MyComponent() {
 *   const { qrCode, loading, error } = useQRCode({
 *     content: 'https://example.com',
 *     format: 'dataurl',
 *     size: 256,
 *   });
 *
 *   if (loading) return <p>Generating…</p>;
 *   if (error)   return <p>Error: {error.message}</p>;
 *   if (!qrCode) return null;
 *
 *   return <img src={qrCode.data as string} alt="QR Code" />;
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import { generateQRCode } from './generateQRCode.js';
import type { QRCodeOptions, QRCodeResult } from './types.js';

export interface UseQRCodeOptions extends Omit<QRCodeOptions, 'logo'> {
  /**
   * Set to `false` to defer generation.
   * Useful when the content depends on async data that isn't ready yet.
   * @default true
   */
  enabled?: boolean;
}

export interface UseQRCodeReturn {
  /** The generated QR result, or `null` while loading / on error. */
  qrCode: QRCodeResult | null;
  /** `true` while the QR code is being generated. */
  loading: boolean;
  /** Error object if generation failed. */
  error: Error | null;
}

/**
 * React hook that generates a QR code reactively.
 *
 * Regenerates whenever the options change (shallow comparison on
 * serialisable fields).
 *
 * **Browser-safe** — logo embedding is intentionally excluded.
 * Use `'dataurl'` or `'svg'` format for client-side rendering.
 */
export function useQRCode(options: UseQRCodeOptions): UseQRCodeReturn {
  const [qrCode, setQrCode] = useState<QRCodeResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Serialise the options so we can use them as an effect dependency
  // without requiring the caller to memoise.
  const optionsKey = stableKey(options);
  const enabled = options.enabled ?? true;

  // Keep a ref to the latest options to avoid stale closures.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!enabled) {
      setQrCode(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const { enabled: _enabled, ...qrOptions } = optionsRef.current;

    // Default to dataurl for browser usage if no format specified
    if (!qrOptions.format) {
      qrOptions.format = 'dataurl';
    }

    generateQRCode(qrOptions)
      .then((result) => {
        if (!cancelled) {
          setQrCode(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setQrCode(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey, enabled]);

  return { qrCode, loading, error };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Produce a stable string key from the QR options for effect deps. */
function stableKey(opts: UseQRCodeOptions): string {
  const content =
    typeof opts.content === 'string'
      ? opts.content
      : JSON.stringify(opts.content);

  return [
    content,
    opts.format ?? '',
    opts.size ?? '',
    opts.margin ?? '',
    opts.darkColor ?? '',
    opts.lightColor ?? '',
    opts.errorCorrectionLevel ?? '',
  ].join('|');
}
