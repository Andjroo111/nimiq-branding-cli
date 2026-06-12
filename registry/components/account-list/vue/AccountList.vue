<template>
    <div class="account-list">
        <component :is="!_isDisabled(account) && !editable ? 'a' : 'div'"
            href="javascript:void(0)"
            class="account-entry"
            v-for="account in accounts"
            :class="{
                'disabled': _isDisabled(account),
                'has-tooltip': _hasTooltip(account),
                'highlight-insufficient-balance': highlightedDisabledAddress === account.userFriendlyAddress
                    && _hasInsufficientBalance(account)
                    && !_isDisabledContract(account)
                    && !_isDisabledAccount(account),
            }"
            @click="accountSelected(account)"
            :key="account.userFriendlyAddress"
        >
            <!-- Upstream renders an <Account layout="row"> here; Account.vue has no
                 own registry entry, so its row markup is inlined (image/cashlink/
                 column/wallet-label variants are never used by AccountList). -->
            <div class="account row" :class="{ editable }">
                <div class="identicon-and-label">
                    <Identicon v-if="isValidAddress(account.userFriendlyAddress)"
                        :address="account.userFriendlyAddress"/>

                    <div v-if="!editable" class="label"
                        :class="{ 'address-font': isValidAddress(account.label) }">{{ account.label }}</div>
                    <div v-else class="label editable"
                        :class="{ 'address-font': isValidAddress(account.label) }">
                        <LabelInput :maxBytes="63" :value="account.label" :placeholder="account.defaultLabel"
                            :ref="(el) => setLabelInputRef(account.userFriendlyAddress, el)"
                            @input="accountChanged(account.userFriendlyAddress, $event)"/>
                    </div>
                </div>

                <Amount v-if="minBalance && (account.balance || account.balance === 0)"
                    class="balance" :amount="account.balance" :decimals="decimals"/>
            </div>

            <!-- CaretRightSmallIcon (caret-right-small.svg wrapped with class nq-icon) -->
            <svg v-if="!_isDisabled(account)" class="nq-icon caret" viewBox="0 0 10 11"
                xmlns="http://www.w3.org/2000/svg"><path d="M5.00098 2L8.53602 5.53603L5.00098 9.07107"
                stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round"/></svg>
            <Tooltip v-if="_hasTooltip(account)"
                :ref="(el) => setTooltipRef(account.userFriendlyAddress, el)"
                v-bind="{
                    preferredPosition: 'bottom left',
                    ...tooltipProps,
                    styles: {
                        width: '22.25rem',
                        pointerEvents: 'none',
                        ...(tooltipProps ? tooltipProps.styles : undefined),
                    },
                }"
                @click.stop
            >
                {{ _isDisabledContract(account)
                    ? $t('Contracts cannot be used for this operation.')
                    : $t('This address cannot be used for this operation.')
                }}
            </Tooltip>
        </component>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components AccountList.vue.
// Identicon.vue, Amount.vue, Tooltip.vue and LabelInput.vue come from the
// 'identicon', 'amount', 'tooltip' and 'label-input' registry components —
// copy them next to this file (see meta.json dependsOn).
import { ref } from 'vue';
import Identicon from './Identicon.vue';
import Amount from './Amount.vue';
import Tooltip from './Tooltip.vue';
import LabelInput from './LabelInput.vue';

export interface AccountInfo {
    userFriendlyAddress: string;
    label: string;
    balance: number;
    walletId?: string;
    defaultLabel?: string;
    path?: string; // present on real accounts, absent on contracts
}

const props = withDefaults(defineProps<{
    accounts: AccountInfo[],
    disabledAddresses?: string[],
    walletId?: string,
    editable?: boolean,
    decimals?: number,
    /** Balances render only when set; accounts below it count as insufficient. */
    minBalance?: number,
    disableContracts?: boolean,
    disabled?: boolean,
    tooltipProps?: Record<string, any>,
}>(), {
    disabledAddresses: () => [],
});

const emit = defineEmits<{
    (e: 'account-selected', walletId: string | undefined, address: string): void,
    (e: 'account-changed', address: string, label: string): void,
}>();

// I18nMixin's $t, stubbed as identity (en-US source strings).
const $t = (text: string) => text;

const highlightedDisabledAddress = ref<string | null>(null);
let highlightedDisabledAddressTimeout = -1;

const tooltipRefs = new Map<string, InstanceType<typeof Tooltip>>();
const labelInputRefs = new Map<string, InstanceType<typeof LabelInput>>();
function setTooltipRef(address: string, el: any) {
    if (el) tooltipRefs.set(address, el);
    else tooltipRefs.delete(address);
}
function setLabelInputRef(address: string, el: any) {
    if (el) labelInputRefs.set(address, el);
    else labelInputRefs.delete(address);
}

function focus(address: string) {
    if (props.editable && labelInputRefs.has(address)) {
        labelInputRefs.get(address)!.focus();
    }
}
defineExpose({ focus });

function accountSelected(account: AccountInfo) {
    if (props.disabled || props.editable) return;

    window.clearTimeout(highlightedDisabledAddressTimeout);
    if (account.userFriendlyAddress !== highlightedDisabledAddress.value) {
        _clearHighlightedDisabledAddress();
    }

    const isDisabledContract = _isDisabledContract(account);
    const isDisabledAccount = _isDisabledAccount(account);
    if (isDisabledContract
        || isDisabledAccount
        || _hasInsufficientBalance(account)) {
        highlightedDisabledAddress.value = account.userFriendlyAddress;
        const tooltip = tooltipRefs.get(highlightedDisabledAddress.value);
        if (tooltip) tooltip.show();
        const waitTime = isDisabledContract || isDisabledAccount ? 2000 : 300;
        highlightedDisabledAddressTimeout =
            window.setTimeout(() => _clearHighlightedDisabledAddress(), waitTime);
    } else {
        emit('account-selected', account.walletId || props.walletId, account.userFriendlyAddress);
    }
}

function accountChanged(address: string, label: string) {
    emit('account-changed', address, label);
}

function _isDisabled(account: AccountInfo) {
    return props.disabled || (!props.editable
        && (_isDisabledContract(account)
        || _isDisabledAccount(account)
        || _hasInsufficientBalance(account)));
}

function _isDisabledContract(account: AccountInfo) {
    return props.disableContracts && !('path' in account && account.path);
}

function _isDisabledAccount(account: AccountInfo) {
    return props.disabledAddresses.includes(account.userFriendlyAddress);
}

function _hasInsufficientBalance(account: AccountInfo) {
    return props.minBalance && account.balance < props.minBalance;
}

function _hasTooltip(account: AccountInfo) {
    return !props.disabled && !props.editable
        && (_isDisabledContract(account) || _isDisabledAccount(account));
}

function _clearHighlightedDisabledAddress() {
    if (!highlightedDisabledAddress.value) return;
    const tooltip = tooltipRefs.get(highlightedDisabledAddress.value);
    if (tooltip) tooltip.hide(/* force */ false); // hide tooltip if it's not hovered
    highlightedDisabledAddress.value = null;
}

// --- Inlined from @nimiq/utils@0.11.1 ValidationUtils.isValidAddress ---
// (Account.vue uses it to pick the monospace address font for address labels
// and to decide whether to render the Identicon.)

const NIMIQ_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY';

function ibanCheck(str: string): number {
    const num = str.split('').map((c) => {
        const code = c.toUpperCase().charCodeAt(0);
        return code >= 48 && code <= 57 ? c : (code - 55).toString();
    }).join('');
    let tmp = '';
    for (let i = 0; i < Math.ceil(num.length / 6); i++) {
        tmp = (parseInt(tmp + num.substr(i * 6, 6), 10) % 97).toString();
    }
    return parseInt(tmp, 10);
}

function alphabetCheck(str: string): boolean {
    str = str.toUpperCase();
    for (let i = 0; i < str.length; i++) {
        if (!NIMIQ_ALPHABET.includes(str[i])) return false;
    }
    return true;
}

function isValidAddress(str?: string): boolean {
    if (!str) return false;
    str = str.replace(/ /g, '');
    if (str.substr(0, 2).toUpperCase() !== 'NQ') return false;
    if (str.length !== 36) return false;
    if (!alphabetCheck(str)) return false;
    if (ibanCheck(str.substr(4) + str.substr(0, 4)) !== 1) return false;
    return true;
}
</script>

<style scoped>
    /* AccountList.vue scoped styles, verbatim ('>>>' -> ':deep()') */
    .account-list {
        flex-grow: 1;
    }

    .account-entry {
        display: block;
        transition: background-color .3s var(--nimiq-ease);
        border-radius: 0.5rem;
        margin: 0.5rem 2rem;
        position: relative;
        color: inherit;
        text-decoration: none;
    }

    .account-entry :deep(.identicon img) {
        transform: scale(0.9);
        transition: transform .45s var(--nimiq-ease);
    }

    .account-entry .label,
    .account-entry .balance {
        transition: opacity .3s var(--nimiq-ease), color .3s var(--nimiq-ease), margin-right .45s var(--nimiq-ease);
    }

    .account-entry .caret,
    .account-entry :deep(.tooltip) {
        position: absolute;
        right: 2rem;
        top: 3.625rem;
        font-size: 2rem;
    }

    .account-entry .caret {
        transform: translateX(3rem);
        opacity: 0;
        transition: transform .45s var(--nimiq-ease), opacity .35s .1s var(--nimiq-ease);
    }

    a.account-entry:focus {
        outline: none;
    }

    a.account-entry:focus::after {
        content: "";
        position: absolute;
        left: -0.625rem;
        top: -0.625rem;
        right: -0.625rem;
        bottom: -0.625rem;
        border: 0.25rem solid rgba(5, 130, 202, 0.5); /* Based on Nimiq Light Blue */
        border-radius: 1rem;
        pointer-events: none;
    }

    a.account-entry:hover,
    a.account-entry:focus {
        background-color: rgba(31, 35, 72, 0.06); /* Based on Nimiq Blue */
    }

    a.account-entry:hover :deep(.identicon img),
    a.account-entry:focus :deep(.identicon img) {
        transform: scale(1);
    }

    a.account-entry:hover .label,
    a.account-entry:hover .balance,
    a.account-entry:focus .label,
    a.account-entry:focus .balance {
        opacity: 1;
    }

    a.account-entry:hover .balance,
    a.account-entry:focus .balance,
    .account-entry.has-tooltip .balance {
        margin-right: 3rem; /* make space for caret or tooltip trigger */
    }

    a.account-entry:hover .balance,
    a.account-entry:focus .balance {
        color: var(--nimiq-green);
    }

    a.account-entry:hover .caret,
    a.account-entry:focus .caret {
        transform: translateX(0);
        opacity: 0.23;
    }

    .account-entry.disabled {
        cursor: not-allowed;
    }

    .account-entry.disabled :deep(.identicon),
    .account-entry.disabled .label,
    .account-entry.disabled .balance {
        opacity: 0.2;
    }

    .account-entry.highlight-insufficient-balance .balance {
        color: var(--nimiq-red);
        opacity: 1;
    }

    /* Account.vue scoped styles (row layout), inlined with the row markup */
    .account {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.75rem 2rem;
        box-sizing: border-box;
        flex-shrink: 0;
        font-size: 2rem;
        line-height: 1.2;
        overflow: hidden; /* hide chevron right on hover */
        width: 100%;
        flex-direction: row;
    }

    .identicon-and-label {
        display: flex;
        align-items: center;
        flex-direction: row;
        overflow: hidden;
        min-width: 5.625rem;
        flex-grow: 1;
    }

    .account :deep(.identicon) {
        flex-shrink: 0;
        position: relative;
        width: 5.625rem;
        height: 5.625rem;
        margin-right: 1.5rem;
    }

    .label {
        overflow: hidden;
        white-space: nowrap;
        font-weight: 600;
        mask-image: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        flex-grow: 1;
    }

    .label:not(.editable) {
        opacity: 0.7;
        padding-left: 1rem;
    }

    .label.address-font {
        font-family: "Fira Mono", "Andale Mono", monospace;
        font-weight: normal;
        text-transform: uppercase;
    }

    .balance {
        flex-shrink: 0;
        margin-left: 1rem;
        font-weight: bold;
        opacity: 0.7;
    }
</style>
