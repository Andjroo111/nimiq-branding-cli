<template>
    <div class="account-selector">
        <div ref="container$" class="container" :class="{'extra-spacing': wallets.length === 1}">
            <div v-for="wallet in sortedWallets" :key="wallet.id">
                <div v-if="wallets.length > 1 || isWalletDisabled(wallet)" class="wallet-label">
                    <div class="nq-label">
                        {{ wallet.label }}
                        <span v-if="highlightBitcoinAccounts && wallet.btcXPub" class="pill btc-pill">BTC</span>
                        <span
                            v-if="highlightUsdcAccounts && wallet.polygonAddresses && wallet.polygonAddresses.length"
                            class="pill usdc-pill">USDC</span>
                    </div>
                    <Tooltip
                        v-if="isWalletDisabled(wallet)"
                        :ref="(el) => setTooltipRef(wallet.id, el)"
                        v-bind="{
                            ...tooltipProps,
                            styles: {
                                width: '25.25rem',
                                ...tooltipProps.styles,
                            },
                        }"
                    >
                        {{ $t(`${getAccountTypeName(wallet)} accounts cannot be used for this operation.`) }}
                    </Tooltip>
                </div>
                <AccountList
                    :accounts="sortAccountsAndContracts(listAccountsAndContracts(wallet))"
                    :disabledAddresses="disabledAddresses"
                    :walletId="wallet.id"
                    :minBalance="minBalance"
                    :decimals="decimals"
                    :disableContracts="disableContracts"
                    :disabled="isWalletDisabled(wallet)"
                    :tooltipProps="tooltipProps"
                    @account-selected="(walletId, address) => emit('account-selected', walletId, address)"
                    @click="onWalletClicked(wallet)"
                />
            </div>
        </div>

        <div class="footer">
            <button v-if="allowLogin" class="nq-button-s" @click="emit('login')">
                {{ $t('Login to another account') }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components AccountSelector.vue.
// AccountList.vue and Tooltip.vue come from the 'account-list' and 'tooltip'
// registry components — copy them next to this file (see meta.json dependsOn).
import { computed, onMounted, ref } from 'vue';
import AccountList from './AccountList.vue';
import Tooltip from './Tooltip.vue';

// Reduced property lists, as upstream (for convenience)
export interface ContractInfo {
    label: string;
    userFriendlyAddress: string;
    balance?: number;
    walletId?: string;
}

export interface AccountInfo {
    path: string;
    label: string;
    userFriendlyAddress: string;
    balance?: number;
    walletId?: string;
}

export interface WalletInfo {
    id: string;
    label: string;
    /** Upstream keys accounts in a Map<address, AccountInfo>; a plain array works too. */
    accounts: Map<string, AccountInfo> | AccountInfo[];
    contracts: ContractInfo[];
    /** 1 = legacy, 2 = BIP39 (Keyguard), 3 = Ledger */
    type: number;
    keyMissing?: boolean;
    btcXPub?: string;
    polygonAddresses?: Array<{
        path: string;
        address: string;
        balance?: number;
    }>;
}

const props = withDefaults(defineProps<{
    wallets: WalletInfo[],
    disabledAddresses?: string[],
    decimals?: number,
    /** Balances render only when set; wallets and accounts below it sort to the end. */
    minBalance?: number,
    disableContracts?: boolean,
    disableLegacyAccounts?: boolean,
    disableBip39Accounts?: boolean,
    disableLedgerAccounts?: boolean,
    highlightBitcoinAccounts?: boolean,
    highlightUsdcAccounts?: boolean,
    allowLogin?: boolean,
}>(), {
    disabledAddresses: () => [],
    allowLogin: true,
});

const emit = defineEmits<{
    (e: 'account-selected', walletId: string | undefined, address: string): void,
    (e: 'login'): void,
}>();

// I18nMixin's $t, stubbed as identity (en-US source strings).
const $t = (text: string) => text;

const container$ = ref<HTMLElement | null>(null);

const tooltipProps = ref<Record<string, any>>({
    container: null, // set in the mounted hook
    preferredPosition: 'bottom right',
    margin: {
        left: 16,
        right: 16,
        top: 32, // avoid that tooltips get affected by mask image
        bottom: 32,
    },
    styles: {
        pointerEvents: 'none',
    },
});

onMounted(() => {
    tooltipProps.value.container = { $el: container$.value as HTMLElement };
});

function accountValues(accounts: WalletInfo['accounts']): AccountInfo[] {
    return Array.isArray(accounts) ? accounts : [...accounts.values()];
}

// Upstream filter 'listAccountsAndContracts'
function listAccountsAndContracts(wallet: WalletInfo): Array<AccountInfo | ContractInfo> {
    return [...accountValues(wallet.accounts), ...wallet.contracts];
}

// Upstream filter 'sortAccountsAndContracts'
function sortAccountsAndContracts(
    accounts: Array<AccountInfo | ContractInfo>,
): Array<AccountInfo | ContractInfo> {
    if (!props.minBalance) return accounts;

    return accounts.slice(0).sort((a, b) => {
        // sort disabled contracts to the end
        const aIsDisabledContract = props.disableContracts && !('path' in a && a.path);
        const bIsDisabledContract = props.disableContracts && !('path' in b && b.path);
        if (aIsDisabledContract && !bIsDisabledContract) return 1;
        if (!aIsDisabledContract && bIsDisabledContract) return -1;

        // sort disabled addresses below other addresses
        const aIsDisabledAddress = props.disabledAddresses.includes(a.userFriendlyAddress);
        const bIsDisabledAddress = props.disabledAddresses.includes(b.userFriendlyAddress);
        if (aIsDisabledAddress && !bIsDisabledAddress) return 1;
        if (!aIsDisabledAddress && bIsDisabledAddress) return -1;

        // sort accounts with insufficient funds below accounts with enough balance
        if ((!a.balance || a.balance < props.minBalance!) && b.balance && b.balance >= props.minBalance!) return 1;
        if ((!b.balance || b.balance < props.minBalance!) && a.balance && a.balance >= props.minBalance!) return -1;

        return 0;
    });
}

const sortedWallets = computed<WalletInfo[]>(() => props.wallets.slice(0).sort((a, b) => {
    const aDisabled = isWalletDisabled(a);
    const bDisabled = isWalletDisabled(b);

    if (aDisabled && !bDisabled) return 1;
    if (!aDisabled && bDisabled) return -1;

    if (!props.minBalance) return 0; // don't sort by balance if no minBalance required

    const hasAddressWithSufficientBalance = (wallet: WalletInfo) =>
        accountValues(wallet.accounts).some((account) => (account.balance ?? 0) >= props.minBalance!)
            || (!props.disableContracts
                && wallet.contracts.some((contract) => (contract.balance ?? 0) >= props.minBalance!));

    const aHasAddressWithSufficientBalance = hasAddressWithSufficientBalance(a);
    const bHasAddressWithSufficientBalance = hasAddressWithSufficientBalance(b);

    if (!aHasAddressWithSufficientBalance && bHasAddressWithSufficientBalance) return 1;
    if (aHasAddressWithSufficientBalance && !bHasAddressWithSufficientBalance) return -1;

    return 0;
}));

function isWalletDisabled(wallet: WalletInfo): boolean {
    return (props.disableLegacyAccounts && wallet.type === 1) /* LEGACY */
        || (props.disableBip39Accounts && wallet.type === 2) /* BIP39 */
        || (props.disableLedgerAccounts && wallet.type === 3) /* LEDGER */
        || false;
}

function getAccountTypeName(wallet: WalletInfo): string {
    switch (wallet.type) {
        case 1: return $t('Legacy');
        case 2: return 'Keyguard';
        case 3: return 'Ledger';
        default: throw new Error(`Unknown account type ${wallet.type}`);
    }
}

const tooltipRefs = new Map<string, InstanceType<typeof Tooltip>>();
function setTooltipRef(walletId: string, el: any) {
    if (el) tooltipRefs.set(walletId, el);
    else tooltipRefs.delete(walletId);
}

let shownTooltip: InstanceType<typeof Tooltip> | null = null;
let hideTooltipTimeout = -1;

function onWalletClicked(wallet: WalletInfo) {
    window.clearTimeout(hideTooltipTimeout);
    const tooltip = tooltipRefs.get(wallet.id) || null;
    if (shownTooltip && shownTooltip !== tooltip) {
        shownTooltip.hide(/* force */ false);
    }
    if (tooltip) {
        tooltip.show();
        hideTooltipTimeout = window.setTimeout(() => {
            tooltip.hide(/* force */ false);
            shownTooltip = null;
        }, 2000);
    }
    shownTooltip = tooltip;
}
</script>

<style scoped>
    .account-selector {
        overflow: auto;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        height: 400px;
    }

    .container {
        overflow-y: auto;
        padding-top: 0.5rem;
        padding-bottom: 4rem;
        flex-grow: 1;
        mask-image: linear-gradient(0deg , rgba(255,255,255,0), rgba(255,255,255, 1) 4rem,
            rgba(255,255,255,1) calc(100% - 4rem), rgba(255,255,255,0));
    }

    .container.extra-spacing {
        padding-top: 3rem;
    }

    .wallet-label {
        margin: 3.5rem 2rem 2rem 3rem;
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .wallet-label .nq-label {
        margin: 0;
    }

    .wallet-label :deep(.tooltip) {
        margin-left: 1rem;
    }

    .wallet-label::after {
        content: '';
        display: block;
        flex-grow: 1;
        height: 1px;
        margin-left: 2rem;
        background: rgba(31, 35, 72, 0.1);
    }

    .pill {
        color: white;
        font-weight: bold;
        font-size: 1.5rem;
        padding: 0.25rem 0.75rem;
        border-radius: 2rem;
        margin-left: 0.5rem;
        letter-spacing: 0;
    }

    .btc-pill {
        background: #F7931A; /* Bitcoin orange */
    }

    .usdc-pill {
        background: #2775CA; /* USDC blue */
    }

    .footer {
        padding: 4rem 0 3rem;
        margin-top: -4rem;
        text-align: center;
    }

    .nq-button-s {
        margin: auto;
        pointer-events: all;
    }
</style>
