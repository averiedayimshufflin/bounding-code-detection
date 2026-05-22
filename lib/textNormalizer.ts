// Default example codes shown when the app first opens.
export const DEFAULT_TARGET_CODES: readonly string[] = [
  'LF1',
  'LF2',
  'LF3',
  'LF4',
  'LF5',
  'LF6',
  'LF7-X',
  'LF8',
  'LF9',
  'LF10',
  'LF11',
  'LF12',
  'LF13',
  'LF14',
  'LF15',
] as const;

const CODE_COLOUR_OVERRIDES: Record<string, string> = {
  LF1: '#3b82f6',
  LF2: '#8b5cf6',
  LF3: '#10b981',
  LF4: '#f59e0b',
  LF5: '#ef4444',
  LF6: '#06b6d4',
  'LF7-X': '#f97316',
  LF8: '#84cc16',
  LF9: '#e879f9',
  LF10: '#38bdf8',
  LF11: '#fb7185',
  LF12: '#a78bfa',
  LF13: '#34d399',
  LF14: '#fbbf24',
  LF15: '#60a5fa',
};

const CODE_COLOUR_PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#e879f9',
  '#38bdf8',
  '#fb7185',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#60a5fa',
];

/**
 * Normalise raw OCR text and correct common mistakes for LF-style codes.
 */
export function normalizeOCRText(raw: string): string {
  let t = raw.trim().toUpperCase();

  // Strip surrounding punctuation that OCR often attaches
  t = t.replace(/^[^A-Z0-9]+|[^A-Z0-9\-X]+$/g, '');

  // Common single-character substitutions
  t = t.replace(/\bLFI\b/g, 'LF1');    // I → 1
  t = t.replace(/\bLF\|\b/g, 'LF1');   // | → 1
  t = t.replace(/\bLFl\b/gi, 'LF1');   // lowercase l → 1
  t = t.replace(/\bLF1O\b/g, 'LF10');  // O → 0 (LF10 misread)
  t = t.replace(/\bLFIO\b/g, 'LF10');  // I+O → 10
  t = t.replace(/\bLFl0\b/gi, 'LF10'); // l+0 → 10

  // LF7-X variants
  t = t.replace(/\bLF7X\b/g, 'LF7-X');
  t = t.replace(/\bLF7[–—]X\b/g, 'LF7-X');
  t = t.replace(/\bLF7\s*-\s*X\b/g, 'LF7-X');

  // Stray spaces between LF and number
  t = t.replace(/\bLF\s+(\d{1,2})\b/g, 'LF$1');

  return t;
}

export function normalizeTargetCode(raw: string): string {
  return normalizeOCRText(raw).replace(/\s+/g, '');
}

export function parseTargetCodes(input: string): string[] {
  const codes = input
    .split(/[\s,;]+/)
    .map(normalizeTargetCode)
    .filter(Boolean);

  return Array.from(new Set(codes));
}

/**
 * Try to match a raw OCR token to one of the user's target codes.
 * Returns the matched canonical code, or null.
 */
export function matchTargetCode(
  raw: string,
  targetCodes: readonly string[] = DEFAULT_TARGET_CODES,
): string | null {
  const normalised = normalizeOCRText(raw);
  const normalisedCompact = normalised.replace(/\s+/g, '');
  const targetSet = new Set(targetCodes.map(normalizeTargetCode));

  // Exact match
  if (targetSet.has(normalisedCompact)) return normalisedCompact;

  // Scan inside longer strings, for example "(LF3)" -> "LF3".
  for (const code of targetCodes.map(normalizeTargetCode)) {
    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use word-boundary-like anchors because \b does not work with hyphens.
    const re = new RegExp(`(?<![A-Z0-9])(${escaped})(?![A-Z0-9])`, 'i');
    if (re.test(normalised)) return code;
  }

  return null;
}

/**
 * Return a stable colour for each code (for chips and overlays).
 */
export function codeColour(code: string): string {
  const normalised = normalizeTargetCode(code);
  if (CODE_COLOUR_OVERRIDES[normalised]) {
    return CODE_COLOUR_OVERRIDES[normalised];
  }

  let hash = 0;
  for (let i = 0; i < normalised.length; i++) {
    hash = (hash * 31 + normalised.charCodeAt(i)) >>> 0;
  }

  return CODE_COLOUR_PALETTE[hash % CODE_COLOUR_PALETTE.length];
}
