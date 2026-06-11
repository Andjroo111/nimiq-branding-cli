/** Terminal rendering helpers: truecolor ANSI swatches and layout. */

import { parseHex, luminance } from './color.js';

const ansiEnabled = () =>
  process.stdout.isTTY !== false && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb';

export function fg(hex, text) {
  if (!ansiEnabled()) return text;
  const { r, g, b } = parseHex(hex);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

export function bg(hex, text) {
  if (!ansiEnabled()) return text;
  const c = parseHex(hex);
  // Readable label color chosen by luminance, per the accessibility principle.
  const label = luminance(c) > 0.4 ? '\x1b[38;2;31;35;72m' : '\x1b[38;2;255;255;255m';
  return `\x1b[48;2;${c.r};${c.g};${c.b}m${label}${text}\x1b[0m`;
}

export function bold(text) {
  return ansiEnabled() ? `\x1b[1m${text}\x1b[0m` : text;
}

export function dim(text) {
  return ansiEnabled() ? `\x1b[2m${text}\x1b[0m` : text;
}

export function swatch(hex, width = 6) {
  return bg(hex, ' '.repeat(width));
}

/** Horizontal gradient bar interpolating from..to, `width` cells wide. */
export function gradientBar(from, to, width = 32) {
  if (!ansiEnabled()) return `${from} → ${to}`;
  const a = parseHex(from);
  const b = parseHex(to);
  let out = '';
  for (let i = 0; i < width; i++) {
    const t = width === 1 ? 0 : i / (width - 1);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    out += `\x1b[48;2;${r};${g};${bl}m \x1b[0m`;
  }
  return out;
}

export function pad(text, width) {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}
