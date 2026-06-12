<script setup>
/**
 * Nimiq TransactionList — Vue 3 port of the wallet's transaction history list
 * (upstream/wallet/src/components/TransactionListItem.vue rows + the month
 * headers from TransactionList.vue).
 *
 * Upstream rows take a store-backed `transaction` and resolve peer/fiat/date
 * through composables (useTransactionInfo, useFormattedDate); this port takes
 * plain display objects instead and inlines those helpers:
 *
 *   transactions: Array<{
 *     transactionHash: string,
 *     peerAddress:     string,        // user-friendly NQ.. address (chunked)
 *     peerLabel?:      string,        // rendered instead of the address if set
 *     value:           number,        // luna (1 NIM = 1e5 luna)
 *     isIncoming:      boolean,
 *     timestamp:       number,        // ms — drives day/month/time + grouping
 *     fiatValue?:      number,        // undefined => loading placeholder bar
 *     fiatCurrency?:   string,
 *     message?:        string,        // optional "· message" after the time
 *   }>
 *
 * Requires the Nimiq legacy stylesheet (nimiq-style.min.css) for --nimiq-*
 * vars and html{font-size:8px}, plus the Fira Mono webfont.
 * npm dep: @nimiq/iqons (identicon generation).
 */
import { computed, onMounted, ref, watch } from 'vue';
import Iqons from '@nimiq/iqons';

const props = defineProps({
    transactions: { type: Array, required: true },
    fiatCurrency: { type: String, default: 'usd' },
});

const emit = defineEmits(['transaction-click']);

// --- date formatting (useFormattedDate.ts, inlined) ---
const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
const twoDigit = (n) => String(n).padStart(2, '0');
const dateDay = (ts) => twoDigit(new Date(ts).getDate());
const dateMonth = (ts) => monthFormatter.format(new Date(ts));
const dateTime = (ts) => {
    const d = new Date(ts);
    return `${twoDigit(d.getHours())}:${twoDigit(d.getMinutes())}`;
};

// --- amount formatting (NumberFormatting.calculateDisplayedDecimals, simplified) ---
function formatNim(luna) {
    const nim = luna / 1e5;
    const decimals = nim >= 1000 ? 0 : nim % 1 === 0 ? 1 : Math.min(5, (String(nim).split('.')[1] || '').length);
    const [int, frac] = nim.toFixed(decimals).split('.');
    // U+202F narrow no-break space grouping above 4 integer digits
    const grouped = int.length > 4 ? int.replace(/(\d)(?=(\d{3})+$)/g, '$1 ') : int;
    return frac ? `${grouped}.${frac}` : grouped;
}

const fiatFormatter = computed(() => new Intl.NumberFormat('en', {
    style: 'currency', currency: props.fiatCurrency.toUpperCase(),
}));

// --- month grouping (TransactionList.vue month separators, inlined) ---
const groups = computed(() => {
    const out = [];
    let current = null;
    for (const tx of props.transactions) {
        const d = new Date(tx.timestamp);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!current || current.key !== key) {
            current = { key, label: monthFormatter.format(d), txs: [] };
            out.push(current);
        }
        current.txs.push(tx);
    }
    return out;
});

// --- identicons (@nimiq/iqons) ---
const root = ref(null);
async function renderIdenticons() {
    if (!root.value) return;
    for (const el of root.value.querySelectorAll('.identicon[data-address]')) {
        el.querySelector('img').src = await Iqons.toDataUrl(el.dataset.address);
    }
}
onMounted(renderIdenticons);
watch(() => props.transactions, renderIdenticons, { flush: 'post' });
</script>

<template>
    <div ref="root" class="transaction-list">
        <template v-for="group in groups" :key="group.key">
            <div class="month-label"><label>{{ group.label }}</label></div>

            <button v-for="tx in group.txs" :key="tx.transactionHash"
                class="transaction confirmed"
                @click="emit('transaction-click', tx)"
            >
                <div class="date">
                    <span class="day">{{ dateDay(tx.timestamp) }}</span><br>
                    <span class="month">{{ dateMonth(tx.timestamp) }}</span>
                </div>
                <div class="identicon" :data-address="tx.peerAddress">
                    <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'/>"
                        alt="Nimiq identicon">
                </div>
                <div class="data">
                    <div v-if="tx.peerLabel" class="label">{{ tx.peerLabel }}</div>
                    <div v-else class="address">{{ tx.peerAddress }}</div>
                    <div class="time-and-message">
                        <span>{{ dateTime(tx.timestamp) }}</span>
                        <span v-if="tx.message" class="message"><strong class="dot">&middot;</strong>{{
                            tx.message }}</span>
                    </div>
                </div>
                <div class="amounts" :class="{ isIncoming: tx.isIncoming }">
                    <span class="amount">{{ formatNim(tx.value) }} <span class="currency nim">NIM</span></span>
                    <div v-if="tx.fiatValue === undefined" class="fiat-amount fiat-loading">&nbsp;</div>
                    <div v-else class="fiat-amount">{{ fiatFormatter.format(tx.fiatValue) }}</div>
                </div>
            </button>
        </template>
    </div>
</template>

<style src="../html/transaction-list.css"></style>
