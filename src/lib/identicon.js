/**
 * Nimiq identicon parameters — an exact port of the official algorithm
 * from @nimiq/identicons (github.com/nimiq/identicons): the chaos hash,
 * the color tables, the collision-avoidance rules, and the per-section
 * asset indices. Given the same input, this derives the same colors and
 * shape indices as the official library.
 */

const NAMES = ['orange', 'red', 'gold', 'indigo', 'blue', 'purple', 'teal', 'pink', 'green', 'brown'];

const MAIN_COLORS = ['#FC8702', '#D94432', '#E9B213', '#1A5493', '#0582CA', '#5961A8', '#21BCA5', '#FA7268', '#88B04B', '#795548'];

const BACKGROUND_COLORS = ['#FC8702', '#D94432', '#E9B213', '#1F2348', '#0582CA', '#5F4B8B', '#21BCA5', '#FA7268', '#88B04B', '#795548'];

const ASSET_COUNT = 21;

function chaosHash(number) {
  const k = 3.569956786876;
  let an = 1 / number;
  for (let i = 0; i < 100; i++) {
    an = (1 - an) * an * k;
  }
  return an;
}

export function makeHash(text) {
  const fullHash = ('' + String(text)
    .split('')
    .map((c) => Number(c.charCodeAt(0)) + 3)
    .reduce((a, e) => a * (1 - a) * chaosHash(e), 0.5))
    .split('')
    .reduce((a, e) => e + a, '');

  const hash = fullHash
    .replace('.', fullHash[5])
    .substr(4, 17);

  return hash.padEnd(13, fullHash[5]);
}

function assetIndex(digits) {
  return (Number(digits) % ASSET_COUNT) + 1;
}

/** Official collision-avoidance between main, background and accent. */
function resolveColorIndices(main, background, accent) {
  if (main === background) main = (main + 1) % 10;
  while (accent === main || accent === background) accent = (accent + 1) % 10;
  return { main, background, accent };
}

/**
 * Derive the full identicon parameter set for an input (address, name, …).
 * Section indices (1..21) match the official SVG asset numbering, so they
 * can be fed straight into @nimiq/identicons assets.
 */
export function identicon(text) {
  const hash = makeHash(text);
  const indices = resolveColorIndices(
    Number(hash[0]),
    Number(hash[2]),
    Number(hash[11]),
  );

  return {
    input: String(text),
    hash,
    colors: {
      main: { name: NAMES[indices.main], hex: MAIN_COLORS[indices.main] },
      background: { name: NAMES[indices.background], hex: BACKGROUND_COLORS[indices.background] },
      accent: { name: NAMES[indices.accent], hex: MAIN_COLORS[indices.accent] },
    },
    sections: {
      face: assetIndex(hash[3] + hash[4]),
      top: assetIndex(hash[5] + hash[6]),
      side: assetIndex(hash[7] + hash[8]),
      bottom: assetIndex(hash[9] + hash[10]),
    },
  };
}
