/* corner-control driver — dependency-free ES module.
 * Owns every behavior of the locked 2026-07-23 spec: menu toggle (outside
 * click + Escape), receive view flip, Copyable copy states (blue HOLDS until
 * blur; tooltip fades at 800ms), tap-name-to-rename inline editor, accordion
 * pickers with svg-id-safe selection copies, live i18n re-wording, fiat
 * re-pricing, mini-app collapse, and graceful handoff bubbles for any seam
 * the app has not wired yet.
 *
 * Seams (all optional; unwired actions show a translated handoff bubble):
 *   connect()            -> HubApi.chooseAddress via nimiq-app-shell createWallet
 *   onboard()            -> HubApi.onboard (create-a-wallet line)
 *   onDisconnect()       -> forget the LOCAL connection (never Hub logout!)
 *   rename(label)        -> HubApi.rename: wallet-stored, follows the user
 *                           across every nimiq.* app
 *   send() / scan()      -> HubApi.checkout / qr-scanner component
 *   createCashlink()     -> HubApi.createCashlink (opt-in row)
 *   openPay(url)         -> nimiqpay://miniapp?url=<encoded> deeplink
 *   renderQr(canvas, uri)-> default: window.QrCreator (qr-creator@1.0.0,
 *                           the qr-code component's pinned lib)
 *   onLanguageChange(id) / onFiatChange(ticker)
 * Invisible Hub seams intentionally NOT surfaced here: signMessage (sign-in
 * with Nimiq) and list() (silent label refresh) — call them app-side.
 */

export const I18N = {
    en: { receive: 'Receive', send: 'Send', language: 'Language', amounts: 'Show amounts in', openpay: 'Open in Nimiq Pay', disconnect: 'Disconnect', network: 'Network', taphint: 'Tap the address to copy', copied: 'Copied', tipSend: "Opens the wallet's send flow", tipScan: 'Opens the camera scanner', connect: 'Connect wallet', onboard: 'New to Nimiq? Create a wallet', cashlink: 'Create a Cashlink', tipConnect: "Opens the wallet's account picker", tipOnboard: 'Opens wallet creation', tipCashlink: "Opens the wallet's Cashlink creator" },
    es: { receive: 'Recibir', send: 'Enviar', language: 'Idioma', amounts: 'Mostrar importes en', openpay: 'Abrir en Nimiq Pay', disconnect: 'Desconectar', network: 'Red', taphint: 'Toca la dirección para copiarla', copied: 'Copiado', tipSend: 'Abre el envío de la wallet', tipScan: 'Abre el escáner de cámara', connect: 'Conectar wallet', onboard: '¿Nuevo en Nimiq? Crea una wallet', cashlink: 'Crear un Cashlink', tipConnect: 'Abre el selector de cuentas', tipOnboard: 'Abre la creación de la wallet', tipCashlink: 'Abre el creador de Cashlinks' },
    de: { receive: 'Empfangen', send: 'Senden', language: 'Sprache', amounts: 'Beträge anzeigen in', openpay: 'In Nimiq Pay öffnen', disconnect: 'Trennen', network: 'Netzwerk', taphint: 'Adresse antippen zum Kopieren', copied: 'Kopiert', tipSend: 'Öffnet das Senden der Wallet', tipScan: 'Öffnet den Kamera-Scanner', connect: 'Wallet verbinden', onboard: 'Neu bei Nimiq? Wallet erstellen', cashlink: 'Cashlink erstellen', tipConnect: 'Öffnet die Kontoauswahl', tipOnboard: 'Öffnet die Wallet-Erstellung', tipCashlink: 'Öffnet den Cashlink-Ersteller' },
    hi: { receive: 'प्राप्त करें', send: 'भेजें', language: 'भाषा', amounts: 'राशि इसमें दिखाएँ', openpay: 'Nimiq Pay में खोलें', disconnect: 'डिस्कनेक्ट', network: 'नेटवर्क', taphint: 'कॉपी करने के लिए पते पर टैप करें', copied: 'कॉपी हो गया', tipSend: 'वॉलेट का भेजें फ़्लो खोलता है', tipScan: 'कैमरा स्कैनर खोलता है', connect: 'वॉलेट कनेक्ट करें', onboard: 'Nimiq पर नए हैं? वॉलेट बनाएँ', cashlink: 'Cashlink बनाएँ', tipConnect: 'खाता चयन खोलता है', tipOnboard: 'वॉलेट निर्माण खोलता है', tipCashlink: 'Cashlink निर्माता खोलता है' },
    zh: { receive: '接收', send: '发送', language: '语言', amounts: '金额显示为', openpay: '在 Nimiq Pay 中打开', disconnect: '断开连接', network: '网络', taphint: '点按地址即可复制', copied: '已复制', tipSend: '打开钱包的发送流程', tipScan: '打开相机扫描器', connect: '连接钱包', onboard: '初次使用 Nimiq？创建钱包', cashlink: '创建现金链接', tipConnect: '打开账户选择器', tipOnboard: '打开钱包创建', tipCashlink: '打开 Cashlink 创建器' },
    fr: { receive: 'Recevoir', send: 'Envoyer', language: 'Langue', amounts: 'Afficher les montants en', openpay: 'Ouvrir dans Nimiq Pay', disconnect: 'Déconnecter', network: 'Réseau', taphint: "Touchez l'adresse pour la copier", copied: 'Copié', tipSend: "Ouvre l'envoi du portefeuille", tipScan: 'Ouvre le scanner de la caméra', connect: 'Connecter le portefeuille', onboard: 'Nouveau sur Nimiq ? Créez un portefeuille', cashlink: 'Créer un Cashlink', tipConnect: 'Ouvre le sélecteur de comptes', tipOnboard: 'Ouvre la création du portefeuille', tipCashlink: 'Ouvre le créateur de Cashlink' },
    tr: { receive: 'Al', send: 'Gönder', language: 'Dil', amounts: 'Tutarları şu birimde göster', openpay: "Nimiq Pay'de aç", disconnect: 'Bağlantıyı kes', network: 'Ağ', taphint: 'Kopyalamak için adrese dokun', copied: 'Kopyalandı', tipSend: 'Cüzdanın gönderme akışını açar', tipScan: 'Kamera tarayıcısını açar', connect: 'Cüzdanı bağla', onboard: "Nimiq'te yeni misin? Cüzdan oluştur", cashlink: 'Cashlink oluştur', tipConnect: 'Hesap seçiciyi açar', tipOnboard: 'Cüzdan oluşturmayı açar', tipCashlink: 'Cashlink oluşturucuyu açar' },
    ko: { receive: '받기', send: '보내기', language: '언어', amounts: '금액 표시 통화', openpay: 'Nimiq Pay에서 열기', disconnect: '연결 해제', network: '네트워크', taphint: '주소를 탭하여 복사', copied: '복사됨', tipSend: '지갑의 보내기 화면을 엽니다', tipScan: '카메라 스캐너를 엽니다', connect: '지갑 연결', onboard: 'Nimiq이 처음인가요? 지갑 만들기', cashlink: 'Cashlink 만들기', tipConnect: '계정 선택기를 엽니다', tipOnboard: '지갑 생성을 엽니다', tipCashlink: 'Cashlink 생성기를 엽니다' },
    pt: { receive: 'Receber', send: 'Enviar', language: 'Idioma', amounts: 'Mostrar valores em', openpay: 'Abrir no Nimiq Pay', disconnect: 'Desconectar', network: 'Rede', taphint: 'Toque no endereço para copiar', copied: 'Copiado', tipSend: 'Abre o envio da carteira', tipScan: 'Abre o scanner da câmera', connect: 'Conectar carteira', onboard: 'Novo na Nimiq? Crie uma carteira', cashlink: 'Criar um Cashlink', tipConnect: 'Abre o seletor de contas', tipOnboard: 'Abre a criação da carteira', tipCashlink: 'Abre o criador de Cashlink' },
    vi: { receive: 'Nhận', send: 'Gửi', language: 'Ngôn ngữ', amounts: 'Hiển thị số tiền bằng', openpay: 'Mở trong Nimiq Pay', disconnect: 'Ngắt kết nối', network: 'Mạng', taphint: 'Chạm vào địa chỉ để sao chép', copied: 'Đã sao chép', tipSend: 'Mở luồng gửi của ví', tipScan: 'Mở máy quét camera', connect: 'Kết nối ví', onboard: 'Mới dùng Nimiq? Tạo ví', cashlink: 'Tạo Cashlink', tipConnect: 'Mở bộ chọn tài khoản', tipOnboard: 'Mở tạo ví', tipCashlink: 'Mở trình tạo Cashlink' },
};

/** Mini-app detection: Nimiq Pay injects window.nimiqPay synchronously before
 * the page script runs (same check as nimiq-app-shell isMiniAppHost). */
export function isMiniAppHost() {
    return typeof window !== 'undefined' && !!window.nimiqPay;
}

const SPINNER = '<svg class="cwp-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="14" height="14" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path stroke="currentColor" d="M9,1c4.42,0,8,3.58,8,8"/><path stroke="currentColor" opacity=".3" d="M4.27,2.56C2.29,4.01,1,6.35,1,9c0,4.42,3.58,8,8,8c2.65,0,4.99-1.29,6.44-3.27"/></svg>';

export function initCornerControl(root, options = {}) {
    const opts = Object.assign({
        account: null,            // { address, label?, balanceLuna? | balanceNim? }
        connect: null, onDisconnect: null, onboard: null, rename: null,
        send: null, scan: null, createCashlink: null, openPay: null,
        cashlink: false, testnet: false,
        language: 'en', defaultFiat: 'USD',
        rates: {},                // { USD: nimPriceInUsd, ... } from the app's fiat feed
        i18n: {},                 // per-language overrides, merged over I18N
        isMiniApp: undefined,     // override detection (tests/demos)
        renderQr: null,           // (canvas, uri) => void; default qr-creator
        onLanguageChange: null, onFiatChange: null,
    }, options);

    const strings = {};
    for (const k of Object.keys(I18N)) strings[k] = Object.assign({}, I18N[k], opts.i18n[k]);
    const $ = (sel) => root.querySelector(sel);
    const $$ = (sel) => Array.from(root.querySelectorAll(sel));

    const state = {
        lang: opts.language in strings ? opts.language : 'en',
        fiat: opts.defaultFiat,
        account: opts.account,
        miniapp: opts.isMiniApp !== undefined ? !!opts.isMiniApp : isMiniAppHost(),
    };

    // ---- mode / option stamping (CSS shows the right sections) --------------
    if (state.miniapp) {
        root.dataset.mode = 'miniapp';
        // language preset from the surrounding wallet
        const walletLang = window.nimiqPay && window.nimiqPay.language;
        if (walletLang && walletLang in strings) state.lang = walletLang;
    }
    if (opts.testnet) root.dataset.testnet = ''; else delete root.dataset.testnet;
    if (opts.cashlink) root.dataset.cashlink = ''; else delete root.dataset.cashlink;
    if (state.account) root.dataset.state = 'connected'; else delete root.dataset.state;

    const t = () => strings[state.lang] || strings.en;

    // ---- i18n ---------------------------------------------------------------
    function applyLang() {
        const tt = t();
        $$('[data-i18n]').forEach((el) => { el.textContent = tt[el.dataset.i18n] || strings.en[el.dataset.i18n] || el.textContent; });
    }

    // ---- handoff bubble (unwired seams never sit dead) ----------------------
    function tip(btn, text) {
        const host = btn.closest('.cc-actions') || btn.closest('.cc-section') || btn.closest('.cc-row') || btn.parentElement;
        const old = host.querySelector('.cc-action-tip');
        if (old) old.remove();
        const el = document.createElement('span');
        el.className = 'cc-action-tip';
        el.textContent = text;
        host.appendChild(el);
        requestAnimationFrame(() => el.classList.add('cc-show'));
        setTimeout(() => el.remove(), 1600);
    }
    const seam = (fn, tipKey) => (btn) => { if (fn) fn(); else tip(btn, t()[tipKey]); };

    // ---- menu open/close ----------------------------------------------------
    const menu = $('.cc-menu');
    const faces = [$('.cc-face'), $('.cc-face-flag')].filter(Boolean);
    function setOpen(open) {
        if (open) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
        faces.forEach((f) => f.setAttribute('aria-expanded', String(open)));
        if (!open) root.classList.remove('cc-show-receive');
    }
    faces.forEach((f) => f.addEventListener('click', (e) => {
        // signed-out face IS the connect action
        if (f.classList.contains('cc-face') && f.dataset.state === 'connect' && !menu.hasAttribute('hidden')) { /* menu already open */ }
        e.stopPropagation();
        setOpen(menu.hasAttribute('hidden'));
    }));
    document.addEventListener('click', (e) => { if (!root.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

    // ---- connect / onboard / disconnect -------------------------------------
    const facePill = $('.cc-face');
    async function doConnect(btn) {
        if (!opts.connect) { tip(btn, t().tipConnect); return; }
        facePill.dataset.state = 'busy';
        facePill.setAttribute('disabled', '');
        facePill.innerHTML = SPINNER + '<span class="cwp-label">' + (t().connect === strings.en.connect ? 'Connecting' : t().connect) + '</span>';
        try {
            const account = await opts.connect();
            if (account) setAccount(account);
            else renderFace();
        } catch (err) {
            console.error(err);
            renderFace();
        } finally {
            facePill.removeAttribute('disabled');
        }
    }
    const connectBtn = $('.cc-connect');
    if (connectBtn) connectBtn.addEventListener('click', () => doConnect(connectBtn));
    const onboardBtn = $('.cc-onboard');
    if (onboardBtn) onboardBtn.addEventListener('click', () => seam(opts.onboard, 'tipOnboard')(onboardBtn));
    const disconnectBtn = $('.cc-disconnect');
    if (disconnectBtn) disconnectBtn.addEventListener('click', () => {
        state.account = null;
        delete root.dataset.state;
        renderFace();
        setOpen(false);
        if (opts.onDisconnect) opts.onDisconnect();
    });

    function truncated(address) {
        const clean = (address || '').replace(/\s+/g, ' ').trim();
        return clean.length >= 9 ? clean.slice(0, 7) + '…' + clean.slice(-4) : clean;
    }
    function renderFace() {
        if (!facePill) return;
        if (state.account) {
            facePill.dataset.state = 'connected';
            const img = state.account.identiconUrl
                ? '<img class="cwp-identicon" width="24" height="24" src="' + state.account.identiconUrl + '" alt="Nimiq identicon">'
                : '';
            facePill.innerHTML = img + '<span class="cwp-address">' + truncated(state.account.address) + '</span>'
                + '<svg class="cc-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        } else {
            facePill.dataset.state = 'connect';
            facePill.innerHTML = '<span class="cwp-label" data-i18n="connect">' + t().connect + '</span>'
                + '<svg class="cc-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
    }
    function setAccount(account) {
        state.account = account;
        root.dataset.state = 'connected';
        const name = $('.cc-name');
        if (name && account.label) name.textContent = account.label;
        if (account.balanceNim !== undefined) {
            const nimEl = $('.cc-balance-nim');
            if (nimEl) nimEl.textContent = formatNim(account.balanceNim) + ' NIM';
        }
        renderFace();
        setBalanceFiat();
        renderAddress(account.address);
    }

    // NIM: thin-space grouped (the wallet's number format)
    function formatNim(n) {
        return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // ---- receive view -------------------------------------------------------
    const receiveBtn = $('.cc-receive-btn');
    if (receiveBtn) receiveBtn.addEventListener('click', () => {
        root.classList.add('cc-show-receive');
        const canvas = $('.cc-qr');
        if (canvas && canvas.tagName === 'CANVAS' && state.account) {
            const uri = 'nimiq:' + state.account.address.replace(/\s+/g, '');
            if (opts.renderQr) opts.renderQr(canvas, uri);
            else if (window.QrCreator) window.QrCreator.render({ text: uri, radius: 0.5, ecLevel: 'M', fill: '#1F2348', background: null, size: 480 }, canvas);
        }
    });
    const backBtn = $('.cc-back');
    if (backBtn) backBtn.addEventListener('click', () => root.classList.remove('cc-show-receive'));

    function renderAddress(address) {
        const grid = $('.cc-address');
        if (!grid || !address) return;
        const blocks = address.replace(/\s+/g, '').match(/.{1,4}/g) || [];
        if (blocks.length === 9) grid.innerHTML = blocks.map((b) => '<span>' + b + '</span>').join('');
    }

    // ---- copy (upstream Copyable: 800ms tooltip, blue holds until blur) -----
    const copyWrap = $('.cc-copy-wrap');
    const addressBtn = $('.cc-address');
    if (addressBtn) {
        addressBtn.addEventListener('click', () => {
            const addr = state.account ? state.account.address : addressBtn.textContent.replace(/(\S{4})(?=\S)/g, '$1 ').trim();
            try { navigator.clipboard.writeText(addr); } catch (e) { /* clipboard unavailable */ }
            copyWrap.classList.add('cc-copied', 'cc-copied-hold');
            clearTimeout(copyWrap._t);
            copyWrap._t = setTimeout(() => copyWrap.classList.remove('cc-copied'), 800);
        });
        addressBtn.addEventListener('blur', () => copyWrap.classList.remove('cc-copied-hold'));
    }

    // ---- rename (HubApi.rename seam: wallet-stored, fleet-wide) -------------
    const nameBtn = $('.cc-name');
    if (nameBtn) nameBtn.addEventListener('click', () => {
        if (nameBtn.querySelector('input')) return;
        const current = nameBtn.textContent;
        nameBtn.textContent = '';
        const inp = document.createElement('input');
        inp.className = 'cc-name-input';
        inp.value = current;
        inp.maxLength = 24;
        nameBtn.appendChild(inp);
        inp.focus();
        inp.select();
        const commit = () => {
            const value = inp.value.trim() || current;
            nameBtn.textContent = value;
            if (value !== current && opts.rename) opts.rename(value);
        };
        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') inp.blur();
            if (e.key === 'Escape') { inp.value = current; inp.blur(); }
        });
    });

    // ---- action seams -------------------------------------------------------
    $$('[data-tip]').forEach((btn) => {
        const key = btn.dataset.tip;
        const fn = key === 'tipSend' ? opts.send : key === 'tipScan' ? opts.scan : key === 'tipCashlink' ? opts.createCashlink : null;
        btn.addEventListener('click', () => seam(fn, key)(btn));
    });
    const openPayBtn = $('.cc-openpay');
    if (openPayBtn) openPayBtn.addEventListener('click', () => {
        if (opts.openPay) opts.openPay();
        else window.location.href = 'nimiqpay://miniapp?url=' + encodeURIComponent(window.location.origin + window.location.pathname);
    });

    // ---- accordions + grids -------------------------------------------------
    $$('.cc-acc').forEach((acc) => {
        acc.addEventListener('click', () => {
            const body = acc.parentElement.querySelector('.cc-acc-body');
            const open = body.classList.toggle('cc-open');
            acc.setAttribute('aria-expanded', String(open));
        });
    });

    // Rule 3 at runtime: every copied svg gets fresh gradient/clipPath ids, or
    // url(#id) resolves against defs inside the folded (display:none) grid and
    // the icon paints half or not at all.
    let copyUid = 0;
    function uniquifySvg(html) {
        const ids = new Set();
        html.replace(/id="([^"]+)"/g, (m, id) => { ids.add(id); return m; });
        const u = ++copyUid;
        let out = html;
        for (const id of ids) out = out.split(id).join(id + '-c' + u);
        return out;
    }
    function wireGrid(gridSel, flagSel, valueSel, onPick) {
        const grid = $(gridSel);
        if (!grid) return;
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.cc-card');
            if (!card) return;
            grid.querySelectorAll('.cc-card').forEach((c) => { c.classList.remove('cc-current'); c.setAttribute('aria-selected', 'false'); });
            card.classList.add('cc-current');
            card.setAttribute('aria-selected', 'true');
            const value = $(valueSel);
            if (value) value.textContent = card.dataset.value;
            const flag = $(flagSel);
            const art = card.querySelector('.cc-card-art');
            if (flag && art) flag.innerHTML = uniquifySvg(art.innerHTML);
            if (onPick) onPick(card);
            setTimeout(() => {
                const body = grid.closest('.cc-acc-body');
                body.classList.remove('cc-open');
                body.parentElement.querySelector('.cc-acc').setAttribute('aria-expanded', 'false');
            }, 260);
        });
    }
    wireGrid('.cc-lang-grid', '.cc-lang-flag', '.cc-lang-value', (card) => {
        state.lang = card.dataset.lang;
        applyLang();
        // the mini-app face flag follows the language too
        const faceFlag = $('.cc-face-flag-art');
        const art = card.querySelector('.cc-card-art');
        if (faceFlag && art) faceFlag.innerHTML = uniquifySvg(art.innerHTML);
        if (opts.onLanguageChange) opts.onLanguageChange(state.lang);
    });
    wireGrid('.cc-fiat-grid', '.cc-fiat-flag', '.cc-fiat-value', (card) => {
        state.fiat = card.dataset.value;
        setBalanceFiat();
        if (opts.onFiatChange) opts.onFiatChange(state.fiat);
    });

    // NIM is always shown; the picked currency drives the gray fiat line
    function setBalanceFiat() {
        const el = $('.cc-balance-fiat');
        if (!el) return;
        const nim = state.account && state.account.balanceNim !== undefined ? state.account.balanceNim
            : parseFloat(($('.cc-balance-nim') || { textContent: '0' }).textContent.replace(/[^\d.]/g, '')) || 0;
        const rate = opts.rates[state.fiat];
        if (!rate) return;
        try {
            el.textContent = new Intl.NumberFormat(undefined, { style: 'currency', currency: state.fiat }).format(nim * rate);
        } catch (e) {
            el.textContent = (nim * rate).toFixed(2) + ' ' + state.fiat;
        }
    }

    // ---- boot ---------------------------------------------------------------
    applyLang();
    renderFace();
    if (state.account) setAccount(state.account);
    else setBalanceFiat();

    return {
        setAccount,
        setLanguage(id) { if (id in strings) { state.lang = id; applyLang(); } },
        setFiat(ticker) { state.fiat = ticker; setBalanceFiat(); },
        open: () => setOpen(true),
        close: () => setOpen(false),
        get state() { return Object.assign({}, state); },
    };
}
