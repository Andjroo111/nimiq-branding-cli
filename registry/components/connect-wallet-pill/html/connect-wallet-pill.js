/* connect-wallet-pill driver: a small vanilla state machine for the pill.
   States: connect -> busy -> connected <-> confirm -> connect.

   The connect callback is the only integration point. It is designed to sit
   directly on the fleet-canonical app-shell seam (nimiq-app-shell createWallet),
   but any async function returning { address, label?, balance? } works:

       import { initConnectPill } from './connect-wallet-pill.js';
       const wallet = createWallet({ appName: 'My app' });
       const pill = initConnectPill(el, {
           connect: () => wallet.connect(),          // resolves Account or null
           onDisconnect: () => wallet.disconnect(),
       });
       wallet.onAccountChange((account) => pill.setAccount(account));

   A connect that resolves null (the app-shell mobile redirect path, or the
   user closing the popup) simply returns the pill to its idle state.

   Identicons: load @nimiq/iqons yourself (pinned CDN module or bundler) and
   expose it as window.Iqons, or pass options.identicon(address) returning a
   data-url. Without either, the chip shows the house hexagon placeholder. */

// The house identicon placeholder (the same data-url the identicon and
// swap-balance-bar snippets start on) shown until the real iqon resolves.
const PLACEHOLDER =
    'data:image/svg+xml,<svg width="64" height="64" viewBox="0 -4 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity=".1" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="url(%23cwp_placeholder_radial)"/><defs><radialGradient id="cwp_placeholder_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-63.0033 0 0 -56 63 56)"><stop stop-color="%23260133"/><stop offset="1" stop-color="%231F2348"/></radialGradient></defs></svg>';

// CircleSpinner arc geometry (upstream @nimiq/vue-components CircleSpinner.vue),
// recolored via currentColor so it reads on both surfaces.
const SPINNER_SVG =
    '<svg class="cwp-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="14" height="14" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
    + '<path stroke="currentColor" d="M9,1c4.42,0,8,3.58,8,8"/>'
    + '<path stroke="currentColor" opacity=".3" d="M4.27,2.56C2.29,4.01,1,6.35,1,9c0,4.42,3.58,8,8,8c2.65,0,4.99-1.29,6.44-3.27"/>'
    + '</svg>';

/** Space-format a NIM address into 4-char blocks. */
export function formatAddress(address) {
    const clean = String(address).replace(/\s+/g, '').toUpperCase();
    return (clean.match(/.{1,4}/g) || [clean]).join(' ');
}

/** Truncate a formatted address for the chip: first 7 and last 5 characters
 *  around an ellipsis, whitespace collapsed at the seam (NQ87 JY...CVN2). */
export function truncateAddress(address) {
    const formatted = formatAddress(address);
    if (formatted.length <= 14) return formatted;
    return (formatted.slice(0, 7) + '…' + formatted.slice(-5)).replace(/\s*…\s*/, '…');
}

/** Default NIM balance formatting: thin-space thousands grouping. */
function formatNim(balance) {
    if (typeof balance === 'string') return balance;
    const text = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(balance);
    return text.replace(/,/g, ' ') + ' NIM';
}

/**
 * Mount the driver on a <button class="connect-wallet-pill"> element.
 *
 * options:
 *   connect        async () => ({ address, label?, balance? } | null)  REQUIRED
 *   onDisconnect?  () => void
 *   onError?       (err) => void          default: console.error
 *   account?       initial account (restores a persisted session)
 *   labels?        { connect, connecting, disconnect }  for localization
 *   identicon?     async (address) => url  overrides window.Iqons
 *   formatBalance? (balance) => string     overrides the NIM default
 *
 * returns { state, account, setAccount, setBalance, disconnect, destroy }
 */
export function initConnectPill(el, options = {}) {
    if (!el) throw new Error('initConnectPill: el is required');
    if (typeof options.connect !== 'function') throw new Error('initConnectPill: options.connect must be an async function');

    const labels = {
        connect: 'Connect wallet',
        connecting: 'Connecting',
        disconnect: 'Disconnect',
        ...(options.labels || {}),
    };

    let state = 'connect';
    let account = null;
    let confirmTimer = 0;

    async function identiconUrl(address) {
        if (options.identicon) return options.identicon(address);
        const iqons = typeof window !== 'undefined' ? window.Iqons : null;
        if (iqons && typeof iqons.toDataUrl === 'function') return iqons.toDataUrl(address);
        return PLACEHOLDER;
    }

    function span(className, text) {
        const s = document.createElement('span');
        if (className) s.className = className;
        s.textContent = text;
        return s;
    }

    function render() {
        el.dataset.state = state;
        el.disabled = state === 'busy';
        if (state === 'busy') el.setAttribute('aria-busy', 'true');
        else el.removeAttribute('aria-busy');
        el.textContent = '';
        el.removeAttribute('title');

        if (state === 'connect') {
            el.append(span('cwp-label', labels.connect));
        } else if (state === 'busy') {
            el.insertAdjacentHTML('beforeend', SPINNER_SVG);
            el.append(span('cwp-label', labels.connecting));
        } else if (state === 'connected') {
            const img = document.createElement('img');
            img.className = 'cwp-identicon';
            img.alt = 'Nimiq identicon';
            img.src = PLACEHOLDER;
            const address = account.address;
            img.dataset.address = address;
            identiconUrl(address).then((url) => {
                if (url && img.isConnected && img.dataset.address === address) img.src = url;
            }).catch(() => {});
            el.append(img, span('cwp-address', truncateAddress(address)));
            if (account.balance !== undefined && account.balance !== null) {
                el.append(span('cwp-balance', (options.formatBalance || formatNim)(account.balance)));
            }
            el.title = account.label ? account.label + ' ' + formatAddress(address) : formatAddress(address);
        } else if (state === 'confirm') {
            el.append(span('cwp-label', labels.disconnect));
        }
    }

    function setState(next) {
        if (state === 'confirm') leaveConfirm();
        state = next;
        render();
        if (next === 'confirm') enterConfirm();
    }

    // Confirm affordance: first tap on the chip flips the label to Disconnect,
    // a second tap disconnects. Anything else (outside click, Escape, 4s of
    // nothing) puts the chip back. One element, no menu.
    function onDocPointerDown(e) { if (!el.contains(e.target)) setState('connected'); }
    function onDocKeyDown(e) { if (e.key === 'Escape') setState('connected'); }
    function enterConfirm() {
        confirmTimer = setTimeout(() => { if (state === 'confirm') setState('connected'); }, 4000);
        document.addEventListener('pointerdown', onDocPointerDown, true);
        document.addEventListener('keydown', onDocKeyDown, true);
    }
    function leaveConfirm() {
        clearTimeout(confirmTimer);
        document.removeEventListener('pointerdown', onDocPointerDown, true);
        document.removeEventListener('keydown', onDocKeyDown, true);
    }

    function disconnect() {
        account = null;
        setState('connect');
        if (options.onDisconnect) options.onDisconnect();
    }

    async function onClick() {
        if (state === 'connect') {
            setState('busy');
            try {
                const result = await options.connect();
                if (result && result.address) {
                    account = result;
                    setState('connected');
                } else {
                    setState('connect'); // cancelled, or a mobile redirect is in flight
                }
            } catch (err) {
                setState('connect');
                if (options.onError) options.onError(err);
                else console.error('connect-wallet-pill:', err);
            }
        } else if (state === 'connected') {
            setState('confirm');
        } else if (state === 'confirm') {
            disconnect();
        }
    }

    el.addEventListener('click', onClick);
    if (options.account && options.account.address) {
        account = options.account;
        state = 'connected';
    }
    render();

    return {
        get state() { return state; },
        get account() { return account; },
        /** Drive from outside, e.g. wallet.onAccountChange: pass an account or null. */
        setAccount(next) {
            account = next && next.address ? next : null;
            setState(account ? 'connected' : 'connect');
        },
        /** Update the balance shown on the connected chip (NIM number or preformatted string). */
        setBalance(balance) {
            if (!account) return;
            account = { ...account, balance };
            if (state === 'connected') render();
        },
        disconnect,
        destroy() {
            leaveConfirm();
            el.removeEventListener('click', onClick);
        },
    };
}
