<template>
    <!-- corner-control (Vue 3): the fleet's one-button header corner.
         Same locked spec as the html variant; see html/corner-control.html
         for the seam documentation. Requires corner-control.css +
         connect-wallet-pill.css. Flags load from `flagBase` (nq add vendors
         assets/img/flags-square -> ./nimiq/assets/flags-square). -->
    <div ref="root" class="corner-control"
        :data-state="account ? 'connected' : null"
        :data-mode="miniapp ? 'miniapp' : null"
        :data-testnet="testnet ? '' : null"
        :data-cashlink="cashlink ? '' : null"
        :class="{ 'cc-show-receive': showReceive }">

        <button v-if="!miniapp" type="button" class="connect-wallet-pill cc-face"
            :data-state="faceState" :disabled="faceState === 'busy'"
            aria-haspopup="menu" :aria-expanded="String(open)" @click.stop="onFace">
            <template v-if="faceState === 'connected'">
                <img v-if="account && account.identiconUrl" class="cwp-identicon" width="24" height="24"
                    :src="account.identiconUrl" alt="Nimiq identicon">
                <span class="cwp-address">{{ truncatedAddress }}</span>
            </template>
            <template v-else-if="faceState === 'busy'">
                <svg class="cwp-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="14" height="14" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path stroke="currentColor" d="M9,1c4.42,0,8,3.58,8,8"/><path stroke="currentColor" opacity=".3" d="M4.27,2.56C2.29,4.01,1,6.35,1,9c0,4.42,3.58,8,8,8c2.65,0,4.99-1.29,6.44-3.27"/></svg>
                <span class="cwp-label">{{ t.connect }}</span>
            </template>
            <template v-else>
                <span class="cwp-label">{{ t.connect }}</span>
            </template>
            <svg class="cc-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>

        <button v-else type="button" class="cc-face-flag" aria-haspopup="menu"
            :aria-expanded="String(open)" :aria-label="t.language" @click.stop="open = !open">
            <span class="cc-flag" v-html="flagSvg(langFlag)"></span>
            <svg class="cc-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>

        <div v-show="open" class="cc-menu">
            <!-- receive view -->
            <div class="cc-view-receive">
                <button type="button" class="cc-back" @click="showReceive = false">‹ <span class="cc-strong">{{ t.receive }}</span></button>
                <div class="cc-divider"></div>
                <div class="cc-receive-body">
                    <canvas ref="qrCanvas" class="cc-qr" width="164" height="164" aria-label="QR code for the address"></canvas>
                    <span class="cc-copy-wrap" :class="{ 'cc-copied': copied, 'cc-copied-hold': copiedHold }">
                        <button type="button" class="cc-address" :title="t.taphint" @click="copyAddress" @blur="copiedHold = false">
                            <span v-for="(block, i) in addressBlocks" :key="i">{{ block }}</span>
                        </button>
                        <span class="cc-copy-tooltip" aria-hidden="true">{{ t.copied }}</span>
                    </span>
                    <p class="cc-receive-hint">{{ t.taphint }}</p>
                </div>
            </div>

            <div class="cc-view-main">
                <!-- signed out -->
                <div class="cc-section cc-signedout">
                    <button type="button" class="cc-connect" @click="doConnect($event)">{{ t.connect }}</button>
                    <button type="button" class="cc-onboard" @click="seam('onboard', 'tipOnboard', $event)">{{ t.onboard }}</button>
                </div>
                <div class="cc-divider cc-signedout cc-signedout-divider"></div>

                <!-- mini wallet -->
                <div class="cc-section cc-wallet">
                    <div class="cc-account">
                        <img v-if="account && account.identiconUrl" class="cc-identicon" width="40" height="40" :src="account.identiconUrl" alt="Nimiq identicon">
                        <button v-if="!renaming" type="button" class="cc-name" title="Rename" @click="startRename">{{ label }}</button>
                        <input v-else ref="renameInput" v-model="renameValue" class="cc-name-input" maxlength="24"
                            @blur="commitRename" @keydown.enter="commitRename" @keydown.esc="cancelRename">
                        <div class="cc-balance">
                            <span class="cc-balance-nim">{{ formattedNim }} NIM</span>
                            <span class="cc-balance-fiat">{{ formattedFiat }}</span>
                        </div>
                    </div>
                    <div class="cc-actions">
                        <button type="button" class="cc-receive" @click="openReceive">
                            <svg class="cc-arrow-down" width="16" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10,1l5,5l-5,5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="6" x2="1" y2="6" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            {{ t.receive }}
                        </button>
                        <button type="button" class="cc-send" @click="seam('send', 'tipSend', $event)">
                            <svg class="cc-arrow-up" width="16" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10,1l5,5l-5,5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="6" x2="1" y2="6" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            {{ t.send }}
                        </button>
                        <button type="button" class="cc-scan" :aria-label="t.tipScan" @click="seam('scan', 'tipScan', $event)" v-html="scanIcon"></button>
                    </div>
                </div>
                <div class="cc-divider cc-wallet-divider"></div>

                <!-- cashlink (opt-in) -->
                <button type="button" class="cc-row cc-row-nav cc-cashlink-row" @click="seam('createCashlink', 'tipCashlink', $event)">
                    <span class="cc-cashlink-slot" v-html="cashlinkIcon"></span>
                    <span class="cc-strong">{{ t.cashlink }}</span>
                </button>
                <div class="cc-divider cc-cashlink-divider"></div>

                <!-- language -->
                <div class="cc-section">
                    <button type="button" class="cc-acc" :aria-expanded="String(langOpen)" @click="langOpen = !langOpen">
                        <span class="cc-label">{{ t.language }}</span>
                        <span class="cc-acc-value">
                            <span class="cc-flag" v-html="flagSvg(langFlag)"></span>
                            <span class="cc-strong">{{ langName }}</span>
                        </span>
                        <svg class="cc-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <div class="cc-acc-body" :class="{ 'cc-open': langOpen }">
                        <div class="cc-grid-wrap">
                            <div class="cc-grid cc-cols-2" role="listbox" :aria-label="t.language">
                                <button v-for="l in languages" :key="l.id" type="button" class="cc-card"
                                    :class="{ 'cc-current': l.id === lang }" role="option" :aria-selected="String(l.id === lang)"
                                    @click="pickLanguage(l)">
                                    <span class="cc-card-art" v-html="flagSvg(l.flag)"></span>
                                    <span class="cc-card-name">{{ l.name }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cc-divider"></div>

                <!-- show amounts in (fiat-only; NIM always displayed) -->
                <div class="cc-section">
                    <button type="button" class="cc-acc" :aria-expanded="String(fiatOpen)" @click="fiatOpen = !fiatOpen">
                        <span class="cc-label">{{ t.amounts }}</span>
                        <span class="cc-acc-value">
                            <span class="cc-flag" v-html="flagSvg(fiatFlag)"></span>
                            <span class="cc-strong">{{ fiat }}</span>
                        </span>
                        <svg class="cc-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <div class="cc-acc-body" :class="{ 'cc-open': fiatOpen }">
                        <div class="cc-grid-wrap">
                            <div class="cc-grid cc-cols-3" role="listbox" aria-label="Reference currency">
                                <button v-for="c in currencies" :key="c.ticker" type="button" class="cc-card"
                                    :class="{ 'cc-current': c.ticker === fiat }" role="option" :aria-selected="String(c.ticker === fiat)"
                                    @click="pickFiat(c)">
                                    <span class="cc-card-art" v-html="flagSvg(c.flag)"></span>
                                    <span class="cc-card-ticker">{{ c.ticker }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cc-divider cc-openpay-divider"></div>

                <button type="button" class="cc-row cc-row-nav cc-openpay" @click="openInPay">
                    <span class="cc-flag" v-html="goldHexSvg"></span>
                    <span class="cc-strong">{{ t.openpay }}</span>
                </button>
                <div class="cc-divider cc-footer-divider"></div>

                <div class="cc-footer">
                    <button type="button" class="cc-disconnect" @click="doDisconnect">{{ t.disconnect }}</button>
                    <span class="cc-net-group"><span>{{ t.network }}</span>
                    <span class="cc-badge">Testnet</span></span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
// Vue 3 port of the corner-control driver. The i18n table and behaviors are
// the html variant's (corner-control.js) adapted to reactive state; keep the
// two in lockstep when editing.
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const HEX_PATH = 'M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688';
const FLAG_FIT = { KR: 0.84 }; // nimiq.school precedent: white margin for KR

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

const DEFAULT_LANGUAGES = [
    { id: 'en', name: 'English', flag: 'US' }, { id: 'es', name: 'Español', flag: 'MX' },
    { id: 'de', name: 'Deutsch', flag: 'DE' }, { id: 'hi', name: 'हिन्दी', flag: 'IN' },
    { id: 'zh', name: '中文', flag: 'CN' }, { id: 'fr', name: 'Français', flag: 'FR' },
    { id: 'tr', name: 'Türkçe', flag: 'TR' }, { id: 'ko', name: '한국어', flag: 'KR' },
    { id: 'pt', name: 'Português', flag: 'BR' }, { id: 'vi', name: 'Tiếng Việt', flag: 'VN' },
];
const DEFAULT_CURRENCIES = [
    { ticker: 'USD', flag: 'US' }, { ticker: 'EUR', flag: 'EU' }, { ticker: 'GBP', flag: 'GB' },
    { ticker: 'MXN', flag: 'MX' }, { ticker: 'BRL', flag: 'BR' }, { ticker: 'CNY', flag: 'CN' },
    { ticker: 'INR', flag: 'IN' }, { ticker: 'JPY', flag: 'JP' }, { ticker: 'CHF', flag: 'CH' },
    { ticker: 'CAD', flag: 'CA' }, { ticker: 'AUD', flag: 'AU' }, { ticker: 'KRW', flag: 'KR' },
    { ticker: 'TRY', flag: 'TR' }, { ticker: 'VND', flag: 'VN' },
];

// @nimiq/style icons, verbatim
const SCAN_ICON = '<svg class="cc-scan-glyph" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40"><g fill="currentColor"><path d="M1.21 7.06c.67 0 1.21-.54 1.21-1.21l-.04-3.12a.3.3 0 0 1 .3-.3H5.7a1.21 1.21 0 1 0 0-2.43H2.37A2.4 2.4 0 0 0 0 2.42v3.43c0 .67.54 1.21 1.21 1.21zM5.69 37.58H2.73a.3.3 0 0 1-.3-.3v-3.13a1.21 1.21 0 1 0-2.43 0v3.43A2.4 2.4 0 0 0 2.37 40H5.7a1.21 1.21 0 0 0 0-2.42zM38.79 32.94c-.67 0-1.21.54-1.21 1.21l.04 3.12a.3.3 0 0 1-.3.3H34.3a1.21 1.21 0 1 0 0 2.43h3.32A2.4 2.4 0 0 0 40 37.58v-3.43c0-.67-.54-1.21-1.21-1.21zM37.63 0H34.3a1.21 1.21 0 1 0 0 2.42h2.96c.17 0 .3.14.3.3v3.13a1.21 1.21 0 0 0 2.43 0V2.42A2.4 2.4 0 0 0 37.63 0z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.94 15.15H6.67c-.67 0-1.22-.54-1.22-1.21V6.67c0-.67.55-1.21 1.22-1.21h7.27c.67 0 1.21.54 1.21 1.2v7.28c0 .67-.54 1.21-1.21 1.21zM8.18 7.88a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24a.3.3 0 0 0 .3-.3V8.18a.3.3 0 0 0-.3-.3H8.18zM6.67 24.85h7.27c.67 0 1.21.54 1.21 1.21v7.27c0 .67-.54 1.22-1.21 1.22H6.67c-.67 0-1.22-.55-1.22-1.22v-7.27c0-.67.55-1.21 1.22-1.21zm5.75 7.27a.3.3 0 0 0 .3-.3v-4.24a.3.3 0 0 0-.3-.3H8.18a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24zM26.06 5.45h7.27c.67 0 1.21.55 1.21 1.22v7.27c0 .67-.54 1.21-1.2 1.21h-7.28c-.67 0-1.21-.54-1.21-1.21V6.67c0-.67.54-1.22 1.21-1.22zm5.76 7.28a.3.3 0 0 0 .3-.3V8.17a.3.3 0 0 0-.3-.3h-4.24a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24z"/><path d="M17.58 10.6h1.2a.9.9 0 1 0 0-1.81.3.3 0 0 1-.3-.3V6.66a.9.9 0 1 0-1.81 0V9.7c0 .5.4.9.9.9zM21.21 7.58c.17 0 .3.13.3.3v6.66a.9.9 0 1 0 1.82 0V6.67c0-.5-.4-.91-.9-.91H21.2a.9.9 0 1 0 0 1.82zM12.42 18.18c0 .5.41.91.91.91h4.25c.5 0 .9-.4.9-.9v-4.86a.9.9 0 1 0-1.81 0v3.64a.3.3 0 0 1-.3.3h-3.04c-.5 0-.9.4-.9.91z"/><path d="M9.09 17.27c-.5 0-.9.4-.9.91v3.03a.3.3 0 0 1-.31.3H6.67a.9.9 0 1 0 0 1.82h15.75c.5 0 .91-.4.91-.9v-3.64a.9.9 0 0 0-1.82 0v2.42a.3.3 0 0 1-.3.3h-10.9a.3.3 0 0 1-.31-.3v-3.03c0-.5-.4-.9-.91-.9zM22.12 26.06c0-.5-.4-.9-.9-.9h-3.64c-.5 0-.91.4-.91.9v4.85a.9.9 0 1 0 1.81 0v-3.64c0-.16.14-.3.3-.3h2.43c.5 0 .91-.4.91-.9zM33.33 32.42h-10.3a.3.3 0 0 1-.3-.3V29.7a.9.9 0 1 0-1.82 0v3.63c0 .5.4.91.9.91h11.52a.9.9 0 0 0 0-1.82z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M29.1 30h-3.65a.9.9 0 0 1-.9-.91v-3.64c0-.5.4-.9.9-.9h3.64c.5 0 .91.4.91.9v3.64c0 .5-.4.91-.9.91zm-2.43-3.64a.3.3 0 0 0-.3.3v1.22c0 .17.13.3.3.3h1.2a.3.3 0 0 0 .31-.3v-1.21a.3.3 0 0 0-.3-.3h-1.21z"/></g></svg>';
const CASHLINK_ICON = '<svg class="cc-cashlink-glyph" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5px" stroke-linejoin="round"><path d="M40.25,23.25v-.5a6.5,6.5,0,0,0-6.5-6.5h-3.5a6.5,6.5,0,0,0-6.5,6.5v6.5a6.5,6.5,0,0,0,6.5,6.5h2"/><path d="M23.75,40.75v.5a6.5,6.5,0,0,0,6.5,6.5h3.5a6.5,6.5,0,0,0,6.5-6.5v-6.5a6.5,6.5,0,0,0-6.5-6.5h-2"/><line x1="32" y1="11.25" x2="32" y2="15.25"/><line x1="32" y1="48.75" x2="32" y2="52.75"/></g></svg>';

export default defineComponent({
    name: 'CornerControl',
    props: {
        account: { type: Object, default: null }, // { address, label?, balanceNim?, identiconUrl? }
        cashlink: { type: Boolean, default: false },
        testnet: { type: Boolean, default: false },
        language: { type: String, default: 'en' },
        defaultFiat: { type: String, default: 'USD' },
        rates: { type: Object, default: () => ({}) },
        languages: { type: Array, default: () => DEFAULT_LANGUAGES },
        currencies: { type: Array, default: () => DEFAULT_CURRENCIES },
        i18nOverrides: { type: Object, default: () => ({}) },
        flagBase: { type: String, default: './nimiq/assets/flags-square' },
        isMiniApp: { type: Boolean, default: undefined },
        // seams: async connect() -> account | null; the rest fire-and-forget
        connect: { type: Function, default: null },
        onboard: { type: Function, default: null },
        rename: { type: Function, default: null },
        send: { type: Function, default: null },
        scan: { type: Function, default: null },
        createCashlink: { type: Function, default: null },
        openPay: { type: Function, default: null },
        renderQr: { type: Function, default: null },
    },
    emits: ['connected', 'disconnected', 'renamed', 'language-change', 'fiat-change'],
    setup(props, { emit }) {
        const root = ref(null);
        const qrCanvas = ref(null);
        const renameInput = ref(null);
        const open = ref(false);
        const showReceive = ref(false);
        const langOpen = ref(false);
        const fiatOpen = ref(false);
        const copied = ref(false);
        const copiedHold = ref(false);
        const renaming = ref(false);
        const renameValue = ref('');
        const account = ref(props.account);
        const label = ref((props.account && props.account.label) || 'Account');
        const miniapp = props.isMiniApp !== undefined ? props.isMiniApp
            : typeof window !== 'undefined' && !!window.nimiqPay;
        const lang = ref((() => {
            if (miniapp && typeof window !== 'undefined' && window.nimiqPay && window.nimiqPay.language
                && I18N[window.nimiqPay.language]) return window.nimiqPay.language;
            return I18N[props.language] ? props.language : 'en';
        })());
        const fiat = ref(props.defaultFiat);
        const faceState = ref(account.value ? 'connected' : 'connect');

        const strings = computed(() => {
            const merged = {};
            for (const k of Object.keys(I18N)) merged[k] = Object.assign({}, I18N[k], props.i18nOverrides[k]);
            return merged;
        });
        const t = computed(() => strings.value[lang.value] || strings.value.en);

        const langEntry = computed(() => props.languages.find((l) => l.id === lang.value) || props.languages[0]);
        const langName = computed(() => langEntry.value.name);
        const langFlag = computed(() => langEntry.value.flag);
        const fiatFlag = computed(() => (props.currencies.find((c) => c.ticker === fiat.value) || props.currencies[0]).flag);

        const truncatedAddress = computed(() => {
            const clean = ((account.value && account.value.address) || '').replace(/\s+/g, ' ').trim();
            return clean.length >= 9 ? clean.slice(0, 7) + '…' + clean.slice(-4) : clean;
        });
        const addressBlocks = computed(() => {
            const a = ((account.value && account.value.address) || '').replace(/\s+/g, '');
            return a.match(/.{1,4}/g) || [];
        });
        const formattedNim = computed(() => {
            const n = (account.value && account.value.balanceNim) || 0;
            return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        });
        const formattedFiat = computed(() => {
            const n = (account.value && account.value.balanceNim) || 0;
            const rate = props.rates[fiat.value];
            if (!rate) return '';
            try {
                return new Intl.NumberFormat(undefined, { style: 'currency', currency: fiat.value }).format(n * rate);
            } catch (e) {
                return (n * rate).toFixed(2) + ' ' + fiat.value;
            }
        });

        // flag-hex at runtime; ids are instance-unique on every render (rule 3)
        let uid = 0;
        function flagSvg(code) {
            const id = 'cc-vfh-' + code + '-' + (++uid);
            const s = FLAG_FIT[code] || 1;
            const w = 21.6 * s;
            const x = 9.8 - w / 2, y = 9 - w / 2;
            return '<svg viewBox="0 0 20 18" aria-hidden="true">'
                + '<defs><clipPath id="' + id + '"><path d="' + HEX_PATH + '"/></clipPath></defs>'
                + (s < 1 ? '<path fill="#fff" d="' + HEX_PATH + '"/>' : '')
                + '<image href="' + props.flagBase + '/flag-' + code + '.svg" x="' + x.toFixed(2) + '" y="' + y.toFixed(2)
                + '" width="' + w.toFixed(2) + '" height="' + w.toFixed(2) + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"/>'
                + '<path class="fh-edge" d="' + HEX_PATH + '"/></svg>';
        }
        const goldHexSvg = computed(() => {
            const id = 'cc-vhex-' + (++uid);
            return '<svg viewBox="0 0 20 18" aria-hidden="true"><g fill="none"><path fill="url(#' + id + ')" d="' + HEX_PATH + '"/>'
                + '<defs><radialGradient id="' + id + '" cx="0" cy="0" r="1" gradientTransform="matrix(20.1956 0 0 20.2552 15.188 17.766)" gradientUnits="userSpaceOnUse">'
                + '<stop stop-color="#ec991c"/><stop offset="1" stop-color="#e9b213"/></radialGradient></defs></g></svg>';
        });

        function tipAt(event, text) {
            const btn = event.currentTarget;
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
        function seam(name, tipKey, event) {
            if (props[name]) props[name]();
            else tipAt(event, t.value[tipKey]);
        }

        async function doConnect(event) {
            if (!props.connect) { tipAt(event, t.value.tipConnect); return; }
            faceState.value = 'busy';
            try {
                const result = await props.connect();
                if (result) {
                    account.value = result;
                    label.value = result.label || label.value;
                    faceState.value = 'connected';
                    emit('connected', result);
                } else {
                    faceState.value = 'connect';
                }
            } catch (err) {
                console.error(err);
                faceState.value = 'connect';
            }
        }
        function doDisconnect() {
            account.value = null;
            faceState.value = 'connect';
            open.value = false;
            emit('disconnected');
        }
        function onFace() {
            open.value = !open.value;
        }
        function openReceive() {
            showReceive.value = true;
            nextTick(() => {
                const canvas = qrCanvas.value;
                if (!canvas || !account.value) return;
                const uri = 'nimiq:' + account.value.address.replace(/\s+/g, '');
                if (props.renderQr) props.renderQr(canvas, uri);
                else if (window.QrCreator) window.QrCreator.render({ text: uri, radius: 0.5, ecLevel: 'M', fill: '#1F2348', background: null, size: 480 }, canvas);
            });
        }
        function copyAddress() {
            if (!account.value) return;
            try { navigator.clipboard.writeText(account.value.address); } catch (e) { /* unavailable */ }
            copied.value = true;
            copiedHold.value = true;
            setTimeout(() => { copied.value = false; }, 800);
        }
        function startRename() {
            renameValue.value = label.value;
            renaming.value = true;
            nextTick(() => { renameInput.value.focus(); renameInput.value.select(); });
        }
        function commitRename() {
            if (!renaming.value) return;
            const value = renameValue.value.trim();
            renaming.value = false;
            if (value && value !== label.value) {
                label.value = value;
                if (props.rename) props.rename(value);
                emit('renamed', value);
            }
        }
        function cancelRename() {
            renameValue.value = label.value;
            renaming.value = false;
        }
        function pickLanguage(l) {
            lang.value = l.id;
            setTimeout(() => { langOpen.value = false; }, 260);
            emit('language-change', l.id);
        }
        function pickFiat(c) {
            fiat.value = c.ticker;
            setTimeout(() => { fiatOpen.value = false; }, 260);
            emit('fiat-change', c.ticker);
        }
        function openInPay() {
            if (props.openPay) props.openPay();
            else window.location.href = 'nimiqpay://miniapp?url=' + encodeURIComponent(window.location.origin + window.location.pathname);
        }

        function onDocClick(e) { if (root.value && !root.value.contains(e.target)) open.value = false; }
        function onKey(e) { if (e.key === 'Escape') open.value = false; }
        onMounted(() => {
            document.addEventListener('click', onDocClick);
            document.addEventListener('keydown', onKey);
        });
        onBeforeUnmount(() => {
            document.removeEventListener('click', onDocClick);
            document.removeEventListener('keydown', onKey);
        });
        watch(open, (v) => { if (!v) showReceive.value = false; });

        return {
            root, qrCanvas, renameInput,
            open, showReceive, langOpen, fiatOpen, copied, copiedHold, renaming, renameValue,
            account, label, miniapp, lang, fiat, faceState,
            t, langName, langFlag, fiatFlag, truncatedAddress, addressBlocks, formattedNim, formattedFiat,
            flagSvg, goldHexSvg, scanIcon: SCAN_ICON, cashlinkIcon: CASHLINK_ICON,
            seam, doConnect, doDisconnect, onFace, openReceive, copyAddress,
            startRename, commitRename, cancelRename, pickLanguage, pickFiat, openInPay,
        };
    },
});
</script>
