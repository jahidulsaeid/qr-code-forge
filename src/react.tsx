/**
 * React bindings for qr-code-forge.
 *
 * Works in browser environments (Vite, Next.js, CRA, Remix, etc.).
 * Provides a `useQRCode` hook and ready-to-use `<QRCode>` / `<QRCodeSVG>`
 * components so you can drop a QR code into any React app in one line.
 *
 * @example Hook usage
 * ```tsx
 * import { useQRCode } from 'qr-code-forge/react';
 *
 * function MyComponent() {
 *   const { qrCode, loading, error, regenerate } = useQRCode({
 *     content: 'https://example.com',
 *     format: 'dataurl',
 *     size: 256,
 *   });
 *
 *   if (loading) return <p>Generating…</p>;
 *   if (error)   return <p>Error: {error.message}</p>;
 *   if (!qrCode) return null;
 *
 *   return (
 *     <>
 *       <img src={qrCode.data as string} alt="QR Code" />
 *       <button onClick={regenerate}>Refresh</button>
 *     </>
 *   );
 * }
 * ```
 *
 * @example Component usage
 * ```tsx
 * import { QRCode, QRCodeSVG } from 'qr-code-forge/react';
 *
 * // DataURL <img> — simplest usage
 * <QRCode content="https://example.com" size={256} />
 *
 * // Inline SVG — styleable with CSS, no extra network request
 * <QRCodeSVG content="https://example.com" darkColor="#4f46e5" />
 * ```
 *
 * @module
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type ReactNode,
} from 'react';
import { generateQRCode } from './generateQRCode.js';
import type { QRCodeOptions, QRCodeResult, OutputFormat } from './types.js';

// ─── Hook types ──────────────────────────────────────────────────────────────

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
  /** `true` when `enabled` is `false` and generation has not been triggered. */
  isIdle: boolean;
  /** Error object if generation failed. */
  error: Error | null;
  /** Manually re-trigger QR generation (useful for "refresh" buttons). */
  regenerate: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * React hook that generates a QR code reactively.
 *
 * Regenerates whenever the options change (deep comparison on
 * serialisable fields). Callers do **not** need to memoise the options
 * object — the hook handles that internally.
 *
 * **Browser-safe** — logo embedding is intentionally excluded.
 * Use `'dataurl'` or `'svg'` format for client-side rendering.
 */
export function useQRCode(options: UseQRCodeOptions): UseQRCodeReturn {
  const [qrCode, setQrCode] = useState<QRCodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Manual regeneration trigger — bumping this forces the effect to re-run.
  const [tick, setTick] = useState(0);

  const enabled = options.enabled ?? true;

  // Stable serialised key so the effect re-runs only when options actually change.
  const optionsKey = useMemo(() => stableKey(options), [
    // We enumerate the primitive deps instead of the whole object so React
    // doesn't re-create the memo on every render.
    typeof options.content === 'string'
      ? options.content
      : // eslint-disable-next-line react-hooks/exhaustive-deps
        JSON.stringify(options.content),
    options.format,
    options.size,
    options.margin,
    options.darkColor,
    options.lightColor,
    options.errorCorrectionLevel,
  ]);

  // Keep a ref to the latest options so the async callback never stales.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const regenerate = useCallback(() => setTick((t) => t + 1), []);

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

    // Default to dataurl for browser usage if no format specified.
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
  }, [optionsKey, enabled, tick]);

  return {
    qrCode,
    loading,
    isIdle: !enabled,
    error,
    regenerate,
  };
}

// ─── Component types ─────────────────────────────────────────────────────────

/** Shared props for both `QRCode` and `QRCodeSVG` components. */
interface QRCodeBaseProps {
  /** Content to encode (string treated as URL, or a typed content object). */
  content: QRCodeOptions['content'];
  /** Image width/height in pixels. @default 256 */
  size?: number;
  /** Quiet-zone margin in modules. @default 4 */
  margin?: number;
  /** Foreground colour (CSS colour string). @default '#000000' */
  darkColor?: string;
  /** Background colour (CSS colour string). @default '#ffffff' */
  lightColor?: string;
  /** Error correction level. @default 'M' */
  errorCorrectionLevel?: QRCodeOptions['errorCorrectionLevel'];
  /** Defer generation until `true`. @default true */
  enabled?: boolean;
  /** Custom loading placeholder. */
  loading?: ReactNode;
  /** Render function called when generation fails. */
  onError?: (error: Error) => ReactNode;
}

/** Props for the `<QRCode>` component (renders an `<img>`). */
export interface QRCodeProps
  extends QRCodeBaseProps,
    Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'content' | 'loading' | 'onError'> {}

/** Props for the `<QRCodeSVG>` component (renders inline SVG). */
export interface QRCodeSVGProps
  extends QRCodeBaseProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'content' | 'onError'> {}

// ─── <QRCode> component (data-URL img) ──────────────────────────────────────

/**
 * Drop-in QR code image component.
 *
 * Renders an `<img>` with a data-URL `src`. Supports all standard `<img>`
 * HTML attributes (className, style, onClick …).
 *
 * @example
 * ```tsx
 * <QRCode content="https://example.com" size={200} className="shadow rounded-lg" />
 * ```
 */
export const QRCode = forwardRef<HTMLImageElement, QRCodeProps>(function QRCode(
  {
    content,
    size = 256,
    margin,
    darkColor,
    lightColor,
    errorCorrectionLevel,
    enabled,
    loading: loadingSlot,
    onError,
    alt = 'QR Code',
    ...imgProps
  },
  ref,
) {
  const {
    qrCode,
    loading,
    error,
  } = useQRCode({
    content,
    format: 'dataurl' as OutputFormat,
    size,
    margin,
    darkColor,
    lightColor,
    errorCorrectionLevel,
    enabled,
  });

  if (loading) return <>{loadingSlot ?? null}</>;
  if (error) return <>{onError?.(error) ?? null}</>;
  if (!qrCode) return null;

  return (
    <img
      ref={ref}
      src={qrCode.data as string}
      alt={alt}
      width={size}
      height={size}
      {...imgProps}
    />
  );
});

// ─── <QRCodeSVG> component (inline SVG) ─────────────────────────────────────

/**
 * Inline SVG QR code component.
 *
 * Generates SVG markup and injects it with `dangerouslySetInnerHTML`.
 * This makes the QR code styleable via CSS and avoids an extra image
 * decode step. Supports all standard `<div>` HTML attributes.
 *
 * @example
 * ```tsx
 * <QRCodeSVG
 *   content="https://example.com"
 *   darkColor="#4f46e5"
 *   className="w-48 h-48"
 * />
 * ```
 */
export const QRCodeSVG = forwardRef<HTMLDivElement, QRCodeSVGProps>(function QRCodeSVG(
  {
    content,
    size = 256,
    margin,
    darkColor,
    lightColor,
    errorCorrectionLevel,
    enabled,
    loading: loadingSlot,
    onError,
    ...divProps
  },
  ref,
) {
  const {
    qrCode,
    loading,
    error,
  } = useQRCode({
    content,
    format: 'svg' as OutputFormat,
    size,
    margin,
    darkColor,
    lightColor,
    errorCorrectionLevel,
    enabled,
  });

  if (loading) return <>{loadingSlot ?? null}</>;
  if (error) return <>{onError?.(error) ?? null}</>;
  if (!qrCode) return null;

  return (
    <div
      ref={ref}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: qrCode.data as string }}
      {...divProps}
    />
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Produce a deterministic string key from the QR options.
 * Used as an effect dependency so generation only reruns when
 * the options *actually* change.
 */
function stableKey(opts: UseQRCodeOptions): string {
  // JSON.stringify with sorted keys ensures consistent ordering
  // regardless of how the caller constructs the object.
  const content =
    typeof opts.content === 'string'
      ? opts.content
      : JSON.stringify(opts.content, Object.keys(opts.content).sort());

  return JSON.stringify([
    content,
    opts.format,
    opts.size,
    opts.margin,
    opts.darkColor,
    opts.lightColor,
    opts.errorCorrectionLevel,
  ]);
}
