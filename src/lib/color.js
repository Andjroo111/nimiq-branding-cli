/** Color math: parsing, distance, and WCAG contrast. */

export function parseHex(input) {
  if (typeof input !== 'string') return null;
  let hex = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }) {
  const c = (n) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function toRgbString({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Relative luminance per WCAG 2.x. */
export function luminance({ r, g, b }) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two parsed colors, 1..21. */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function wcagLevel(ratio, { largeText = false } = {}) {
  const aa = largeText ? 3 : 4.5;
  const aaa = largeText ? 4.5 : 7;
  if (ratio >= aaa) return 'AAA';
  if (ratio >= aa) return 'AA';
  return 'fail';
}

/** Euclidean RGB distance — good enough to rank brand-color proximity. */
export function distance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/**
 * Find the nearest color in `palette` ({ name: '#hex' }) to `target`.
 * Returns { name, hex, distance } sorted ascending; `count` entries.
 */
export function nearest(target, palette, count = 1) {
  return Object.entries(palette)
    .map(([name, hex]) => ({ name, hex, distance: distance(target, parseHex(hex)) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}
