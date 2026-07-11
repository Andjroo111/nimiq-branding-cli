/* app-header language menu driver: a small vanilla controller for the
   built-in language selector (the nimiq.school NavBar pattern), following the
   connect-wallet-pill driver precedent — dependency free, one integration
   point, markup stays in HTML.

   The markup owns the languages: the trigger shows the current language's
   flag-hex, the [hidden] list holds one .app-header-lang-option per language
   (flag + native name, data-lang="de"). The driver wires open/close
   (click, outside click, Escape), selection (aria-selected + .current, the
   picked option's flag is cloned into the trigger with its ids re-suffixed so
   no clipPath/gradient id ever collides — rule 3), and change notification.

       import { initLanguageMenu } from './app-header.js';
       const menu = initLanguageMenu(document.querySelector('.app-header-lang'), {
           onChange: (id) => setLanguage(id),
       });

   Server-rendered closed headers may omit the list element entirely (the
   NavBar v-if pattern); the driver is only needed where the menu opens. */

/** Clone a flag svg and re-suffix every id (and its url(#)/href references)
 *  so the clone never collides with the original (rule 3). */
function cloneFlagSvg(svg, suffix) {
    const clone = svg.cloneNode(true);
    for (const node of clone.querySelectorAll('[id]')) {
        const old = node.id;
        const next = old + suffix;
        node.id = next;
        for (const ref of [clone, ...clone.querySelectorAll('*')]) {
            for (const attr of ['clip-path', 'mask', 'fill', 'stroke', 'filter']) {
                if (ref.getAttribute(attr) === `url(#${old})`) ref.setAttribute(attr, `url(#${next})`);
            }
            if (ref.getAttribute('href') === `#${old}`) ref.setAttribute('href', `#${next}`);
            if (ref.getAttribute('xlink:href') === `#${old}`) ref.setAttribute('xlink:href', `#${next}`);
        }
    }
    return clone;
}

/**
 * Mount the driver on the .app-header-lang root (trigger button + list).
 *
 * options:
 *   onChange?  (langId) => void   called after a pick; also dispatched as a
 *                                 'change' CustomEvent (detail = langId) on el
 *
 * returns { value, open, close, select, destroy }
 */
export function initLanguageMenu(el, options = {}) {
    if (!el) throw new Error('initLanguageMenu: el is required');
    const btn = el.querySelector('.app-header-lang-btn');
    const list = el.querySelector('.app-header-lang-list');
    if (!btn || !list) throw new Error('initLanguageMenu: needs .app-header-lang-btn and .app-header-lang-list');

    let value = list.querySelector('.app-header-lang-option[aria-selected="true"]')?.dataset.lang ?? null;

    function isOpen() { return !list.hidden; }
    function open() {
        list.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
        list.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    }

    function select(langId) {
        const option = list.querySelector(`.app-header-lang-option[data-lang="${langId}"]`);
        if (!option) return;
        for (const o of list.querySelectorAll('.app-header-lang-option')) {
            const picked = o === option;
            o.setAttribute('aria-selected', picked ? 'true' : 'false');
            o.classList.toggle('current', picked);
        }
        const flag = option.querySelector('.app-header-lang-flag svg');
        const slot = btn.querySelector('.app-header-lang-flag');
        if (flag && slot) {
            slot.textContent = '';
            slot.append(cloneFlagSvg(flag, '-current'));
        }
        value = langId;
        close();
        el.dispatchEvent(new CustomEvent('change', { detail: langId }));
        if (options.onChange) options.onChange(langId);
    }

    function onBtnClick() { isOpen() ? close() : open(); }
    function onListClick(e) {
        const option = e.target.closest('.app-header-lang-option');
        if (option && list.contains(option)) select(option.dataset.lang);
    }
    function onDocPointerDown(e) { if (isOpen() && !el.contains(e.target)) close(); }
    function onDocKeyDown(e) {
        if (e.key === 'Escape' && isOpen()) {
            close();
            btn.focus();
        }
    }

    btn.addEventListener('click', onBtnClick);
    list.addEventListener('click', onListClick);
    document.addEventListener('pointerdown', onDocPointerDown, true);
    document.addEventListener('keydown', onDocKeyDown, true);
    close();

    return {
        get value() { return value; },
        open,
        close,
        select,
        destroy() {
            btn.removeEventListener('click', onBtnClick);
            list.removeEventListener('click', onListClick);
            document.removeEventListener('pointerdown', onDocPointerDown, true);
            document.removeEventListener('keydown', onDocKeyDown, true);
        },
    };
}
