/**
 * Nimiq brand design tokens.
 *
 * Sourced from the official Nimiq Style framework (@nimiq/style,
 * github.com/nimiq/nimiq-style) and nimiq.com. These values are the
 * single source of truth for every command in this CLI.
 */

export const COLORS = {
  'nimiq-blue': { hex: '#1F2348', role: 'Primary brand color. Headlines, dark backgrounds, the Nimiq identity.' },
  'nimiq-light-blue': { hex: '#0582CA', role: 'Interactive elements: links, primary buttons, highlights.' },
  'nimiq-gold': { hex: '#E9B213', role: 'The NIM coin color. Value, rewards, premium accents.' },
  'nimiq-green': { hex: '#21BCA5', role: 'Success states and confirmations.' },
  'nimiq-orange': { hex: '#FC8702', role: 'Warnings and attention.' },
  'nimiq-red': { hex: '#D94432', role: 'Errors and destructive actions.' },
  'nimiq-purple': { hex: '#5F4B8B', role: 'Secondary accent.' },
  'nimiq-pink': { hex: '#FA7268', role: 'Secondary accent.' },
  'nimiq-light-green': { hex: '#88B04B', role: 'Secondary accent.' },
  'nimiq-brown': { hex: '#795548', role: 'Secondary accent.' },
  'nimiq-gray': { hex: '#F4F4F4', role: 'Neutral surfaces and dividers.' },
  'nimiq-light-gray': { hex: '#FAFAFA', role: 'Page backgrounds.' },
  'nimiq-white': { hex: '#FFFFFF', role: 'Text on dark, light surfaces.' },
};

export const DARKENED = {
  'nimiq-blue-darkened': '#151833',
  'nimiq-light-blue-darkened': '#0071C3',
  'nimiq-gold-darkened': '#E5A212',
  'nimiq-green-darkened': '#20B29E',
  'nimiq-orange-darkened': '#FC7500',
  'nimiq-red-darkened': '#D13030',
};

export const ON_DARK = {
  'nimiq-light-blue-on-dark': '#0CA6FE',
  'nimiq-red-on-dark': '#FF5C48',
};

/**
 * Signature Nimiq gradients: radial, anchored at the bottom-right corner
 * ("100% 100% at bottom right" in the official framework).
 */
export const GRADIENTS = {
  'nimiq-blue': { from: '#260133', to: '#1F2348' },
  'nimiq-light-blue': { from: '#265DD7', to: '#0582CA' },
  'nimiq-gold': { from: '#EC991C', to: '#E9B213' },
  'nimiq-green': { from: '#41A38E', to: '#21BCA5' },
  'nimiq-orange': { from: '#FD6216', to: '#FC8702' },
  'nimiq-red': { from: '#CC3047', to: '#D94432' },
  'nimiq-purple': { from: '#4D4C96', to: '#5F4B8B' },
  'nimiq-pink': { from: '#E0516B', to: '#FA7268' },
  'nimiq-light-green': { from: '#70B069', to: '#88B04B' },
  'nimiq-brown': { from: '#724147', to: '#795548' },
};

export const TYPOGRAPHY = {
  baseUnit: '8px (1rem = 8px in the Nimiq Style framework)',
  primaryFont: {
    family: 'Muli',
    stack: "Muli, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
    weights: { regular: 400, semibold: 600, bold: 700 },
    use: 'All UI and marketing copy.',
  },
  monospaceFont: {
    family: 'Fira Mono',
    use: 'Account addresses and numbers only.',
  },
  scale: {
    h1: '3rem (24px)',
    h2: '2.5rem (20px)',
    h3: '2rem (16px)',
    body: '2.25rem (18px)',
    text: '2rem (16px)',
    small: '1.75rem (14px)',
    label: '1.75rem (14px), uppercase, letter-spacing',
  },
};

/**
 * Nimiq's design principles, distilled from nimiq.com and the Nimiq
 * Style framework. These are the foundation of this tool: every command
 * either expresses or enforces one of them.
 */
export const PRINCIPLES = [
  {
    name: 'Accessible to everyone',
    summary: 'Easy to use, intuitively designed and free of tech jargon.',
    practice: 'Plain language in copy. WCAG-compliant contrast. No crypto slang in user-facing text. (Enforced by: nimiq-brand contrast, nimiq-brand check)',
  },
  {
    name: 'Independence by design',
    summary: 'Nimiq gives independence back to the individual; design should put the user in control.',
    practice: 'Self-explanatory interfaces, no dark patterns, user data stays with the user.',
  },
  {
    name: 'Simplicity over complexity',
    summary: 'One base unit (8px), one primary typeface (Muli), one restrained palette.',
    practice: 'Stick to the token scale. If a value is not a token, question it. (Enforced by: nimiq-brand check, nimiq-brand tokens)',
  },
  {
    name: 'Light, fast, sustainable',
    summary: 'A Nimiq transaction uses less energy than an email; the brand should feel equally light.',
    practice: 'Lean assets, fast load, no heavy dependencies. This CLI itself has zero runtime dependencies.',
  },
  {
    name: 'Open and community-driven',
    summary: 'Open source by default, built with a worldwide community.',
    practice: 'Tokens are exportable to any format so the community can build with them. (Enforced by: nimiq-brand tokens)',
  },
];

export const BRAND = {
  name: 'Nimiq',
  tagline: 'Universal money for independent individuals',
  ticker: 'NIM',
  links: {
    website: 'https://www.nimiq.com',
    style: 'https://github.com/nimiq/nimiq-style',
    designs: 'https://github.com/nimiq/designs',
  },
};
