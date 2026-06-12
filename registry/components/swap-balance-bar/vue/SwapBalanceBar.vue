<template>
    <div class="swap-balance-bar flex-column" ref="root$" :class="{ animating: animatingBars, disabled }">
        <div class="balance-bar-header flex-row">
            <button v-if="leftAsset === 'NIM'" class="reset left nimiq currency"
                :class="{ single: backgroundAddresses.length === 0 }"
                @click="onActiveAddressClick"
            >
                <div class="identicon-stack">
                    <div v-if="disabled" class="disabled"></div>
                    <div class="identicon secondary" v-if="backgroundAddresses[0]">
                        <img :src="identiconUrls[backgroundAddresses[0]]" alt="Nimiq identicon">
                    </div>
                    <div class="identicon secondary" v-if="backgroundAddresses[1]">
                        <img :src="identiconUrls[backgroundAddresses[1]]" alt="Nimiq identicon">
                    </div>
                    <div class="identicon primary">
                        <img :src="identiconUrls[activeAddressInfo.address]" alt="Nimiq identicon">
                    </div>
                </div>
                <label>{{ activeAddressInfo.label }}</label>
                <span class="amount">{{ formatAmount(newLeftBalance, 'NIM') }}
                    <span class="currency nim">NIM</span></span>
            </button>
            <div v-else class="currency left" :class="ASSET_CLASS[leftAsset]">
                <component :is="ASSET_ICON[leftAsset]" />
                <label>{{ ASSET_LABEL[leftAsset] }}</label>
                <span class="amount">{{ formatAmount(newLeftBalance, leftAsset) }}
                    <span class="currency">{{ ASSET_TICKER[leftAsset] }}</span></span>
            </div>
            <button v-if="rightAsset === 'NIM'" class="reset right nimiq currency"
                :class="{ single: backgroundAddresses.length === 0 }"
                @click="onActiveAddressClick"
            >
                <label>{{ activeAddressInfo.label }}</label>
                <span class="amount">{{ formatAmount(newRightBalance, 'NIM') }}
                    <span class="currency nim">NIM</span></span>
                <div class="identicon-stack">
                    <div class="identicon secondary" v-if="backgroundAddresses[0]">
                        <img :src="identiconUrls[backgroundAddresses[0]]" alt="Nimiq identicon">
                    </div>
                    <div class="identicon secondary" v-if="backgroundAddresses[1]">
                        <img :src="identiconUrls[backgroundAddresses[1]]" alt="Nimiq identicon">
                    </div>
                    <div class="identicon primary">
                        <img :src="identiconUrls[activeAddressInfo.address]" alt="Nimiq identicon">
                    </div>
                </div>
            </button>
            <div v-else class="currency right" :class="ASSET_CLASS[rightAsset]">
                <label>{{ ASSET_LABEL[rightAsset] }}</label>
                <span class="amount">{{ formatAmount(newRightBalance, rightAsset) }}
                    <span class="currency">{{ ASSET_TICKER[rightAsset] }}</span></span>
                <component :is="ASSET_ICON[rightAsset]" />
            </div>
        </div>
        <div class="connecting-lines">
            <!-- CurvedLine direction="right" -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                :style="{ width: `${leftLine.width}px`, height: '35px' }"
                :viewBox="`0 0 ${leftLine.width} 35`" class="right"
            ><path stroke="#1F2348" stroke-width="1.5" opacity=".24" :d="leftLine.d"/></svg>
            <!-- CurvedLine direction="left" -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                :style="{ width: `${rightLine.width}px`, height: '35px' }"
                :viewBox="`0 0 ${rightLine.width} 35`" class="left"
            ><path stroke="#1F2348" stroke-width="1.5" opacity=".24" :d="rightLine.d"/></svg>
        </div>
        <div class="balance-bar flex-row">
            <div class="bar left flex-row"
                v-for="barDef in leftDistributionData"
                :key="barDef.address"
                :ref="el => { if (barDef.active) leftActiveBar$ = el }"
                :class="[{ active: barDef.active }, barDef.barColorClass]"
                :style="{ width: `${getBarWidth(barDef)}%` }"
                @click="barDef.active ? onActiveBarClick(leftAsset, $event) : $emit('select-address', barDef.address)"
            >
                <div class="change" :style="{ width: `${getChangeBarWidth(barDef)}%` }"></div>
            </div>
            <div class="separator nq-light-blue-bg" ref="separator$">
                <transition name="fade">
                    <div class="slide-hint flex-row left" v-if="!disabled && distributionPercents.right <= 2">
                        <svg v-for="i in 3" :key="i" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 7">
                            <path d="M5.096 2.722a.7.7 0 010 1.174L1.081 6.504A.7.7 0 010 5.917V.7A.7.7 0 011.081.114l4.015 2.608z"/>
                        </svg>
                    </div>
                </transition>
                <div class="handle"
                    @mousedown="onMouseDown"
                    @touchstart="onMouseDown"
                >
                    <div v-if="disabled" class="disabled"></div>
                </div>
                <transition name="fade">
                    <div class="slide-hint flex-row right" v-if="!disabled && distributionPercents.left <= 2">
                        <svg v-for="i in 3" :key="i" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 7">
                            <path d="M5.096 2.722a.7.7 0 010 1.174L1.081 6.504A.7.7 0 010 5.917V.7A.7.7 0 011.081.114l4.015 2.608z"/>
                        </svg>
                    </div>
                </transition>
            </div>
            <div class="bar right flex-row"
                v-for="barDef in rightDistributionData"
                :key="barDef.address"
                :ref="el => { if (barDef.active) rightActiveBar$ = el }"
                :class="[{ active: barDef.active }, barDef.barColorClass]"
                :style="{ width: `${getBarWidth(barDef)}%` }"
                @click="barDef.active ? onActiveBarClick(rightAsset, $event) : $emit('select-address', barDef.address)"
            >
                <div class="change" :style="{ width: `${getChangeBarWidth(barDef)}%` }"></div>
            </div>
        </div>
        <div class="scale flex-row">
            <div v-for="index in 10" :key="index" class="tenth">
                <div v-if="index === 1"
                    class="left-total-percent"
                    :class="{
                        hidden: distributionPercents.left <= 5 || (equiPointPositionX < 10 && equiPointPositionX > 5),
                    }"
                >{{ distributionPercents.left }}%</div>
                <div v-else-if="index === 10"
                    class="right-total-percent"
                    :class="{
                        hidden: distributionPercents.right <= 5 || (equiPointPositionX > 90 && equiPointPositionX < 95),
                    }"
                >{{ distributionPercents.right }}%</div>
            </div>
        </div>
        <div class="equilibrium-point nq-light-blue-bg"
            :class="{
                hidden: !equiPointVisible || equiPointPositionX <= 5 || equiPointPositionX >= 95,
            }"
            :style="{ left: `${equiPointPositionX}%` }"
            @click="animatedReset"
        ></div>
    </div>
</template>

<script setup>
/*
 * Vue 3 port of wallet swap/SwapBalanceBar.vue (Vue 2 + @vue/composition-api).
 * Upstream Pinia/Vuex stores are translated into props:
 *   useAddressStore()        -> nimAddresses (first entry = active address)
 *   useBtcAddressStore()     -> btcBalance
 *   usePolygonAddressStore() -> usdcBalance / usdtBalance
 *   useFiatStore()           -> exchangeRates ({ nim, btc, usdc, usdt } fiat per whole coin)
 * The Identicon and Amount components from @nimiq/vue-components and the
 * CurvedLine/SlideHint icon components are inlined.
 */
import { computed, h, onMounted, onUnmounted, ref, shallowRef, watch, watchEffect, nextTick } from 'vue';
// npm dep: @nimiq/iqons (identicon data-urls + address -> background color name)
import Iqons, { getBackgroundColorName } from '@nimiq/iqons';

const props = defineProps({
    leftAsset: { type: String, required: true }, // 'NIM' | 'BTC' | 'USDC_MATIC' | 'USDT_MATIC'
    rightAsset: { type: String, required: true },
    newLeftBalance: { type: Number, required: true }, // in smallest units
    newRightBalance: { type: Number, required: true },
    fiatLimit: { type: Number, default: undefined },
    disabled: { type: Boolean, default: false },
    /* store replacements */
    nimAddresses: { type: Array, default: () => [] }, // [{ address, label, balance }]
    btcBalance: { type: Number, default: 0 },
    usdcBalance: { type: Number, default: 0 },
    usdtBalance: { type: Number, default: 0 },
    exchangeRates: { type: Object, default: () => ({ nim: 0.000501, btc: 63417, usdc: 1, usdt: 1 }) },
});

const emit = defineEmits(['change', 'on-active-address-click', 'select-address']);

const DECIMALS = { NIM: 5, BTC: 8, USDC_MATIC: 6, USDT_MATIC: 6 };
const ASSET_CLASS = { BTC: 'bitcoin', USDC_MATIC: 'usdc', USDT_MATIC: 'usdt' };
const ASSET_LABEL = { BTC: 'Bitcoin', USDC_MATIC: 'USD Coin', USDT_MATIC: 'Tether USD' };
const ASSET_TICKER = { NIM: 'NIM', BTC: 'BTC', USDC_MATIC: 'USDC', USDT_MATIC: 'USDT' };
const ASSET_CURRENCY = { NIM: 'nim', BTC: 'btc', USDC_MATIC: 'usdc', USDT_MATIC: 'usdt' };
const DISPLAY_DECIMALS = { NIM: 0, BTC: 8, USDC_MATIC: 2, USDT_MATIC: 2 };

/* Inlined icons (BitcoinIcon.vue / UsdcIcon.vue-style render functions) */
const BitcoinIcon = () => h('svg', {
    width: 42, height: 42, viewBox: '0 0 42 42', fill: 'currentColor',
    xmlns: 'http://www.w3.org/2000/svg', class: 'bitcoin',
}, [
    h('circle', { fill: '#fff', cx: 21, cy: 21, r: 18 }),
    h('path', { 'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: 'M15.918 41.371c11.253 2.805 22.649-4.04 25.454-15.291C44.176 14.83 37.33 3.433 26.077.628 14.828-2.176 3.433 4.67.629 15.922c-2.806 11.25 4.041 22.645 15.289 25.45zm10.31-29.01c3.041.997 5.265 2.49 4.828 5.27-.316 2.033-1.501 3.018-3.075 3.364 2.161 1.07 3.26 2.712 2.213 5.557-1.3 3.533-4.388 3.831-8.495 3.092l-.998 3.8-2.407-.571.983-3.75a96.07 96.07 0 01-1.919-.474l-.986 3.768-2.406-.571.997-3.807-.652-.161c-.351-.087-.706-.175-1.065-.26l-3.135-.744 1.196-2.623s1.775.448 1.75.415c.682.16.985-.262 1.104-.544l1.575-6.007.255.06a2.197 2.197 0 00-.25-.076l1.123-4.288c.03-.487-.147-1.101-1.122-1.333.038-.024-1.75-.413-1.75-.413l.641-2.448 3.322.79-.003.011c.5.118 1.014.23 1.538.344L20.477 7l2.407.571-.967 3.69c.644.137 1.288.281 1.93.431l.96-3.664 2.408.57-.986 3.764zm-7.622 13.646c1.964.494 6.264 1.575 6.947-1.037.7-2.667-3.463-3.556-5.496-3.991-.229-.049-.43-.092-.594-.13l-1.323 5.043c.134.031.291.07.466.115zm1.857-7.369c1.638.416 5.212 1.324 5.835-1.048.636-2.428-2.838-3.159-4.535-3.516-.19-.04-.359-.076-.496-.108l-1.2 4.574c.114.027.247.06.396.098z' }),
]);
const UsdcIcon = () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 2000 2000', class: 'usdc',
}, [
    h('path', { d: 'M1000 2000c554 0 1000-446 1000-1000S1554 0 1000 0 0 446 0 1000s446 1000 1000 1000z', fill: 'currentColor' }),
    h('path', { d: 'M1275 1158c0-146-87-196-262-216-125-17-150-50-150-109s41-96 125-96c75 0 116 25 137 88 4 12 17 21 29 21h67c17 0 29-13 29-29v-5c-17-91-92-162-187-170V542c0-17-13-30-34-34h-62c-17 0-29 13-34 34v95c-125 17-204 101-204 205 0 137 84 191 259 212 116 21 154 46 154 113s-59 112-138 112c-108 0-146-46-158-108-4-17-17-25-29-25h-71c-17 0-29 12-29 29v4c16 104 83 179 221 200v100c0 17 12 29 33 34h62c17 0 30-13 34-34v-100c125-21 208-108 208-221z', fill: '#fff' }),
    h('path', { d: 'M788 1596a620 620 0 0 1-371-800 616 616 0 0 1 371-371c16-8 25-21 25-42v-58c0-17-9-29-25-33-5 0-13 0-17 4a749 749 0 0 0 0 1429c17 8 33 0 37-17 5-4 5-8 5-16v-59c0-12-13-29-25-37zm441-1300c-16-9-33 0-37 16-4 5-4 9-4 17v58c0 17 12 34 25 42a620 620 0 0 1 370 800 616 616 0 0 1-371 371c-16 8-24 21-24 42v58c0 17 8 29 25 33 4 0 12 0 16-4a749 749 0 0 0 488-942 756 756 0 0 0-488-491z', fill: '#fff' }),
]);
const UsdtIcon = () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 86 69', class: 'usdt',
}, [
    h('path', { fill: '#fff', d: 'M 19.596219,7.6270475 H 66.430976 V 44.958728 c -15.933124,8.870098 -31.518243,8.139987 -46.834757,0 z' }),
    h('path', { 'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: 'M18.97.1h49.25c1.17 0 2.26.61 2.85 1.6L85.4 25.88a3.11 3.11 0 0 1-.53 3.86l-39.5 37.85a3.36 3.36 0 0 1-4.62 0L1.32 29.79a3.11 3.11 0 0 1-.49-3.93L16.17 1.62A3.3 3.3 0 0 1 18.97.1Zm42.89 10.8v6.79H47.83v4.7c9.85.5 17.25 2.57 17.3 5.04v5.17c-.05 2.47-7.45 4.54-17.3 5.04v11.55h-9.32V37.64c-9.85-.5-17.24-2.57-17.3-5.04v-5.17c.06-2.47 7.45-4.54 17.3-5.04v-4.7H24.5v-6.8h37.37ZM43.17 34.1c10.52 0 19.3-1.75 21.46-4.09-1.83-1.97-8.42-3.53-16.8-3.96v4.93a91.59 91.59 0 0 1-9.32 0v-4.93c-8.37.43-14.97 1.99-16.8 3.96 2.16 2.34 10.95 4.08 21.46 4.08Z', fill: 'currentColor' }),
]);
const ASSET_ICON = { BTC: BitcoinIcon, USDC_MATIC: UsdcIcon, USDT_MATIC: UsdtIcon };

/* lib/AddressColor.ts */
function getColorClass(address) {
    let color = getBackgroundColorName(address).toLowerCase();
    if (color === 'yellow') color = 'gold';
    else if (color === 'indigo') color = 'blue';
    else if (color === 'blue') color = 'light-blue';
    else if (color === 'teal') color = 'green';
    else if (color === 'green') color = 'light-green';
    return `nq-${color}`;
}

/* @nimiq/vue-components Amount, inlined (thin-space grouping over 4 int digits) */
function formatAmount(units, asset) {
    const value = units / 10 ** DECIMALS[asset];
    const str = value.toFixed(DISPLAY_DECIMALS[asset]);
    const [int, dec] = str.split('.');
    const grouped = int.length > 4 ? int.replace(/(\d)(?=(\d{3})+$)/g, '$1 ') : int;
    return dec ? `${grouped}.${dec}` : grouped;
}

/* Identicons */
const identiconUrls = ref({});
watchEffect(() => {
    const addresses = props.nimAddresses.map((a) => a.address);
    for (const address of addresses) {
        if (identiconUrls.value[address]) continue;
        Iqons.toDataUrl(address).then((url) => {
            identiconUrls.value = { ...identiconUrls.value, [address]: url };
        });
    }
});

const root$ = ref(null);
const separator$ = ref(null);
const leftActiveBar$ = shallowRef(null);
const rightActiveBar$ = shallowRef(null);

const activeAddressInfo = computed(() => props.nimAddresses[0]
    || { address: '', label: '', balance: 0 });
const backgroundAddresses = computed(() => props.nimAddresses.slice(1, 3).map((a) => a.address));

const leftExchangeRate = computed(() => props.exchangeRates[ASSET_CURRENCY[props.leftAsset]] || 0);
const rightExchangeRate = computed(() => props.exchangeRates[ASSET_CURRENCY[props.rightAsset]] || 0);

function distributionData(asset, newBalance, exchangeRate) {
    if (asset === 'NIM') {
        return props.nimAddresses.map((addressInfo) => {
            const active = activeAddressInfo.value.address === addressInfo.address;
            const newFiatBalance = (active ? newBalance : (addressInfo.balance || 0))
                / 10 ** DECIMALS.NIM * exchangeRate;
            const balanceChange = active ? newBalance - (addressInfo.balance || 0) : 0;
            return {
                ...addressInfo,
                active,
                newFiatBalance,
                balanceChange,
                fiatBalanceChange: balanceChange / 10 ** DECIMALS.NIM * exchangeRate,
                barColorClass: getColorClass(addressInfo.address),
            };
        });
    }
    const balance = asset === 'BTC' ? props.btcBalance
        : asset === 'USDC_MATIC' ? props.usdcBalance : props.usdtBalance;
    const coinsToUnits = 10 ** DECIMALS[asset];
    return [{
        address: ASSET_CLASS[asset],
        balance,
        active: true,
        newFiatBalance: (newBalance / coinsToUnits) * exchangeRate,
        barColorClass: ASSET_CLASS[asset],
        balanceChange: newBalance - balance,
        fiatBalanceChange: ((newBalance - balance) / coinsToUnits) * exchangeRate,
    }];
}

const leftDistributionData = computed(() =>
    distributionData(props.leftAsset, props.newLeftBalance, leftExchangeRate.value));
const rightDistributionData = computed(() =>
    distributionData(props.rightAsset, props.newRightBalance, rightExchangeRate.value));

const leftTotalNewFiatBalance = computed(() =>
    leftDistributionData.value.reduce((sum, data) => sum + data.newFiatBalance, 0));
const rightTotalNewFiatBalance = computed(() =>
    rightDistributionData.value.reduce((sum, data) => sum + data.newFiatBalance, 0));
const totalNewFiatBalance = computed(() => leftTotalNewFiatBalance.value + rightTotalNewFiatBalance.value);
const distributionPercents = computed(() => ({
    left: Math.round((leftTotalNewFiatBalance.value / totalNewFiatBalance.value) * 100),
    right: Math.round((rightTotalNewFiatBalance.value / totalNewFiatBalance.value) * 100),
}));

const leftActiveBar = computed(() => leftDistributionData.value.find((def) => def.active));
const rightActiveBar = computed(() => rightDistributionData.value.find((def) => def.active));

/* handle behavior */
let isGrabbing = false;
let initialCursorPosition = 0;
let currentCursorPosition = 0;
let animationFrameHandle = 0;

function onMouseDown(event) {
    if (props.disabled) return;
    isGrabbing = true;
    const pageX = event instanceof MouseEvent ? event.pageX : event.touches[0].pageX;
    initialCursorPosition = pageX;
    currentCursorPosition = pageX;
}

function onMouseUp() {
    isGrabbing = false;
}

function onMouseMove(event) {
    if (!isGrabbing) return;
    currentCursorPosition = event instanceof MouseEvent ? event.pageX : event.touches[0].pageX;
}

function emitChange(asset, amount) {
    emit('change', { asset, amount: Math.ceil(amount) });
}

function updateSwapBalanceBar(cursorPosition) {
    if (
        (!isGrabbing && !cursorPosition)
        || !leftActiveBar$.value || !rightActiveBar$.value
        || !leftActiveBar.value || !rightActiveBar.value
        || !root$.value || !separator$.value
    ) return undefined;

    const separatorPositionX = separator$.value.getBoundingClientRect().left;

    /* initialize the initialCursorPosition to the handle/separator position if not set yet */
    if (initialCursorPosition === 0) initialCursorPosition = separatorPositionX;

    const cursorPositionDiff = (cursorPosition || currentCursorPosition) - initialCursorPosition;
    initialCursorPosition = (cursorPosition || currentCursorPosition);

    if (cursorPositionDiff === 0) return undefined;

    const movingDirection = cursorPositionDiff > 0 ? 1 /* RIGHT */ : -1 /* LEFT */;
    const cursorSeparatorPositionDiff = (cursorPosition || currentCursorPosition) - separatorPositionX;

    /* Prevent moving the handle if the mouse is not above it anymore */
    if (cursorSeparatorPositionDiff < 0 && movingDirection === 1) return undefined;
    if (cursorSeparatorPositionDiff > 0 && movingDirection === -1) return undefined;

    const leftCoinsToUnits = 10 ** DECIMALS[props.leftAsset];
    const rightCoinsToUnits = 10 ** DECIMALS[props.rightAsset];

    /* Amounts calculation */
    const fiatAmount = (Math.abs(cursorSeparatorPositionDiff) / root$.value.clientWidth)
        * totalNewFiatBalance.value;
    const leftUnits = leftActiveBar.value.balanceChange
        + (((fiatAmount / leftExchangeRate.value) * leftCoinsToUnits) * movingDirection);
    const rightUnits = rightActiveBar.value.balanceChange
        + (((fiatAmount / rightExchangeRate.value) * rightCoinsToUnits) * -movingDirection);

    /* Limits */
    if (props.fiatLimit && typeof props.fiatLimit === 'number') {
        if ((leftUnits / leftCoinsToUnits) * leftExchangeRate.value < -props.fiatLimit
            && movingDirection === -1) {
            return emitChange(props.leftAsset, -(props.fiatLimit / leftExchangeRate.value) * leftCoinsToUnits);
        }
        if ((rightUnits / rightCoinsToUnits) * rightExchangeRate.value < -props.fiatLimit
            && movingDirection === 1) {
            return emitChange(props.rightAsset, -(props.fiatLimit / rightExchangeRate.value) * rightCoinsToUnits);
        }
    }

    /* Don't allow to send more than the available balance */
    if (leftUnits < -(leftActiveBar.value.balance || 0) && movingDirection === -1) {
        return emitChange(props.leftAsset, -(leftActiveBar.value.balance || 0));
    }
    if (rightUnits < -(rightActiveBar.value.balance || 0) && movingDirection === 1) {
        return emitChange(props.rightAsset, -(rightActiveBar.value.balance || 0));
    }

    /* Otherwise, normal behavior */
    if (leftUnits <= 0) {
        return emitChange(props.leftAsset, leftUnits);
    }
    return emitChange(props.rightAsset, rightUnits);
}

function render() {
    animationFrameHandle = requestAnimationFrame(render);
    updateSwapBalanceBar();
    /* Upstream updates these in the render loop because watchers proved unreliable */
    updateConnectingLinesWidth();
    updateEquiPointVisibility();
}

onMounted(() => {
    document.body.addEventListener('mouseup', onMouseUp);
    document.body.addEventListener('touchend', onMouseUp);
    document.body.addEventListener('mousemove', onMouseMove);
    document.body.addEventListener('touchmove', onMouseMove);
    render();
});
onUnmounted(() => {
    document.body.removeEventListener('mouseup', onMouseUp);
    document.body.removeEventListener('touchend', onMouseUp);
    document.body.removeEventListener('mousemove', onMouseMove);
    document.body.removeEventListener('touchmove', onMouseMove);
    cancelAnimationFrame(animationFrameHandle);
});

/* Bars' width */
const remSize = computed(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
const widthToSubstractPercent = computed(() => Math.round(
    root$.value ? (((0.625 * remSize.value) // separator right margin & width
    + ((leftDistributionData.value.length - 1) * (0.875 * remSize.value))) // bar right margin & border width
    / root$.value.offsetWidth) * 100 : 0,
) / 100);

const getBarWidth = (barDef) =>
    (barDef.newFiatBalance / (totalNewFiatBalance.value * (1 + widthToSubstractPercent.value))) * 100;
const getChangeBarWidth = (barDef) =>
    barDef.balanceChange > 0
        ? (barDef.fiatBalanceChange / barDef.newFiatBalance) * 100
        : 0;

/* Connecting lines between icon and active bar (icons/SwapBalanceBar/CurvedLine.vue, inlined) */
const leftConnectingLineWidth = ref(0);
const rightConnectingLineWidth = ref(0);

function updateConnectingLinesWidth() {
    if (leftActiveBar$.value && leftActiveBar$.value.parentElement) {
        leftConnectingLineWidth.value = (leftActiveBar$.value.offsetWidth / 2)
            + (leftActiveBar$.value.offsetLeft) - (remSize.value * 2.5);
    }
    if (rightActiveBar$.value) {
        rightConnectingLineWidth.value = (rightActiveBar$.value.offsetWidth / 2) - (remSize.value * 2.5);
    }
}

function curvedLine(width, height = 35) {
    const minWidth = 2;
    const localWidth = width <= minWidth ? minWidth : Math.round(width);
    const angleSize = Math.max(8, Math.min(12, Math.sqrt(localWidth)));
    const y = Math.round(Math.max(3, Math.min(10, angleSize - (width / 10))));
    const x = Math.round(Math.max(0, Math.min(12, angleSize - (width / 10))));
    const d = `M 1 1 v 1 s 0 ${angleSize - y} ${angleSize - x} ${angleSize} `
        + `S ${localWidth - (((angleSize - x) * 2) + 1)} ${height - (angleSize + y + 3)} `
        + `${localWidth - (angleSize + 1) + x} ${height - (angleSize + 3)} `
        + `s ${angleSize - x} ${angleSize} ${angleSize - x} ${angleSize} v 1`;
    return { width: localWidth, d };
}

const leftLine = computed(() => curvedLine(leftConnectingLineWidth.value));
const rightLine = computed(() => curvedLine(rightConnectingLineWidth.value));

/* Equilibrium point */
const equiPointThreshold = 8;
const equiPointPositionX = ref(0);
const equiPointVisible = ref(false);
const animatingBars = ref(false);

function updateEquiPointVisibility() {
    if (!root$.value || !separator$.value) return;
    const { offsetLeft } = separator$.value;
    /* hide the point if close to the handle/separator */
    if (equiPointPositionX.value < ((offsetLeft + equiPointThreshold) / root$.value.offsetWidth) * 100
        && equiPointPositionX.value > ((offsetLeft - equiPointThreshold) / root$.value.offsetWidth) * 100) {
        equiPointVisible.value = false;
    } else {
        equiPointVisible.value = true;
    }
}

watch(() => [props.leftAsset, props.rightAsset], async () => {
    await nextTick();
    if (!separator$.value || !root$.value) return;
    equiPointPositionX.value = (separator$.value.offsetLeft / root$.value.offsetWidth) * 100;
});

function animatedReset() {
    animatingBars.value = true;
    emitChange(props.leftAsset, 0);
    setTimeout(() => {
        animatingBars.value = false;
    }, 200);
}

/* Emit click on active address for address selector overlay */
function onActiveAddressClick() {
    if (!backgroundAddresses.value || backgroundAddresses.value.length === 0) return;
    emit('on-active-address-click');
}

/* Move the separator to the cursor position or limit on click on an active bar */
let activeBarClickTimeoutId = 0;
function onActiveBarClick(asset, event) {
    if (!separator$.value || !event.target) return;

    clearTimeout(activeBarClickTimeoutId);
    animatingBars.value = true;

    if (asset === props.leftAsset) {
        const posX = separator$.value.getBoundingClientRect().left
            - (event.target.offsetWidth - event.offsetX);
        updateSwapBalanceBar(posX);
    } else if (asset === props.rightAsset) {
        const posX = separator$.value.getBoundingClientRect().right + event.offsetX;
        updateSwapBalanceBar(posX);
    }

    activeBarClickTimeoutId = window.setTimeout(() => {
        animatingBars.value = false;
    }, 200);
}
</script>

<style scoped>
/* SwapBalanceBar.vue scoped styles, verbatim (SCSS compiled, nimiq-blue(a) =
   rgba(31, 35, 72, a)). Wallet theme vars + utilities the component needs are
   defined on the root so the snippet is self-contained. */
.swap-balance-bar {
    --body-size: 2rem;
    --small-size: 1.75rem;
    --text-50: rgba(31, 35, 72, 0.5);
    --text-40: rgba(31, 35, 72, 0.4);
    --text-20: rgba(31, 35, 72, 0.2);
    --bitcoin-orange: #F7931A;
    --usdc-blue: #2775CA;
    --usdt-green: #009393;

    font-size: var(--body-size);
    color: var(--nimiq-blue, #1F2348);
    position: relative;
}

/* wallet global utilities */
.flex-column { display: flex; flex-direction: column; }
.flex-row { display: flex; flex-direction: row; }
button.reset {
    background: none;
    border: none;
    outline: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    font-weight: inherit;
    color: inherit;
    text-align: inherit;
    cursor: pointer;
}
button.reset:disabled { cursor: auto; }

/* @nimiq/vue-components Identicon base style */
.identicon { width: 10rem; }
.identicon :deep(img),
.identicon img { width: 100%; height: 100%; }

/* nimiq-style helpers (for standalone use without the legacy stylesheet) */
.nq-blue { color: var(--nimiq-blue, #1F2348) !important; }
.nq-light-blue-bg {
    background: var(--nimiq-light-blue, #0582CA);
    background-image: var(--nimiq-light-blue-bg,
        radial-gradient(100% 100% at bottom right, #265DD7, #0582CA));
}

.disabled {
    pointer-events: none !important;
}
.disabled .currency {
    color: rgba(31, 35, 72, 0.4) !important;
}
.disabled .currency :deep(svg),
.disabled .currency svg {
    color: rgba(31, 35, 72, 0.4) !important;
}
.disabled .currency .identicon-stack .disabled {
    position: absolute;
    inset: 0;
    background: #424242;
    z-index: 1;
    left: -2rem;
    right: -1rem;
    mix-blend-mode: color;
}
.disabled .bar {
    background-color: rgba(31, 35, 72, 0.1) !important;
    border: 0 !important;
}
.disabled .separator {
    background: rgba(31, 35, 72, 0.2) !important;
    background-image: none !important;
}
.disabled .handle {
    position: relative;
}
.disabled .handle .disabled {
    /* As the handle is a image, we create a mask to make it look disabled */
    position: absolute;
    inset: 0;
    background: white;
    opacity: 0.3;
    z-index: 5;
    border-radius: 999px;
}
.disabled .left-total-percent,
.disabled .right-total-percent {
    color: rgba(31, 35, 72, 0.4) !important;
}

.balance-bar-header {
    --header-height: 5.25rem;
    height: var(--header-height);
    justify-content: space-between;
    column-gap: 1rem;
}
.balance-bar-header > * label {
    font-weight: 600;
    line-height: 2.625rem;
}
.balance-bar-header > .currency svg {
    width: 5.25rem;
    height: 5.25rem;
}

.balance-bar-header > .currency {
    display: grid;
    grid-template-rows: 1fr 1fr;
    grid-template-columns: var(--currency-columns);
    grid-auto-flow: column;
    column-gap: var(--column-gap);
}
.balance-bar-header > .currency .identicon-stack,
.balance-bar-header > .currency svg {
    grid-row: 1 / span 2;
}
.balance-bar-header > .currency .amount {
    color: var(--text-50);
    font-size: var(--small-size);
    font-weight: 600;
}
.balance-bar-header > .currency.left {
    --currency-columns: 1fr auto;
}
.balance-bar-header > .currency.right {
    --currency-columns: auto 1fr;
}
.balance-bar-header > .currency.right > label,
.balance-bar-header > .currency.right > span {
    text-align: right;
}
.balance-bar-header > .currency.right svg {
    grid-column: 2;
}
.balance-bar-header > .currency.nimiq {
    --column-gap: 1.5rem;
    max-width: 65%;
    position: relative;
}
.balance-bar-header > .currency.nimiq.right {
    margin-right: 1rem;
}
.balance-bar-header > .currency.nimiq.left {
    margin-left: 1rem;
}
.balance-bar-header > .currency.nimiq > label {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    cursor: inherit;
}
.balance-bar-header > .currency.bitcoin,
.balance-bar-header > .currency.usdc,
.balance-bar-header > .currency.usdt {
    --column-gap: 2rem;
}

/* Button style for the nimiq address selector */
.balance-bar-header > .nimiq:not(.single):before {
    content: "";
    border-radius: 0.75rem;
    position: absolute;
    top: -.5rem;
    bottom: -.5rem;
    left: -1.5rem;
    right: -1.5rem;
    background: transparent;
    transition: background 400ms;
}
.balance-bar-header > .nimiq:not(.single):hover:before {
    background: var(--nimiq-highlight-bg, rgba(31, 35, 72, 0.06));
}
.balance-bar-header > .nimiq.single {
    cursor: default;
}

.balance-bar-header > .bitcoin svg {
    color: var(--bitcoin-orange);
}
.balance-bar-header > .usdc svg {
    color: var(--usdc-blue);
}
.balance-bar-header > .usdt svg {
    color: var(--usdt-green);
}

.identicon-stack {
    align-items: stretch;
    position: relative;
    overflow: visible;
}
.identicon-stack .identicon {
    height: auto;
}
.identicon-stack .primary {
    position: relative;
    width: var(--header-height);
}
.identicon-stack .secondary {
    width: 4.75rem;
    position: absolute;
    top: 50%;
    opacity: 0.4;
    transform: translateY(-50%) translateX(0);
    transition:
        transform 300ms var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1)),
        opacity 300ms var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1));
}
.identicon-stack .secondary:first-child {
    left: 1.5rem;
}
.identicon-stack .secondary:nth-child(2) {
    right: 1.5rem;
}
.nimiq:hover .identicon-stack .secondary:first-child,
.nimiq:focus .identicon-stack .secondary:first-child {
    transform: translateY(-50%) translateX(-0.375rem) scale(1.05);
    opacity: 0.5;
}
.nimiq:hover .identicon-stack .secondary:nth-child(2),
.nimiq:focus .identicon-stack .secondary:nth-child(2) {
    transform: translateY(-50%) translateX(0.375rem) scale(1.05);
    opacity: 0.5;
}

.connecting-lines {
    margin-top: .5rem;
    margin-bottom: -3rem;
    padding-left: 3.5rem;
}
.connecting-lines svg:last-child {
    position: absolute;
    right: 2.5rem;
}
/* CurvedLine.vue scoped styles */
.connecting-lines svg,
.connecting-lines svg path {
    overflow: visible;
}
.connecting-lines svg.left {
    transform: rotateY(180deg);
}
.connecting-lines svg path {
    transform: translate3d(0);
    transition-duration: 100ms;
    transition-property: d, viewBox;
}

.balance-bar {
    align-items: center;
}

.bar {
    height: 4.5rem;
    border-radius: 0.5rem;
    background-color: currentColor;
    border: .25rem solid currentColor;
    opacity: 0.25;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
    cursor: pointer;
    transform: translate3d(0, 0, 0);
    transition: opacity 300ms;
}
.animating .bar {
    transition: opacity 300ms, width 300ms;
}
.bar:not(:last-child) {
    margin-right: 0.375rem;
}
.bar:first-child,
.bar:last-child {
    border-radius: 1.2rem; /* upstream comment: should be 0.5rem, kept verbatim */
    --end-border-radius: 5rem;
}
.bar:first-child {
    border-top-left-radius: var(--end-border-radius);
    border-bottom-left-radius: var(--end-border-radius);
}
.bar:last-child {
    border-top-right-radius: var(--end-border-radius);
    border-bottom-right-radius: var(--end-border-radius);
}
.bar.active {
    opacity: 1;
    cursor: default;
}
.bar.bitcoin {
    background-color: var(--bitcoin-orange);
    border: .25rem solid var(--bitcoin-orange);
}
.bar.usdc {
    background-color: var(--usdc-blue);
    border: .25rem solid var(--usdc-blue);
}
.bar.usdt {
    background-color: var(--usdt-green);
    border: .25rem solid var(--usdt-green);
}
.bar .change {
    /* wallet assets/swap-change-background.svg, inlined */
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 36" width="9" height="36" fill="none" stroke="%23000" stroke-width="1.5" stroke-linecap="square"><path d="M.87 0L.65.38 0 1.5v4.8L3.63 0H.87zm4.5 0l-.22.38L0 9.3v4.79L8.13 0H5.37zM9 1.5L0 17.1v4.79l9-15.6V1.5zm0 7.8L0 24.89v4.8l9-15.6v-4.8zm0 7.8L0 32.67V36h.85l.22-.38L9 21.9v-4.8zm0 7.79L2.59 36h2.76l.22-.38L9 29.68v-4.8zm0 7.8L7.09 36H9v-3.32z" fill="%23fff" stroke="none"/></svg>') repeat-x top left;
    background-size: auto 100%;
    height: 100%;
    border-radius: 0.25rem;
    transform: translate3d(0, 0, 0);
}
.animating .bar .change {
    transition: width 300ms;
}
.bar.left {
    justify-content: flex-end;
}
.bar.left .change {
    background-position: top left;
}
.bar.right {
    justify-content: flex-start;
}
.bar.right .change {
    background-position: top right;
}

.separator {
    width: .25rem;
    margin-right: 0.375rem;
    height: 10.5rem;
    position: relative;
    flex-shrink: 0;
    touch-action: none;
    z-index: 2;
}
.separator .handle {
    --height: 4rem;
    --width: 4rem;
    height: var(--height);
    width: var(--width);
    /* wallet assets/horizontal-double-arrow.svg, inlined */
    background: white url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="8" fill="none" viewBox="0 0 16 8"><path fill="%231F2348" d="M15.1 3.42a.7.7 0 010 1.18l-4.02 2.6A.7.7 0 0110 6.62V1.4a.7.7 0 011.08-.59l4.02 2.61zM.9 4.6a.7.7 0 010-1.18L4.92.82A.7.7 0 016 1.4v5.22a.7.7 0 01-1.08.58L.9 4.6z"/></svg>') no-repeat center;
    border-radius: 100%;
    box-shadow:
        0px .5rem 2rem rgba(0, 0, 0, 0.07),
        0px .1875rem .375rem rgba(0, 0, 0, 0.05),
        0px .0421rem .25rem rgba(0, 0, 0, 0.025);
    position: absolute;
    top: calc(50% - (var(--height) / 2));
    left: calc(50% - (var(--width) / 2));
    cursor: grab;
}
.separator .handle:active {
    cursor: grabbing;
}

/* icons/SwapBalanceBar/SlideHint.vue, inlined */
.slide-hint {
    color: white;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
}
.slide-hint.right {
    left: 2.375rem;
}
.slide-hint.left {
    transform: translateY(-50%) rotateY(180deg);
    right: 2.375rem;
}
.slide-hint svg {
    height: 0.875rem;
    width: auto;
    transform: translateX(0);
    animation-name: fade-n-translate;
    animation-duration: 1.5s;
    animation-iteration-count: infinite;
}
.slide-hint svg:not(:first-child) {
    margin-left: 0.5rem;
}
.slide-hint svg:nth-child(1) { opacity: .5; animation-delay: 0ms; }
.slide-hint svg:nth-child(2) { opacity: .35; animation-delay: 100ms; }
.slide-hint svg:nth-child(3) { opacity: .2; animation-delay: 200ms; }
@keyframes fade-n-translate {
    100% {
        opacity: 0;
        transform: translateX(0.75rem);
    }
}
.slide-hint svg path {
    fill: currentColor;
}

.equilibrium-point {
    height: .5rem;
    width: .5rem;
    border-radius: 50%;
    cursor: pointer;
    position: absolute;
    bottom: .25rem;
    opacity: 1;
    transition: opacity 0.3s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1));
}
.equilibrium-point.hidden {
    visibility: hidden; /* nimiq-style global .hidden, inlined for standalone use */
    opacity: 0;
}

.scale {
    margin-top: -1rem;
    width: 100%;
    justify-content: space-between;
    align-items: center;
}
.scale .tenth {
    height: 1rem;
    line-height: 1rem;
    width: 20%;
    font-weight: bold;
    font-size: 1.625rem;
    letter-spacing: 0.0625rem;
    color: var(--text-50);
}
.scale .tenth:not(:last-child) {
    border-right: 0.1875rem solid var(--text-20);
}
.scale .tenth:last-child {
    text-align: right;
}
.scale .tenth > div {
    transition-property: visibility, opacity;
    transition-duration: 300ms;
}
.scale .tenth > div.hidden {
    visibility: hidden;
    opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 300ms;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
