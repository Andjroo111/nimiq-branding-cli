/* Nimiq toast driver — the JS behavior for the toast-notification component.
 *
 * 12 fleet apps hand-rolled this ~10-line loop; this is the one shared driver.
 * It reuses the component's verified markup and classes EXACTLY (button.nq-toast
 * > .icon > svg, .content > .status, state modifier classes) and requires
 * toast-notification.css + nimiq-style.min.css to already be on the page —
 * `nq add toast-notification` ships all of it together, including this file.
 *
 *   toast('Payment sent', { kind: 'success' });
 *   toast('Settling…');                          // kind 'info' (blue + spinner)
 *   toast('Node unreachable', { kind: 'error', duration: 4000 });
 *
 * API: toast(message, { kind = 'info' | 'success' | 'error', duration = 2600 })
 *   - singleton: one bottom-center container, created on first call, reused after
 *   - replace-not-queue: a new call swaps the current toast, never stacks
 *   - auto-dismisses after `duration` ms; duration <= 0 means sticky (until the
 *     next toast or a click); clicking the toast always dismisses it
 *   - container is role="status" aria-live="polite" — swapped text is announced
 *   - respects prefers-reduced-motion: no slide/fade, toasts appear instantly
 *   - returns { el, dismiss }
 *
 * Zero dependencies. Works as a classic <script src="toast.js"> and as an ESM
 * side-effect import (`import './toast.js'`): either way it attaches to
 * window.nqToast, plus window.toast when that name is still free.
 * ('warning' — the component's fourth verified state, gold + stopwatch — is
 * also accepted; unknown kinds fall back to 'info'.)
 */
(function () {
  'use strict';

  // Icons verbatim from the component's verified markup (toast-notification.html):
  // hexagon loading-spinner (info), checkmark (success), alert triangle (error),
  // stopwatch (warning). The state class picks the matching Nimiq gradient.
  var HEX_PATH = 'M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z';
  var ICONS = {
    info:
      '<svg height="48" width="54" viewBox="0 0 54 48" color="inherit" class="loading-spinner">' +
      '<path class="big-hex" d="' + HEX_PATH + '" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4" stroke-dasharray="92.5 60" />' +
      '<path class="small-hex" d="' + HEX_PATH + '" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="47.5 105" />' +
      '</svg>',
    success:
      '<svg class="nq-icon" width="74" height="74" viewBox="0 0 74 74" xmlns="http://www.w3.org/2000/svg"><path d="M71.12 1.84a4.5 4.5 0 0 0-6.28 1.04l-42.1 58.74L8.68 47.54a4.5 4.5 0 1 0-6.36 6.37l17.8 17.81a4.57 4.57 0 0 0 6.84-.56l45.2-63.03a4.5 4.5 0 0 0-1.04-6.29z" fill="currentColor" stroke="currentColor" stroke-width=".8"/></svg>',
    error:
      '<svg class="nq-icon" width="17" height="16" viewBox="0 0 17 16" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.913 13.333L9.68 1.433a1.333 1.333 0 0 0-2.362 0l-6.232 11.9a1.333 1.333 0 0 0 1.182 1.952H14.73a1.333 1.333 0 0 0 1.182-1.952zm-8.08-7.718a.667.667 0 0 1 1.334 0v4a.667.667 0 1 1-1.334 0v-4zm.682 7.674h.018a.983.983 0 0 0 .967-1.022 1.018 1.018 0 0 0-1.016-.978h-.019a.984.984 0 0 0-.965 1.02c.02.546.468.978 1.015.98z" fill="currentColor"/></svg>',
    warning:
      '<svg class="nq-icon" width="98" height="123" viewBox="0 0 98 123" xmlns="http://www.w3.org/2000/svg"><path d="M85.7 42.3l8-8a5.1 5.1 0 1 0-7.3-7.2l-8.2 8.2c-7-5.2-15.4-8.5-24-9.4V10.3h10.2a5.1 5.1 0 0 0 0-10.3H33.6a5.1 5.1 0 0 0 0 10.3H44v15.6a48.7 48.7 0 1 0 41.8 16.4zM49 112.8a38.4 38.4 0 1 1 0-77 38.4 38.4 0 0 1 0 77z M54.2 48.6a5.1 5.1 0 0 0-10.3 0V74a5.2 5.2 0 0 0 5.2 5.1 5.1 5.1 0 0 0 5-5V48.5z" fill="currentColor"/></svg>',
  };
  var KIND_CLASSES = ['nq-toast--success', 'nq-toast--error', 'nq-toast--warning'];

  // Driver-owned page chrome: host placement (bottom-center) + enter/leave motion.
  // The component CSS stays untouched — it positions a lone .nq-toast bottom-right
  // and explicitly sanctions overriding position/right/bottom when embedding.
  var HOST_CSS =
    '.nq-toast-host{position:fixed;left:50%;bottom:3rem;transform:translateX(-50%);z-index:1000;pointer-events:none;}' +
    '.nq-toast-host .nq-toast{position:static;right:auto;bottom:auto;pointer-events:auto;' +
    'opacity:0;visibility:hidden;transform:translateY(1.5rem);' +
    'transition:opacity 300ms cubic-bezier(0.25,0,0,1),transform 300ms cubic-bezier(0.25,0,0,1),visibility 0s linear 300ms;}' +
    '.nq-toast-host .nq-toast.nq-toast--shown{opacity:1;visibility:visible;transform:none;transition-delay:0s;}' +
    '@media (max-width: 768px){.nq-toast-host{bottom:1.5rem;}}' +
    '@media (prefers-reduced-motion: reduce){.nq-toast-host .nq-toast{transition:none;transform:none;}}';

  var host = null;
  var el = null;
  var hideTimer = 0;

  function ensureDom() {
    if (host && host.isConnected) return;
    if (!document.getElementById('nq-toast-driver-style')) {
      var style = document.createElement('style');
      style.id = 'nq-toast-driver-style';
      style.textContent = HOST_CSS;
      document.head.appendChild(style);
    }
    host = document.createElement('div');
    host.className = 'nq-toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');

    // The component's verified markup: a <button class="nq-toast"> holding
    // .icon (built-in svg) and .content > .status (the bold status line).
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'nq-toast';
    el.innerHTML = '<div class="icon"></div><div class="content"><div class="status"></div></div>';
    el.addEventListener('click', dismiss);

    host.appendChild(el);
    document.body.appendChild(host);
  }

  function dismiss() {
    clearTimeout(hideTimer);
    hideTimer = 0;
    if (el) el.classList.remove('nq-toast--shown');
  }

  function toast(message, opts) {
    opts = opts || {};
    var kind = Object.prototype.hasOwnProperty.call(ICONS, opts.kind) ? opts.kind : 'info';
    var duration = typeof opts.duration === 'number' ? opts.duration : 2600;

    ensureDom();
    clearTimeout(hideTimer);
    hideTimer = 0;

    el.classList.remove.apply(el.classList, KIND_CLASSES);
    if (kind !== 'info') el.classList.add('nq-toast--' + kind);
    el.querySelector('.icon').innerHTML = ICONS[kind];
    el.querySelector('.status').textContent = String(message);
    el.classList.add('nq-toast--shown');

    if (duration > 0 && duration !== Infinity) {
      hideTimer = setTimeout(dismiss, duration);
    }
    return { el: el, dismiss: dismiss };
  }

  toast.dismiss = dismiss;

  if (typeof window !== 'undefined') {
    window.nqToast = toast;
    if (window.toast === undefined) window.toast = toast;
  }
})();
