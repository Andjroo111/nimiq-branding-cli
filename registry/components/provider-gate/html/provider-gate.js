/* provider-gate driver: a small vanilla renderer for the environment and
   wallet-status gate. One element, two forms:

   - STRIP (default): the non-blocking one-line banner, rendered for every
     state. Fixed canned copy + semantic color per state (localizable via
     options.labels).
   - WALL (options.wall: true): for states that BLOCK (open-in-wallet), the
     element renders the full tipjar-style handoff wall instead: signet +
     headline + QR deep link + open button + copy-link fallback. Non-blocking
     states still render the strip. Typical use: wall on desktop, strip on
     mobile (where the deep link button works directly).

       import { initProviderGate } from './provider-gate.js';
       const gate = initProviderGate(el, {
           detect: () => (detectModeSync() === 'miniapp' ? 'connected' : 'open-in-wallet'),
           wall: !navigator.userAgent.includes('Mobi'),
       });
       // later, e.g. after nimiqPay.connect() resolves { fake: true }:
       gate.setState('demo');

   THE APP-SHELL STATE MAPPING (nimiq-app-shell src/wallet/detect.ts and the
   tipjar onboard-core probe). No hard dependency: the detect callback is the
   only seam, so any app can inject its own detection.

       detectModeSync() === 'miniapp'   -> 'connected'       (host or provider present)
       detectModeSync() === 'hub'       -> 'open-in-wallet'  (standalone browser)
       probe.fake (nimiqPay.connect())  -> 'demo'            (the offline test loop)
       app config: mock settlement      -> 'simulated'
       app config: network === testnet  -> 'testnet'

   Suggested precedence when several apply: demo > simulated > open-in-wallet
   > testnet > connected. detect returns ONE state; null/undefined hides the
   gate entirely.

   QR: load the pinned qr-creator@1.0.0 (script tag or bundler; see the
   registry qr-code component) and the wall draws the deep link; without it
   the QR tile is simply omitted. */

/** The five gate states (exported so callers and tests share the constants). */
export const GATE_STATES = ['demo', 'open-in-wallet', 'connected', 'testnet', 'simulated'];

/** The state that blocks (renders the wall when options.wall is set). */
const BLOCKING = new Set(['open-in-wallet']);

/** The deep link that reopens a page INSIDE Nimiq Pay (where window.nimiq is
 *  injected). Same form as the tipjar fleet app: nimiqpay://miniapp?url=<page>. */
export function nimiqPayDeepLink(pageUrl) {
    return 'nimiqpay://miniapp?url=' + encodeURIComponent(String(pageUrl || ''));
}

/** Canned strip copy: sentence case; short status labels carry no period,
 *  running sentences do (rule 16). Override via options.labels. */
const DEFAULT_LABELS = {
    demo: 'Demo mode. No real payments.',
    openInWallet: 'Open inside Nimiq Pay for live payments',
    connected: 'Connected to Nimiq Pay',
    testnet: 'Testnet. Coins have no value.',
    simulated: 'Simulated payments. No coins move.',
    open: 'Open in Nimiq Pay',
    wallTitle: 'Open in Nimiq Pay',
    wallMessage: 'Live payments need Nimiq Pay. Scan the code with your phone or open this page inside the app.',
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
};

const COPY_KEY = {
    'demo': 'demo',
    'open-in-wallet': 'openInWallet',
    'connected': 'connected',
    'testnet': 'testnet',
    'simulated': 'simulated',
};

// Unique signet gradient id per wall instance (rule 3: never reuse a gradient
// id across SVGs on one page). Same counter pattern as the app-header Vue port.
let gradSeq = 0;

/**
 * Mount the driver on a container element (a plain <div>).
 *
 * options:
 *   state?     'demo' | 'open-in-wallet' | 'connected' | 'testnet' | 'simulated' | null
 *   detect?    () => state   called at init (and on refresh()); wins over state
 *   pageUrl?   the page the deep link reopens; default location.href
 *   deepLink?  full deep link override; default nimiqPayDeepLink(pageUrl)
 *   wall?      true: blocking states render the handoff wall instead of the strip
 *   labels?    partial override of the canned copy (localization)
 *
 * returns { state, setState, refresh, destroy }
 */
export function initProviderGate(el, options = {}) {
    if (!el) throw new Error('initProviderGate: el is required');

    const labels = { ...DEFAULT_LABELS, ...(options.labels || {}) };
    const pageUrl = options.pageUrl
        || (typeof location !== 'undefined' ? location.href : '');
    const deepLink = options.deepLink || nimiqPayDeepLink(pageUrl);

    let state = null;
    let copyTimer = 0;

    function span(className, text) {
        const s = document.createElement('span');
        s.className = className;
        if (text !== undefined) s.textContent = text;
        return s;
    }

    function renderStrip() {
        el.className = 'provider-gate';
        el.dataset.state = state;
        el.setAttribute('role', 'status');
        el.textContent = '';
        const icon = span('pg-icon');
        icon.setAttribute('aria-hidden', 'true');
        el.append(icon, span('pg-copy', labels[COPY_KEY[state]]));
        if (state === 'open-in-wallet' && deepLink) {
            const a = document.createElement('a');
            a.className = 'pg-action';
            a.href = deepLink;
            a.textContent = labels.open;
            el.append(a);
        }
    }

    function renderWall() {
        el.className = 'provider-gate-wall';
        delete el.dataset.state;
        el.removeAttribute('role');
        el.textContent = '';

        const body = document.createElement('div');
        body.className = 'pgw-body';

        // Verbatim Nimiq hexagon (universal ground), unique gradient id.
        const gradId = 'nq-provider-gate-hex-grad-' + (++gradSeq);
        body.insertAdjacentHTML('beforeend',
            '<svg class="pgw-signet" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 18" role="img" aria-label="Nimiq">'
            + '<path fill="url(#' + gradId + ')" d="M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688"/>'
            + '<defs><radialGradient id="' + gradId + '" cx="0" cy="0" r="1" gradientTransform="matrix(20.1956 0 0 20.2552 15.188 17.766)" gradientUnits="userSpaceOnUse">'
            + '<stop stop-color="#ec991c"/><stop offset="1" stop-color="#e9b213"/></radialGradient></defs></svg>');

        const title = document.createElement('h2');
        title.className = 'pgw-title';
        title.textContent = labels.wallTitle;

        const message = document.createElement('p');
        message.className = 'pgw-message';
        message.textContent = labels.wallMessage;
        body.append(title, message);

        // QR deep link (the registry qr-code recipe) when qr-creator is loaded.
        const qrc = typeof window !== 'undefined' ? window.QrCreator : null;
        if (qrc && deepLink) {
            const tile = document.createElement('div');
            tile.className = 'pgw-qr';
            const canvas = document.createElement('canvas');
            canvas.width = 180;
            canvas.height = 180;
            canvas.setAttribute('aria-label', 'QR code that opens this page in Nimiq Pay');
            tile.append(canvas);
            body.append(tile);
            qrc.render({
                text: deepLink,
                radius: 0.5,
                ecLevel: 'M',
                fill: {
                    type: 'radial-gradient',
                    position: [1, 1, 0, 1, 1, Math.sqrt(2)],
                    colorStops: [[0, '#265DD7'], [1, '#0582CA']],
                },
                background: null,
                size: 180,
            }, canvas);
        }

        const action = document.createElement('div');
        action.className = 'pgw-action';
        const primary = document.createElement('a');
        primary.className = 'nq-button light-blue';
        primary.href = deepLink;
        primary.textContent = labels.open;
        action.append(primary);
        body.append(action);

        // Copy-link fallback: copies the plain page URL (sendable anywhere).
        const secondary = document.createElement('p');
        secondary.className = 'pgw-secondary';
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'pgw-link';
        copyBtn.textContent = labels.copyLink;
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(pageUrl);
                copyBtn.textContent = labels.linkCopied;
                clearTimeout(copyTimer);
                copyTimer = setTimeout(() => { copyBtn.textContent = labels.copyLink; }, 2000);
            } catch { /* clipboard unavailable (http, permissions): leave the label */ }
        });
        secondary.append(copyBtn);
        body.append(secondary);

        el.append(body);
    }

    function render() {
        clearTimeout(copyTimer);
        if (!state) {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        el.hidden = false;
        if (options.wall && BLOCKING.has(state)) renderWall();
        else renderStrip();
    }

    function setState(next) {
        if (next && !GATE_STATES.includes(next)) {
            throw new Error('provider-gate: unknown state "' + next + '"');
        }
        state = next || null;
        render();
    }

    /** Re-run the detect callback (e.g. after a provider injects late). */
    function refresh() {
        if (typeof options.detect === 'function') setState(options.detect());
    }

    if (typeof options.detect === 'function') state = options.detect() || null;
    else state = options.state || null;
    if (state && !GATE_STATES.includes(state)) {
        throw new Error('provider-gate: unknown state "' + state + '"');
    }
    render();

    return {
        get state() { return state; },
        setState,
        refresh,
        destroy() {
            clearTimeout(copyTimer);
            el.textContent = '';
            el.hidden = false;
            el.className = '';
            delete el.dataset.state;
            el.removeAttribute('role');
        },
    };
}
