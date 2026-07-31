<template>
    <div class="swap-animation flex-column">
        <div class="success-background flex-column nq-green-bg" :class="{'visible': state === SwapState.COMPLETE}">
            <!-- CheckmarkIcon (checkmark.svg from @nimiq/style), verbatim -->
            <svg class="nq-icon" width="74" height="74" viewBox="0 0 74 74" xmlns="http://www.w3.org/2000/svg"><path d="M71.12 1.84a4.5 4.5 0 0 0-6.28 1.04l-42.1 58.74L8.68 47.54a4.5 4.5 0 1 0-6.36 6.37l17.8 17.81a4.57 4.57 0 0 0 6.84-.56l45.2-63.03a4.5 4.5 0 0 0-1.04-6.29z" fill="currentColor" stroke="currentColor" stroke-width=".8"/></svg>
            <h1 class="title nq-h1">Atomic Swap successful!</h1>
        </div>

        <div class="expired-background flex-column nq-orange-bg" :class="{'visible': state === SwapState.EXPIRED}">
            <!-- CloseButton (@nimiq/vue-components), simplified: plain button + close.svg from @nimiq/style -->
            <button class="close-button top-right" @click="$emit('cancel')" @mousedown.prevent>
                <svg class="nq-icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.528 3.52c4.683-4.684 12.275-4.686 16.96-.005 4.678 4.69 4.678 12.28 0 16.97-4.685 4.68-12.277 4.678-16.96-.005-4.682-4.684-4.682-12.276 0-16.96zm13.145 13.133a1 1 0 0 0 .036-1.374l-3.11-3.11a.25.25 0 0 1 0-.352l3.11-3.11a1 1 0 1 0-1.414-1.415l-3.11 3.11a.25.25 0 0 1-.354 0l-3.11-3.11a1 1 0 0 0-1.41 1.415l3.11 3.11a.249.249 0 0 1 0 .353l-3.11 3.109a1 1 0 0 0 0 1.415c.396.38 1.021.38 1.416 0l3.109-3.11a.252.252 0 0 1 .354 0l3.11 3.11a1 1 0 0 0 1.373-.041z" fill="currentColor"/></svg>
            </button>
            <div class="flex-grow"></div>
            <!-- StopwatchIcon (stopwatch.svg from @nimiq/style), verbatim -->
            <svg class="nq-icon" width="98" height="123" viewBox="0 0 98 123" xmlns="http://www.w3.org/2000/svg"><path d="M85.7 42.3l8-8a5.1 5.1 0 1 0-7.3-7.2l-8.2 8.2c-7-5.2-15.4-8.5-24-9.4V10.3h10.2a5.1 5.1 0 0 0 0-10.3H33.6a5.1 5.1 0 0 0 0 10.3H44v15.6a48.7 48.7 0 1 0 41.8 16.4zM49 112.8a38.4 38.4 0 1 1 0-77 38.4 38.4 0 0 1 0 77z M54.2 48.6a5.1 5.1 0 0 0-10.3 0V74a5.2 5.2 0 0 0 5.2 5.1 5.1 5.1 0 0 0 5-5V48.5z" fill="currentColor"/></svg>
            <h1 class="title nq-h1">The swap expired</h1>
            <p class="expired-text">
                No funds were received so the swap expired.<br>
                Any funds sent will be refunded.
            </p>
            <div class="flex-grow"></div>
            <span class="swap-id-notice">Please keep your Swap ID for reference.</span>
            <span class="expired-swap-id">{{ swapId }}</span>
        </div>

        <div class="nq-card-header">
            <h1 class="nq-h1">Performing Atomic Swap</h1>
            <div class="nq-notice nq-gray">This swap is as decentralized as the blockchain itself.</div>
        </div>

        <div class="animation flex-row" :class="[swapDirection, animationClassName]">
            <!-- Tooltip (@nimiq/vue-components), simplified to a CSS-only hover/focus tooltip -->
            <!-- eslint-disable max-len -->
            <span class="tooltip left" :class="assetToCurrency(leftAsset)">
                <a href="javascript:void(0);" tabindex="0" class="trigger">
                    <div class="piece-container">
                        <svg v-if="leftAsset === SwapAsset.NIM" xmlns="http://www.w3.org/2000/svg" width="177" height="96" viewBox="0 0 177 96" class="piece" :style="`color: ${leftColor}`">
                            <g class="lines" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
                                <path opacity=".25" d="M10.5 68.63L1.62 53.12a6.5 6.5 0 01-.86-3.22V4A3.26 3.26 0 014 .75h76.6" />
                                <path opacity=".25" d="M95.71 67.27l8.88-15.52a7.69 7.69 0 000-7.63l-7.41-13a1.69 1.69 0 011.47-2.52H100a3.3 3.3 0 012.86 1.65l7.69 13.29a8.66 8.66 0 010 8.59l-7 12.39a1.87 1.87 0 001.63 2.8h13.1a4.31 4.31 0 003.75-2.18c1.76-3.06 5-8.76 6.47-11.49a2.49 2.49 0 012.16-1.31c.53 0 1.19 0 2-.13a1.65 1.65 0 011.62 2.42c-.52 1-.94 1.69-.94 1.69L124 72.76l-1.57 2.76a6.36 6.36 0 01-5.54 3.23H98.44A5.16 5.16 0 0094 81.37l-4.79 8.51c-2.53 4.85-5.56 5.37-10 5.37H4A3.25 3.25 0 01.75 92V62.63" />
                                <path opacity=".25" d="M143.52 77.58c-.15-.29-.28-.59-.41-.89a17.28 17.28 0 01-.17-13 1.5 1.5 0 00-1.42-2h-3.28a2.77 2.77 0 00-2.41 1.4l-7.22 12.64a2 2 0 001.78 3.07h5.37a2.13 2.13 0 011.85 3.19l-3.33 5.83a4 4 0 01-3.44 2l-29.16.11" />
                                <path opacity=".25" d="M6.27 12.82l3-5.54a2.07 2.07 0 011.81-1.07h2.66A1.45 1.45 0 0115 8.41l-8 14a5.24 5.24 0 00-.71 2.65v5.64a1.08 1.08 0 002 .53L21.11 8.81a4.94 4.94 0 014.29-2.49h53.17a7.15 7.15 0 016.16 3.54l5.74 9.87a6.5 6.5 0 005.6 3.27h6.83a2.4 2.4 0 002.21-1.78c.72-2.07.88-6.29 5.85-12a1.76 1.76 0 00-1.3-2.92l-11.33-.2a1.6 1.6 0 00-1.59 2.34l3.8 6.8a1.41 1.41 0 01-1.23 2.09h-1.86a3.48 3.48 0 01-3-1.75L87.73 3.74a2 2 0 011.74-3h51.13a2.68 2.68 0 012.4 3.87 3.45 3.45 0 01-2.11 1.75 4.69 4.69 0 01-3 .06 20.75 20.75 0 00-24.82 30c1.77 3.11 5.29 6.8 4.75 12.19a14.44 14.44 0 01-2.29 6.11c-.67 1.21-1.74 3.07-2.59 4.56a1.58 1.58 0 001.38 2.37H116a3 3 0 002.63-1.52l3.37-5.86a27.51 27.51 0 001.48-3 13.29 13.29 0 00.49-3.86 1.36 1.36 0 011.66-1.37A21.08 21.08 0 00136.6 46a5.07 5.07 0 011.4-.2c2.52 0 5.23 1.64 5.23 4.09v3.54c0 1.92 1.94 3.11 3.74 3.11a3.48 3.48 0 002-.61 17.19 17.19 0 0110.91-3.16 17.25 17.25 0 01-.88 34.48 16.65 16.65 0 01-9.52-2.87c-3.27-2.31-6.23.25-6.23 2.19V92a3.25 3.25 0 01-3.25 3.25H95.62A1.92 1.92 0 0194 92.38l3-5.21a5.81 5.81 0 015-2.92h29.7" />
                                <path opacity=".25" d="M39.61 89.77h22.16l16.55.09a7.52 7.52 0 006.53-3.73l5.81-10a6.59 6.59 0 015.7-3.28h21.48" />
                                <path opacity=".25" d="M25.57 23l-12 20.9a8.3 8.3 0 000 8.28l4.22 7.33a4.33 4.33 0 003.73 2.17h1.37a4.32 4.32 0 013.73 2.18l9.73 17a6.71 6.71 0 005.84 3.4h33.67a6.72 6.72 0 005.82-3.4L98.53 51.4a6.85 6.85 0 000-6.8L81.7 15.15a6.74 6.74 0 00-5.84-3.4H25.59" />
                                <path opacity=".25" d="M22.06 56l-2.58-4.6a6.87 6.87 0 010-6.8l14-24.53a1.83 1.83 0 00-1.59-2.74h-7.83a2.59 2.59 0 00-2.25 1.31L7.3 43.94a8 8 0 000 7.93L14.66 65a4.51 4.51 0 003.93 2.3h1a4.49 4.49 0 013.9 2.26l9.59 16.74A2.38 2.38 0 0131 89.84l-6.32-.07" />
                                <path opacity=".25" d="M92.49 45.12l-14.27-25a5.71 5.71 0 00-5-2.88H44.73a5.72 5.72 0 00-4.94 2.88l-14.28 25a5.85 5.85 0 000 5.76l14.27 25a5.71 5.71 0 004.95 2.88h28.54a5.72 5.72 0 004.94-2.88l14.27-25a5.78 5.78 0 00.01-5.76z" />
                                <circle opacity=".25" cx="159" cy="70" r="10.75" />
                            </g>
                            <path class="fill" fill="currentColor" fill-rule="evenodd" d="M159 52a17.93 17.93 0 00-10.42 3.32c-1.61 1.15-4.58 0.09 -4.58 -1.89v-3.54c0-3.42 -4.31 -5.55 -7.6 -4.63a20 20 0 111.23-38.13c2.75 1 6.37-0.82 6.37 -3.73a3.4 3.4 0 00-3.4-3.4H4a4 4 0 00-4 4v88a4 4 0 004 4h136a4 4 0 004-4v-5.43c0-2 3 -3 4.58 -1.89A18 18 0 10159 52zzM159 80a10 10 0 1110-10a10 10 0 01-10 10z" />
                            <g class="info-icon" stroke="#fff" opacity=".5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="15.02" cy="81" r="6" fill="none" stroke-width="1.5"/>
                                <circle cx="15.02" cy="78.5" r=".5" fill="white" stroke-width="0.6"/>
                                <path d="M15.02 81l0 2" stroke-width="1.5"/>
                            </g>
                            <g class="identicon">
                                <path class="identicon-border" fill="#1F2348" d="M87.35 45.56L75.27 24.44A4.82 4.82 0 0071.08 22H46.92a4.81 4.81 0 00-4.18 2.44L30.65 45.56a4.89 4.89 0 000 4.88l12.08 21.12A4.82 4.82 0 0046.92 74h24.16a4.81 4.81 0 004.18-2.44l12.09-21.12a4.89 4.89 0 000-4.88z" />
                                <image :href="identiconUrl" x="30" y="19" width="58" height="58" />
                            </g>
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="177" height="96" viewBox="0 0 177 96" class="piece" :style="`color: ${leftColor}`">
                            <g class="lines" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
                                <path opacity=".25" d="M88.83 55.44a30.74 30.74 0 11-22.39-37.27 30.74 30.74 0 0122.39 37.27zm41.8 28.85H99a4.12 4.12 0 00-2.9 1.21 51.15 51.15 0 01-4.35 3.85 2.72 2.72 0 01-1.69.58H90A2.73 2.73 0 0188.34 85a48.25 48.25 0 005-4.53 5.6 5.6 0 014.09-1.75h27.54a3.33 3.33 0 003.08-2 75.89 75.89 0 003.51-10.65h0a75.31 75.31 0 001.89-11 2.77 2.77 0 00-2.8-3h0a2.73 2.73 0 00-2.67 2.46 70.51 70.51 0 01-1.76 10.22h0v0a3.26 3.26 0 01-3.22 2.5h-11.16a2.64 2.64 0 01-2.53-3.41q.48-1.51.87-3.09h0a52.85 52.85 0 001.45-16.41"/>
                                <path opacity=".25" d="M25.62 23a41.8 41.8 0 00-6.92 35.86 3.8 3.8 0 003.68 2.78H23a3.77 3.77 0 013.39 2.15 36.24 36.24 0 0051.8 15M36 6.22H21.21a6.73 6.73 0 00-4.9 2.14A57.74 57.74 0 009 18.18a1.43 1.43 0 01-2.65-.73v-3.13a7.31 7.31 0 011.34-4 35.07 35.07 0 013.2-4m81.69 66.51v-.06a41.57 41.57 0 006.93-14.67h0a41.52 41.52 0 00-1.81-25.76 2.75 2.75 0 012.54-3.79h0a2.78 2.78 0 012.57 1.75 47 47 0 012 29.13h0a47.28 47.28 0 01-4.16 10.84 1.72 1.72 0 001.51 2.54h21.42"/>
                                <path opacity=".25" d="M24.71 89.75H59a41.71 41.71 0 0011.6-1.65 42 42 0 0013.79-7 5.26 5.26 0 001.88-5.65h0a5.32 5.32 0 011-4.79 36.14 36.14 0 008-22.63c0-20.17-16.83-36.32-37-36.32 0 0-7.55-.42-17 4.62"/>
                                <path opacity=".25" d="M23.66 56a35.61 35.61 0 01-.77-5 36.17 36.17 0 0111-29.17 2.65 2.65 0 00-1.89-4.5h-5.38a7.38 7.38 0 00-6 3.11 47.35 47.35 0 00-5.76 44.38 3.81 3.81 0 003.57 2.45h1.33A3.75 3.75 0 0123 69.1a41.47 41.47 0 0015.32 15.15m105.2-6.67c-.15-.29-.28-.59-.41-.89a17.28 17.28 0 01-.17-13 1.5 1.5 0 00-1.42-2H140a2.32 2.32 0 00-2.27 1.89q-.39 1.93-.87 3.87h0a65.6 65.6 0 01-2.7 8.55 2 2 0 001.89 2.75h0a2 2 0 011.85 2.82q-1.34 3.18-2.93 6.21a4 4 0 01-3.54 2.11H99.61"/>
                                <path opacity=".25" d="M8.05 68.82a2.8 2.8 0 001.24-3.37 52.7 52.7 0 019.49-51.56 6.2 6.2 0 014.73-2.18h12a10.93 10.93 0 004.88-1.2A39.73 39.73 0 0150.85 7a3.07 3.07 0 002.49-3v-.06A3.17 3.17 0 0050.17.76H4A3.25 3.25 0 00.75 4v44A59 59 0 004 67.33a2.82 2.82 0 004.06 1.49z"/>
                                <path opacity=".25" d="M81.1 6.23A47.1 47.1 0 0193.77 16a4 4 0 002.94 1.33h2.07a1.55 1.55 0 001.22-2.51 52.56 52.56 0 00-5.77-6.08 1.42 1.42 0 01.93-2.49h14.57A1.66 1.66 0 01111 9a26.08 26.08 0 00-5.67 11.5 3.13 3.13 0 01-3.1 2.5h-6.86a6.33 6.33 0 01-4.77-2.23 41.81 41.81 0 00-29-14.38A2.8 2.8 0 0159 3.55h0a2.8 2.8 0 012.8-2.8h78.8A2.67 2.67 0 01143 4.6a3.44 3.44 0 01-2.11 1.76 4.69 4.69 0 01-3 .06 20.94 20.94 0 00-8.77-1.09 20.75 20.75 0 00-16 31.14 15.52 15.52 0 002.6 3.5 6.29 6.29 0 011.4 3.66 58.89 58.89 0 01-.78 14.76c-.31 1.7.47 3.26 2.19 3.26h.5a2.77 2.77 0 002.72-2.29 63.21 63.21 0 001-11.73 1.81 1.81 0 012.15-1.8 20.7 20.7 0 0011.7.16 5.07 5.07 0 011.4-.19c2.52 0 5.23 1.64 5.23 4.09v3.54c0 1.92 1.94 3.11 3.74 3.11a3.48 3.48 0 002-.61 17.19 17.19 0 0110.91-3.16 17.25 17.25 0 01-.88 34.48 16.65 16.65 0 01-9.52-2.87c-3.27-2.31-6.23.25-6.23 2.19V92a3.25 3.25 0 01-3.25 3.25H3.67a2.91 2.91 0 01-2.92-2.9V73"/>
                                <circle opacity=".25" cx="159" cy="70" r="10.75"/>
                            </g>
                            <path class="fill" fill="currentColor" fill-rule="evenodd" d="M159 52a17.93 17.93 0 00-10.42 3.32c-1.61 1.15-4.58.09-4.58-1.89v-3.54c0-3.42-4.31-5.55-7.6-4.63a20 20 0 111.23-38.13c2.75 1 6.37-.82 6.37-3.73a3.4 3.4 0 00-3.4-3.4H4a4 4 0 00-4 4v88a4 4 0 004 4h136a4 4 0 004-4v-5.43c0-2 3-3 4.58-1.89A18 18 0 10159 52zm-70.9 3.26A30 30 0 1166.25 18.9 30 30 0 0188.1 55.26zM159 80a10 10 0 1110-10 10 10 0 01-10 10z"/>
                            <g class="info-icon" stroke="#fff" opacity=".5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="15.02" cy="81" r="6" fill="none" stroke-width="1.5"/>
                                <circle cx="15.02" cy="78.5" r=".5" fill="white" stroke-width="0.6"/>
                                <path d="M15.02 81l0 2" stroke-width="1.5"/>
                            </g>
                            <g class="logo" fill="none" opacity="1">
                                <path fill="currentColor" d="M84.22 54.29a26 26 0 11-18.93-31.51 26 26 0 0118.93 31.51z"/>
                                <image :href="ASSET_LOGOS[leftAsset]" x="33" y="22" width="52" height="52" />
                            </g>
                        </svg>
                        <div class="flex-row swap-amount">
                            <svg v-if="!switchSides" width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">
                                <path d="M.75 4.5L4 1.25 7.25 4.5M4 2.75v5" stroke-linejoin="round"/>
                                <path d="M.75 10.75h6.5"/>
                            </svg>
                            <svg v-if="switchSides" width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" class="grounded-arrow-down-icon">
                                <path d="M7.25 4.5L4 7.75.75 4.5M4 6.25v-5" stroke-linejoin="round"/>
                                <path d="M.75 10.75h6.5"/>
                            </svg>
                            <span class="amount">{{ formatAmount(!switchSides ? fromAmount : toAmount, leftAsset) }} <span class="currency" :class="assetToCurrency(leftAsset)">{{ assetToCurrency(leftAsset).toUpperCase() }}</span></span>
                        </div>
                    </div>
                </a>
                <div class="tooltip-box">
                    {{ assetToName(leftAsset) }} HTLC
                    <template v-if="!switchSides ? fromAddress : toAddress">
                        <span class="short-address flex-row">
                            <span class="address">{{ shortAddressStart(!switchSides ? fromAddress : toAddress) }}</span>
                            <svg viewBox="0 0 17 3" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <circle cx="1.5" cy="1.5" r="1.5"/>
                                <circle cx="8.5" cy="1.5" r="1.5"/>
                                <circle cx="15.5" cy="1.5" r="1.5"/>
                            </svg>
                            <span class="address">{{ shortAddressEnd(!switchSides ? fromAddress : toAddress) }}</span>
                        </span>
                        <a class="blue-link" :href="explorerAddrLink(leftAsset, !switchSides ? fromAddress : toAddress)" target="_blank" rel="noopener">
                            Block explorer
                        </a>
                    </template>
                </div>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" class="spinner">
                <g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="1.5">
                    <circle cx="26" cy="-.1" r="7.75" stroke-dasharray="3.5 3.5"/>
                    <circle cx="26" cy="52.1" r="7.75" stroke-dasharray="3.5 3.5"/>
                    <path opacity=".2" d="M39.23 48.38a26 26 0 000-44.76M12.77 3.62a26 26 0 000 44.76"/>
                </g>
            </svg>
            <span class="tooltip right" :class="assetToCurrency(rightAsset)">
                <a href="javascript:void(0);" tabindex="0" class="trigger">
                    <div class="piece-container">
                        <svg v-if="rightAsset !== SwapAsset.NIM" xmlns="http://www.w3.org/2000/svg" width="177" height="96" viewBox="0 0 177 96" class="piece" :style="`color: ${rightColor}`">
                            <g class="lines" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
                                <path opacity=".25" d="M88.17 40.56a30.74 30.74 0 1122.39 37.27 30.74 30.74 0 01-22.39-37.27zM46.37 11.71H78a4.12 4.12 0 002.9-1.21 51.15 51.15 0 014.35-3.85 2.72 2.72 0 011.69-.58H87A2.73 2.73 0 0188.66 11a48.25 48.25 0 00-5 4.53 5.6 5.6 0 01-4.09 1.75h-27.5a3.33 3.33 0 00-3.08 2 75.89 75.89 0 00-3.51 10.65h0a75.31 75.31 0 00-1.89 11 2.77 2.77 0 002.8 3h0a2.73 2.73 0 002.67-2.46 70.51 70.51 0 011.76-10.22h0v0a3.26 3.26 0 013.18-2.5h11.16a2.64 2.64 0 012.53 3.41q-.48 1.51-.87 3.09h0a52.85 52.85 0 00-1.45 16.41" />
                                <path opacity=".25" d="M33.48 18.42c.15.29.28.59.41.89a17.28 17.28 0 01.17 13 1.5 1.5 0 001.42 2H37a2.32 2.32 0 002.27-1.89q.39-1.93.87-3.87h0a65.6 65.6 0 012.7-8.55A2 2 0 0041 17.25h0a2 2 0 01-1.85-2.82q1.29-3.18 2.85-6.21a4 4 0 013.54-2.11h31.85" />
                                <path opacity=".25" d="M53.39 23.19h21.42a1.72 1.72 0 011.51 2.54 47.28 47.28 0 00-4.16 10.84h0a47 47 0 002 29.13 2.78 2.78 0 002.57 1.75h0a2.75 2.75 0 002.54-3.79 41.52 41.52 0 01-1.78-25.76h0a42.58 42.58 0 018.91-17.18 41.81 41.81 0 0129-14.38 2.8 2.8 0 002.6-2.79h0a2.8 2.8 0 00-2.8-2.8H37A3.25 3.25 0 0033.75 4v5.43c0 1.94-3 4.5-6.23 2.19A16.65 16.65 0 0018 8.75a17.25 17.25 0 1010 31.32 3.48 3.48 0 012-.61c1.8 0 3.74 1.19 3.74 3.11v3.54c0 2.45 2.71 4.09 5.23 4.09a5.07 5.07 0 001.43-.2 20.7 20.7 0 0111.7.16 1.81 1.81 0 002.15-1.8 63.21 63.21 0 011-11.73A2.77 2.77 0 0158 34.35h.5c1.72 0 2.5 1.56 2.19 3.26a58.89 58.89 0 00-.78 14.76 6.29 6.29 0 001.4 3.63 15.52 15.52 0 012.6 3.5 20.75 20.75 0 01-24.79 30.08 4.69 4.69 0 00-3 .06A3.44 3.44 0 0034 91.4a2.67 2.67 0 002.39 3.85h56.35A3.27 3.27 0 0096 91.81v-.23a3.31 3.31 0 00-1.69-2.69A47.07 47.07 0 0183.23 80a4 4 0 00-2.94-1.33h-2.07A1.55 1.55 0 0077 81.18a52.56 52.56 0 005.77 6.08 1.42 1.42 0 01-.93 2.49H67.27A1.66 1.66 0 0166 87a26.08 26.08 0 005.67-11.5 3.13 3.13 0 013.08-2.46h9.86" />
                                <path opacity=".25" d="M98.82 78.77a36.24 36.24 0 0051.8-15 3.77 3.77 0 013.38-2.13h.61a3.8 3.8 0 003.68-2.78A41.8 41.8 0 00151.38 23M166.17 6.25a35.07 35.07 0 013.2 4 7.31 7.31 0 011.34 4v3.13a1.43 1.43 0 01-2.65.73 57.74 57.74 0 00-7.34-9.8 6.73 6.73 0 00-4.9-2.14L141 6.22" />
                                <path opacity=".25" d="M135.7 16.37c-9.41-5-17-4.62-17-4.62-20.17 0-37 16.15-37 36.32a36.14 36.14 0 008 22.63 5.32 5.32 0 011 4.79h0a5.26 5.26 0 001.88 5.65 42 42 0 0013.79 7A41.71 41.71 0 00118 89.75h34.3" />
                                <path opacity=".25" d="M138.68 84.25A41.47 41.47 0 00154 69.1a3.75 3.75 0 013.23-1.83h1.33a3.81 3.81 0 003.57-2.45 47.35 47.35 0 00-5.76-44.38 7.38 7.38 0 00-6-3.11H145a2.65 2.65 0 00-1.83 4.56 36.17 36.17 0 0111 29.17 35.61 35.61 0 01-.77 5" />
                                <path opacity=".25" d="M169 68.82a2.8 2.8 0 01-1.24-3.37 52.7 52.7 0 00-9.49-51.56 6.2 6.2 0 00-4.73-2.18h-12a10.93 10.93 0 01-4.88-1.2A39.73 39.73 0 00126.15 7a3.07 3.07 0 01-2.49-3v-.06a3.17 3.17 0 013.17-3.18H173A3.25 3.25 0 01176.25 4v44A59 59 0 01173 67.33a2.82 2.82 0 01-4 1.49zM102.69 95.25h70.64a2.9 2.9 0 002.9-2.9V73" />
                                <circle opacity=".25" cx="18" cy="26" r="10.75" />
                            </g>
                            <path class="fill" fill="currentColor" fill-rule="evenodd" d="M18 44a17.93 17.93 0 0010.42-3.32C30 39.53 33 40.59 33 42.57v3.54c0 3.42 4.31 5.55 7.6 4.63a20 20 0 11-1.23 38.13c-2.75-1-6.37.82-6.37 3.73a3.4 3.4 0 003.4 3.4H173a4 4 0 004-4V4a4 4 0 00-4-4H37a4 4 0 00-4 4v5.43c0 2-3 3-4.58 1.89A18 18 0 1018 44zm70.9-3.26a30 30 0 1121.85 36.36A30 30 0 0188.9 40.74zM18 16A10 10 0 118 26a10 10 0 0110-10z" />
                            <g class="info-icon" stroke="#fff" opacity=".5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="161.99" cy="81" r="6" fill="none" stroke-width="1.5"/>
                                <circle cx="161.99" cy="78.5" r=".5" fill="white" stroke-width="0.6"/>
                                <path d="M161.99 81l0 2" stroke-width="1.5"/>
                            </g>
                            <g class="logo" fill="none" opacity="1">
                                <path fill="currentColor" d="M143.22 54.29a26 26 0 11-18.93-31.51 26 26 0 0118.93 31.51z" />
                                <image :href="ASSET_LOGOS[rightAsset]" x="92" y="22" width="52" height="52" />
                            </g>
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="177" height="96" viewBox="0 0 177 96" class="piece" :style="`color: ${rightColor}`">
                            <g class="lines" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
                                <path opacity=".25" d="M84.51 50.88l14.27 25a5.71 5.71 0 005 2.88h28.54a5.72 5.72 0 004.94-2.88l14.28-25a5.85 5.85 0 000-5.76l-14.27-25a5.71 5.71 0 00-4.95-2.88h-28.59a5.72 5.72 0 00-4.94 2.88l-14.27 25a5.78 5.78 0 00-.01 5.76zm91.74 11.75V92a3.25 3.25 0 01-3.25 3.25H96.4"/>
                                <path opacity=".25" d="M81.29 28.73l-8.88 15.52a7.69 7.69 0 000 7.63l7.41 13.05a1.69 1.69 0 01-1.47 2.52H77a3.3 3.3 0 01-2.86-1.65l-7.71-13.29a8.66 8.66 0 010-8.59l7-12.39a1.87 1.87 0 00-1.63-2.8H58.65a4.31 4.31 0 00-3.75 2.18c-1.76 3.06-5 8.76-6.47 11.49a2.49 2.49 0 01-2.16 1.31c-.53 0-1.19 0-2 .13a1.65 1.65 0 01-1.62-2.42c.52-1 .94-1.69.94-1.69L53 23.24l1.57-2.76a6.36 6.36 0 015.54-3.23h18.45a5.16 5.16 0 004.49-2.62l4.79-8.51C90.37 1.27 93.4.75 97.83.75H173A3.26 3.26 0 01176.25 4v45.9a6.5 6.5 0 01-.86 3.22l-8.89 15.51"/>
                                <path opacity=".25" d="M33.48 18.42c.15.29.28.59.41.89a17.28 17.28 0 01.17 13 1.5 1.5 0 001.42 2h3.28A2.77 2.77 0 0041.17 33l7.22-12.64a2 2 0 00-1.78-3.07h-5.37a2.13 2.13 0 01-1.85-3.19l3.33-5.83a4 4 0 013.44-2l29.16-.11"/>
                                <path opacity=".25" d="M137.39 89.77l-39-.09a7.15 7.15 0 01-6.16-3.54l-5.74-9.87a6.5 6.5 0 00-5.6-3.22H74.1a2.4 2.4 0 00-2.21 1.78c-.72 2.07-.88 6.29-5.85 12a1.76 1.76 0 001.3 2.92l11.33.11a1.6 1.6 0 001.59-2.34l-3.8-6.8a1.41 1.41 0 011.23-2.09h1.86a3.48 3.48 0 013 1.75l6.7 11.84a2 2 0 01-1.74 3H36.42A2.68 2.68 0 0134 91.39a3.45 3.45 0 012.11-1.75 4.66 4.66 0 013-.06A20.74 20.74 0 0066.37 74 20.58 20.58 0 0064 59.59c-1.77-3.11-5.29-6.8-4.74-12.19a14.56 14.56 0 012.28-6.11l2.6-4.56a1.58 1.58 0 00-1.38-2.37H61a3.05 3.05 0 00-2.63 1.52L55 41.73a26.71 26.71 0 00-1.49 3 13.49 13.49 0 00-.51 3.83 1.37 1.37 0 01-1.67 1.37 21.08 21.08 0 00-11 .08 5 5 0 01-1.33.19c-2.53 0-5.24-1.64-5.24-4.09v-3.54c0-1.92-1.93-3.11-3.73-3.11a3.46 3.46 0 00-2 .61 17.19 17.19 0 01-10.91 3.16A17.25 17.25 0 0118 8.75a16.62 16.62 0 019.52 2.87c3.28 2.31 6.23-.25 6.23-2.19V4A3.26 3.26 0 0137 .75h44.38A1.92 1.92 0 0183 3.62l-3 5.21a5.81 5.81 0 01-5 2.92H45.3"/>
                                <path opacity=".25" d="M170.73 12.82l-3-5.54a2.07 2.07 0 00-1.81-1.07h-2.66a1.45 1.45 0 00-1.26 2.2l8 14a5.24 5.24 0 01.71 2.65v5.64a1.08 1.08 0 01-2 .53L155.89 8.81a4.94 4.94 0 00-4.29-2.49l-52.92-.18a7.52 7.52 0 00-6.53 3.73l-5.81 10a6.59 6.59 0 01-5.7 3.28H59.16"/>
                                <path opacity=".25" d="M151.43 23l12 20.9a8.3 8.3 0 010 8.28l-4.22 7.33a4.33 4.33 0 01-3.73 2.17h-1.37a4.32 4.32 0 00-3.73 2.18l-9.73 17a6.71 6.71 0 01-5.84 3.4h-33.67a6.72 6.72 0 01-5.82-3.4L78.47 51.4a6.85 6.85 0 010-6.8L95.3 15.15a6.74 6.74 0 015.84-3.4h50.27"/>
                                <path opacity=".25" d="M154.94 56l2.58-4.64a6.87 6.87 0 000-6.8l-14-24.53a1.83 1.83 0 011.59-2.74h7.84a2.59 2.59 0 012.25 1.31l14.51 25.3a8 8 0 010 7.93L162.34 65a4.51 4.51 0 01-3.93 2.3h-1a4.49 4.49 0 00-3.9 2.26l-9.59 16.74a2.38 2.38 0 002.08 3.54l6.32-.07"/>
                                <circle opacity=".25" cx="18" cy="26" r="10.75"/>
                            </g>
                            <path class="fill" fill="currentColor" fill-rule="evenodd" d="M173 0H37a4 4 0 00-4 4v5.43c0 2-3 3-4.58 1.89a18 18 0 100 29.36C30 39.53 33 40.59 33 42.57v3.54c0 3.42 4.31 5.55 7.6 4.63a20 20 0 11-1.23 38.13c-2.75-1-6.37.82-6.37 3.73a3.4 3.4 0 003.4 3.4H173a4 4 0 004-4V4a4 4 0 00-4-4zM18 36a10 10 0 1110-10a10 10 0 01-10 10zz"/>
                            <g class="info-icon" stroke="#fff" opacity=".5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="161.99" cy="81" r="6" fill="none" stroke-width="1.5"/>
                                <circle cx="161.99" cy="78.5" r=".5" fill="white" stroke-width="0.6"/>
                                <path d="M161.99 81l0 2" stroke-width="1.5"/>
                            </g>
                            <g class="identicon">
                                <path class="identicon-border" fill="#1F2348" d="M146.35 45.56l-12.08-21.12a4.82 4.82 0 00-4.19-2.44h-24.16a4.81 4.81 0 00-4.18 2.44L89.65 45.56a4.89 4.89 0 000 4.88l12.08 21.12a4.82 4.82 0 004.19 2.44h24.16a4.81 4.81 0 004.18-2.44l12.09-21.12a4.89 4.89 0 000-4.88z" />
                                <image :href="identiconUrl" x="89" y="19" width="58" height="58" />
                            </g>
                        </svg>
                        <div class="flex-row swap-amount">
                            <svg v-if="!switchSides" width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" class="grounded-arrow-down-icon">
                                <path d="M7.25 4.5L4 7.75.75 4.5M4 6.25v-5" stroke-linejoin="round"/>
                                <path d="M.75 10.75h6.5"/>
                            </svg>
                            <svg v-if="switchSides" width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">
                                <path d="M.75 4.5L4 1.25 7.25 4.5M4 2.75v5" stroke-linejoin="round"/>
                                <path d="M.75 10.75h6.5"/>
                            </svg>
                            <span class="amount">{{ formatAmount(!switchSides ? toAmount : fromAmount, rightAsset) }} <span class="currency" :class="assetToCurrency(rightAsset)">{{ assetToCurrency(rightAsset).toUpperCase() }}</span></span>
                        </div>
                    </div>
                </a>
                <div class="tooltip-box">
                    {{ assetToName(rightAsset) }} HTLC
                    <template v-if="!switchSides ? toAddress : fromAddress">
                        <span class="short-address flex-row">
                            <span class="address">{{ shortAddressStart(!switchSides ? toAddress : fromAddress) }}</span>
                            <svg viewBox="0 0 17 3" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <circle cx="1.5" cy="1.5" r="1.5"/>
                                <circle cx="8.5" cy="1.5" r="1.5"/>
                                <circle cx="15.5" cy="1.5" r="1.5"/>
                            </svg>
                            <span class="address">{{ shortAddressEnd(!switchSides ? toAddress : fromAddress) }}</span>
                        </span>
                        <a class="blue-link" :href="explorerAddrLink(rightAsset, !switchSides ? toAddress : fromAddress)" target="_blank" rel="noopener">
                            Block explorer
                        </a>
                    </template>
                </div>
            </span>
            <!-- eslint-enable max-len -->
        </div>

        <div class="nq-card-footer">
            <div v-if="state === SwapState.SIGN_SWAP" class="nq-h2">
                1/5 Setting up atomic swap
            </div>
            <div v-if="state === SwapState.AWAIT_INCOMING" class="nq-h2">
                2/5 Locking up {{ assetToCurrency(toAsset).toUpperCase() }}
            </div>
            <div v-if="state === SwapState.CREATE_OUTGOING" class="nq-h2">
                3/5 Locking up {{ assetToCurrency(fromAsset).toUpperCase() }}
            </div>
            <div v-if="state === SwapState.AWAIT_SECRET" class="nq-h2">
                4/5 Awaiting swap secret
            </div>
            <div v-if="state === SwapState.SETTLE_INCOMING || state === SwapState.COMPLETE" class="nq-h2">
                5/5 Finalizing swap
            </div>

            <!-- MessageTransition, static (the alternating notices are EUR-only upstream) -->
            <div class="message-transition"><div>
                <div class="dont-close-wallet-notice nq-orange">
                    Don't close your wallet until the swap is complete!
                </div>
            </div></div>
        </div>

        <div v-if="error" class="error nq-orange-bg">
            <strong>Error:</strong>
            {{ error }}
            <p class="retrying">Retrying...</p>
        </div>
    </div>
</template>

<script lang="ts">
// upstream stores/Swaps.ts SwapState, verbatim order (numeric values matter:
// the wallet drives the animation by increasing this enum)
export enum SwapState {
    SIGN_SWAP,
    AWAIT_INCOMING,
    CREATE_OUTGOING,
    AWAIT_SECRET,
    SETTLE_INCOMING,
    COMPLETE,
    EXPIRED,
}

/** Crypto swap assets (upstream also supports EUR via OASIS; not ported) */
export type SupportedSwapAsset = 'NIM' | 'BTC' | 'USDC_MATIC' | 'USDT_MATIC';
</script>

<script setup lang="ts">
/**
 * Vue 3 port of the wallet's Performing Atomic Swap animation
 * (upstream/wallet@656ed56 src/components/swap/SwapAnimation.vue).
 *
 * Store/service reads translated into props:
 * - useSwapsStore().activeSwap.state  -> swapState (queued + replayed with the
 *   upstream per-step animation delays)
 * - swap.from/to (asset, amount, HTLC address) -> fromAsset/fromAmount/
 *   fromAddress/toAsset/toAmount/toAddress
 * - hidden <Identicon> + lib/AddressColor getColorClass -> nimAddress prop +
 *   @nimiq/iqons directly (piece color + identicon data URL)
 * - useConfig().environment (explorer links) -> testnet prop
 *
 * Simplified vs upstream (documented in meta.json): EUR/OASIS + bank +
 * manual-funding + funding-delay branches dropped; @nimiq/vue-components
 * Tooltip replaced by a CSS-only hover/focus tooltip; Amount/FiatAmount
 * replaced by a plain formatter; MessageTransition rendered static.
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
// @ts-expect-error no declaration file for '@nimiq/iqons'
import Iqons, { getBackgroundColorName } from '@nimiq/iqons';

const props = withDefaults(defineProps<{
    /** Fastspot swap id, shown on the expired screen */
    swapId: string,
    /** Current swap state; changes are queued and replayed with the upstream animation delays */
    swapState: SwapState,
    fromAsset: SupportedSwapAsset,
    /** In the asset's smallest unit (luna, sat, base units) */
    fromAmount: number,
    /** Funding HTLC address, shown in the piece tooltip */
    fromAddress?: string,
    toAsset: SupportedSwapAsset,
    toAmount: number,
    toAddress?: string,
    /** Active NIM address; drives the NIM piece color and its identicon */
    nimAddress?: string,
    error?: string,
    /** Render the swap right-to-left (buy direction) */
    switchSides?: boolean,
    /** Point block explorer links at the testnets */
    testnet?: boolean,
}>(), {
    fromAddress: '',
    toAddress: '',
    switchSides: false,
    testnet: false,
});

const emit = defineEmits<{
    (e: 'finished'): void,
    (e: 'cancel'): void,
}>();

// vendored upstream logos (swap/animation/bitcoin|usdc|usdt.svg), URL-encoded verbatim
const ASSET_LOGOS: Record<string, string> = {
    BTC: "data:image/svg+xml,%3Csvg width=%2252%22 height=%2252%22 viewBox=%221 0 53 52%22 fill=%22none%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%0A  %3Cpath d=%22M40 22.8c.5-3.4-2.3-5.3-6-6.5l1.2-4.7-3-.7-1.2 4.5-2.4-.5 1.2-4.6-3-.7-1.2 4.7-2-.4-4-1-.8 3s2.2.4 2.1.5c1.3.3 1.5 1 1.4 1.6L21 23.4h.3-.3l-2 7.4a1 1 0 01-1.4.7l-2.1-.5-1.5 3.2 3.9 1 2.1.5-1.2 4.7 3 .7 1.2-4.7 2.4.6-1.2 4.7 3 .7 1.2-4.7c5 .9 8.9.5 10.5-3.9 1.3-3.5 0-5.5-2.7-6.8a4.6 4.6 0 003.7-4.2zm-6.9 9c-.9 3.6-7.1 1.7-9.2 1.2l1.7-6.2c2 .5 8.5 1.4 7.5 5zm1-9c-.9 3.2-6 1.5-7.8 1.1l1.5-5.6c1.7.4 7.1 1.1 6.2 4.4z%22 fill=%22%23fff%22/%3E%0A%3C/svg%3E",
    USDC_MATIC: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2252%22 height=%2252%22 viewBox=%220 0 2000 2000%22%3E%0A  %3Cpath d=%22M1275 1158c0-146-87-196-262-216-125-17-150-50-150-109s41-96 125-96c75 0 116 25 137 88 4 12 17 21 29 21h67c17 0 29-13 29-29v-5c-17-91-92-162-187-170V542c0-17-13-30-34-34h-62c-17 0-29 13-34 34v95c-125 17-204 101-204 205 0 137 84 191 259 212 116 21 154 46 154 113s-59 112-138 112c-108 0-146-46-158-108-4-17-17-25-29-25h-71c-17 0-29 12-29 29v4c16 104 83 179 221 200v100c0 17 12 29 33 34h62c17 0 30-13 34-34v-100c125-21 208-108 208-221z%22 fill=%22%23fff%22/%3E%0A  %3Cpath d=%22M788 1596a620 620 0 0 1-371-800 616 616 0 0 1 371-371c16-8 25-21 25-42v-58c0-17-9-29-25-33-5 0-13 0-17 4a749 749 0 0 0 0 1429c17 8 33 0 37-17 5-4 5-8 5-16v-59c0-12-13-29-25-37zm441-1300c-16-9-33 0-37 16-4 5-4 9-4 17v58c0 17 12 34 25 42a620 620 0 0 1 370 800 616 616 0 0 1-371 371c-16 8-24 21-24 42v58c0 17 8 29 25 33 4 0 12 0 16-4a749 749 0 0 0 488-942 756 756 0 0 0-488-491z%22 fill=%22%23fff%22/%3E%0A%3C/svg%3E",
    USDT_MATIC: "data:image/svg+xml,%3Csvg width=%2252%22 height=%2252%22 viewBox=%220 0 800 800%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%0A    %3Cpath fill-rule=%22evenodd%22 clip-rule=%22evenodd%22 d=%22M400.49 428.59C469.28 428.59 526.77 416.96 540.82 401.42C528.89 388.24 485.74 377.86 430.94 375.02V407.85C421.13 408.36 410.93 408.61 400.48 408.61C390.03 408.61 379.83 408.36 370 407.85V375.02C315.22 377.86 272.05 388.24 260.12 401.42C274.19 416.96 331.69 428.59 400.48 428.59H400.49ZM522.71 274.06V319.27H430.94V350.62C495.4 353.97 543.77 367.75 544.13 384.24V418.62C543.77 435.11 495.4 448.86 430.94 452.22V529.16H370.01V452.22C305.55 448.87 257.2 435.11 256.84 418.62V384.24C257.2 367.75 305.55 353.97 370.01 350.62V319.27H278.24V274.06H522.72H522.71ZM242.15 202.11H564.31C572.01 202.11 579.1 206.16 582.94 212.74L676.79 373.9C681.65 382.26 680.21 392.81 673.27 399.58L414.93 651.76C406.55 659.93 393.09 659.93 384.73 651.76L126.71 399.92C119.62 392.98 118.28 382.13 123.51 373.73L223.84 212.24C227.75 205.96 234.69 202.12 242.16 202.12L242.15 202.11Z%22 fill=%22%23fff%22/%3E%0A%3C/svg%3E",
};

const SwapAsset = { NIM: 'NIM', BTC: 'BTC', USDC_MATIC: 'USDC_MATIC', USDT_MATIC: 'USDT_MATIC' } as const;

// NIM identicon (upstream: hidden <Identicon> whose <img> src is copied in)
const identiconUrl = ref('');
watch(() => props.nimAddress, async (address) => {
    identiconUrl.value = address ? await Iqons.toDataUrl(address) : '';
}, { immediate: true });

const leftAsset = computed(() => props.switchSides ? props.toAsset : props.fromAsset);
const rightAsset = computed(() => props.switchSides ? props.fromAsset : props.toAsset);

// upstream lib/AddressColor.ts, verbatim
function getColorClass(address: string) {
    let color = getBackgroundColorName(address).toLowerCase() as string;
    if (color === 'yellow') color = 'gold';
    else if (color === 'indigo') color = 'blue';
    else if (color === 'blue') color = 'light-blue';
    else if (color === 'teal') color = 'green';
    else if (color === 'green') color = 'light-green';
    return `nq-${color}`;
}

function assetColor(asset: SupportedSwapAsset) {
    switch (asset) {
        case SwapAsset.NIM: {
            if (!props.nimAddress) return '';
            const className = getColorClass(props.nimAddress);
            if (className === 'nq-blue') return 'white';
            return `var(--${className.replace('nq-', 'nimiq-')})`;
        }
        case SwapAsset.BTC: return '#f7931a';
        case SwapAsset.USDC_MATIC: return '#2775ca';
        case SwapAsset.USDT_MATIC: return '#009393';
        default: return '';
    }
}

const leftColor = computed(() => assetColor(leftAsset.value));
const rightColor = computed(() => assetColor(rightAsset.value));

function assetToCurrency(asset: SupportedSwapAsset) {
    return { NIM: 'nim', BTC: 'btc', USDC_MATIC: 'usdc', USDT_MATIC: 'usdt' }[asset];
}

function assetToName(asset: SupportedSwapAsset) {
    switch (asset) {
        case SwapAsset.NIM: return 'Nimiq';
        case SwapAsset.BTC: return 'Bitcoin';
        case SwapAsset.USDC_MATIC: return 'USD Coin';
        case SwapAsset.USDT_MATIC: return 'Tether USD';
        default: throw new Error(`Invalid asset ${asset}`);
    }
}

const ASSET_DECIMALS: Record<SupportedSwapAsset, number> = { NIM: 5, BTC: 8, USDC_MATIC: 6, USDT_MATIC: 6 };
function formatAmount(amount: number, asset: SupportedSwapAsset) {
    const decimals = ASSET_DECIMALS[asset];
    return (amount / 10 ** decimals).toLocaleString('en-US', { maximumFractionDigits: decimals });
}

// upstream ShortAddress.vue, displayedCharacters 8
function shortAddressStart(address: string) { return address.substring(0, 4); }
function shortAddressEnd(address: string) { return address.substring(address.length - 4); }

// upstream lib/ExplorerUtils.ts (EUR branch dropped)
function explorerAddrLink(asset: SupportedSwapAsset, address: string) {
    switch (asset) {
        case SwapAsset.NIM:
            return props.testnet
                ? `https://test.nimiq.watch/#${address}`
                : `https://nimiq.watch/#${address}`;
        case SwapAsset.BTC:
            return `https://blockstream.info${props.testnet ? '/testnet' : ''}/address/${address}`;
        case SwapAsset.USDC_MATIC:
        case SwapAsset.USDT_MATIC:
            return `https://${props.testnet ? 'amoy.' : ''}polygonscan.com/address/${address}`;
        default: throw new Error('Invalid asset');
    }
}

// Swap Direction
const swapDirection = computed(() => props.switchSides ? 'right-to-left' : 'left-to-right');

// Swap State: queued + replayed with the upstream per-step animation delays
const state = ref<SwapState>(SwapState.SIGN_SWAP);
const stateChanges: SwapState[] = [];
let processingStateChange = false;
let stateChangeTimeout = -1;
let finishedTimeout = -1;

function processStateChange() {
    if (state.value === SwapState.COMPLETE) {
        // 1 second after the 1 second success animation
        finishedTimeout = window.setTimeout(() => emit('finished'), 1 * 1000);
    }

    if (processingStateChange || !stateChanges.length) return;
    processingStateChange = true;

    state.value = stateChanges.shift()!;

    // Wait for the animation of this step to finish
    let delay: number; // Seconds
    switch (state.value) {
        case SwapState.SIGN_SWAP:
            delay = 0; break;
        case SwapState.AWAIT_INCOMING:
            delay = 1; break; // Scale down (zoom out)
        case SwapState.CREATE_OUTGOING:
            delay = 2.6; break; // Stroke-color-change + background fill
        case SwapState.AWAIT_SECRET:
            delay = 2.6; break; // Stroke-color-change + background fill
        case SwapState.SETTLE_INCOMING:
            delay = 1.6; break; // Puzzle pieces move in + artificial delay to see UI state
        case SwapState.COMPLETE:
            delay = 1; break; // Scale up (zoom in)
        default:
            delay = 0;
    }

    stateChangeTimeout = window.setTimeout(() => {
        processingStateChange = false;
        processStateChange();
    }, delay * 1000);
}

function setState(nextState: SwapState) {
    stateChanges.push(nextState); // Queue state change
    processStateChange(); // Start queue if not already processing
}

onMounted(() => processStateChange());
watch(() => props.swapState, setState);

const animationClassName = computed(() => {
    switch (state.value) {
        case SwapState.SIGN_SWAP: return 'sign-swap';
        case SwapState.AWAIT_INCOMING: return 'await-incoming';
        case SwapState.CREATE_OUTGOING: return 'create-outgoing';
        case SwapState.AWAIT_SECRET: return 'await-secret';
        case SwapState.SETTLE_INCOMING: return 'settle-incoming';
        case SwapState.COMPLETE: return 'complete';
        default: return '';
    }
});

onUnmounted(() => {
    window.clearTimeout(stateChangeTimeout);
    window.clearTimeout(finishedTimeout);
});
</script>

<style scoped>
/* wallet src/scss/themes.scss globals the component relies on (verbatim) */
.flex-column {
    display: flex;
    flex-direction: column;
}

.flex-row {
    display: flex;
    flex-direction: row;
}

.flex-grow {
    flex-grow: 1;
}

.swap-animation {
    /* wallet src/scss/themes.scss font-size vars */
    --body-size: 2rem;
    --small-size: 1.75rem;
}

/* @nimiq/vue-components Tooltip base styles (static excerpts, verbatim) */
.tooltip {
    display: inline-block;
    position: relative;
    line-height: 1;
}

.tooltip .trigger {
    position: relative;
    display: inline-block;
    vertical-align: bottom;
    text-decoration: none;
    outline: none;
    cursor: default;
    color: inherit;
}

/* Port addition: CSS-only tooltip visibility (upstream positions the
   @nimiq/vue-components Tooltip box in JS) */
.tooltip .tooltip-box {
    position: absolute;
    bottom: calc(100% + 2rem);
    padding: 1.75rem 2rem; /* wallet themes.scss .tooltip .tooltip-box */
    border-radius: 0.5rem;
    font-size: var(--body-size);
    line-height: 1.3;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 1.25rem 2.5rem rgba(0, 0, 0, 0.1);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s var(--nimiq-ease), visibility 0.2s;
    z-index: 3;
}

.tooltip:hover .tooltip-box,
.tooltip:focus-within .tooltip-box {
    opacity: 1;
    visibility: visible;
}

.swap-animation {
    flex-grow: 1;
    height: 100%;
    width: 100%;
    justify-content: space-between;
    overflow: hidden;
    position: relative;
    border-radius: 0.625rem;
    font-size: var(--body-size);

    background: var(--nimiq-blue);
    background-image: var(--nimiq-blue-bg);
    color: white;
}

.swap-animation > .identicon {
    display: none;
}

.success-background,
.expired-background {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    opacity: 0;
    transition: opacity 1s var(--nimiq-ease);
    justify-content: center;
    align-items: center;
    pointer-events: none;
}

.success-background .nq-icon,
.expired-background .nq-icon {
    font-size: 9rem;
}

.success-background .title,
.expired-background .title {
    line-height: 1;
    margin-top: 5rem;
}

.success-background.visible,
.expired-background.visible {
    opacity: 1;
    z-index: 2;
    pointer-events: all;
}

.expired-background {
    padding: 2rem 2rem 1rem;
}

.expired-background .close-button svg {
    opacity: 0.6;
}

.expired-background .close-button:hover svg,
.expired-background .close-button:focus svg {
    opacity: 0.8;
}

.expired-background .nq-icon {
    font-size: 11rem;
    margin-top: 2.5rem;
}

.expired-background .title {
    margin-bottom: 0;
}

.expired-background .expired-text {
    max-width: 52rem;
    text-align: center;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1.25rem;
}

.expired-background .expired-text + .expired-text {
    margin-top: -1rem;
}

.expired-background .swap-id-notice {
    font-size: var(--small-size);
    font-weight: 600;
}

.expired-background .expired-swap-id {
    font-size: var(--small-size);
    font-weight: bold;
    padding: 0.5rem 1.5rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 5rem;
    text-align: center;
    margin: 0.5rem 0.5rem 0;
}

.nq-card-header {
    transition: opacity 0.5s var(--nimiq-ease);
}

.nq-card-header .nq-h1 {
    line-height: 1;
}

.nq-card-header .nq-notice {
    margin-top: 1.5rem;
    max-width: 36rem;
    margin-left: auto;
    margin-right: auto;
    opacity: 0.6;
}

.tooltip .trigger::after {
    background: white;
    left: 6.5rem;
}

.tooltip.right .trigger::after {
    left: 13.5rem;
}

.tooltip .tooltip-box {
    background: white;
    color: var(--nimiq-blue);
    left: 0 !important;

    transform-origin: 50% calc(100% + 7rem);
}

.tooltip.right .tooltip-box {
    left: auto !important;
    right: 0 !important;
}

.tooltip svg {
    display: block;
}

.tooltip .short-address {
    opacity: 0.5;
    font-weight: normal;
    font-size: var(--small-size);
    margin-top: 0.5rem;
}

.tooltip .blue-link {
    color: var(--nimiq-light-blue);
    font-size: var(--small-size);
    margin-top: 1rem;
}

.tooltip .blue-link .nq-icon {
    margin-left: 0.25rem;
}

.animation {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin-bottom: 3rem;

    transition: transform 1s var(--nimiq-ease);
}

.animation .spinner {
    height: 6.5rem;
    width: 6.5rem;

    overflow: visible;

    transition: opacity 0.5s var(--nimiq-ease);
}

.animation .spinner circle {
    animation: spinner-rotate reverse 1s linear infinite;
}

.animation .spinner circle:first-of-type {
    transform-origin: 50% 0%;
}

.animation .spinner circle:last-of-type {
    transform-origin: 50% 100%;
}

.animation .left,
.animation .right {
    height: 12rem;
    transition: transform 1s var(--nimiq-ease), opacity 0.5s var(--nimiq-ease);
    z-index: 1;
}

.animation .piece-container .swap-amount {
    align-items: center;
    font-weight: 600;
    opacity: 0.3;
    margin: 1rem 1rem -3rem;
    transition: opacity 0.5s var(--nimiq-ease);
}

.animation .piece-container .swap-amount svg {
    margin-right: 1rem;
}

.animation .right .piece-container .swap-amount {
    justify-content: flex-end;
}

.animation .identicon-border {
    transform-origin: 33.33% 50%;
    transform: scale(1.15);
}

.animation .right .identicon-border {
    transform-origin: 66.66% 50%;
}

.animation .right.nim .identicon-border {
    fill: #22143F;
}

.animation svg {
    height: 100%;
    width: auto;
}

.animation .fill {
    opacity: 0;
}

.animation .info-icon {
    transition: stroke 1s var(--nimiq-ease) 1.6s;
}

.animation.sign-swap {
    transform: scale(1.94);
}

.animation.sign-swap .left {
    transform: translate3d(-15rem, 0, 0);
}

.animation.sign-swap .right {
    transform: translate3d(+15rem, 0, 0);
}

.animation.sign-swap .spinner,
.animation.await-incoming .spinner,
.animation.create-outgoing .spinner,
.animation.await-secret .spinner,
.animation.complete .spinner {
    animation: spinner-rotate 2.5s linear infinite;
}

.animation.await-incoming .left,
.animation.create-outgoing .left,
.animation.await-secret .left {
    transform: translate3d(-2.5rem, 0, 0);
}

.animation.await-incoming .right,
.animation.create-outgoing .right,
.animation.await-secret .right {
    transform: translate3d(+2.5rem, 0, 0);
}

.animation.create-outgoing.right-to-left .piece.white .info-icon,
.animation.await-secret .piece.white .info-icon,
.animation.settle-incoming .piece.white .info-icon,
.animation.complete .piece.white .info-icon {
    stroke: var(--nimiq-blue);
}

.animation.await-incoming.right-to-left .left .lines > *,
.animation.await-incoming.left-to-right .right .lines > *,
.animation.create-outgoing.right-to-left .right .lines > *,
.animation.create-outgoing.left-to-right .left .lines > * {
    animation: pulsate 2s infinite;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(1),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(1),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(1),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(1) {
    animation-delay: 0s;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(2),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(2),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(2),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(2) {
    animation-delay: 0.2s;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(3),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(3),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(3),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(3) {
    animation-delay: 0.4s;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(4),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(4),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(4),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(4) {
    animation-delay: 0.6s;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(5),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(5),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(5),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(5) {
    animation-delay: 0.8s;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(6),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(6),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(6),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(6) {
    animation-delay: 1s;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(7),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(7),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(7),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(7) {
    animation-delay: 1.2s;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(8),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(8),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(8),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(8) {
    animation-delay: 1.4s;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(9),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(9),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(9),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(9) {
    animation-delay: 1.6s;
}

.animation.await-incoming.right-to-left .left .lines > *:nth-child(10),
.animation.await-incoming.left-to-right .right .lines > *:nth-child(10),
.animation.create-outgoing.right-to-left .right .lines > *:nth-child(10),
.animation.create-outgoing.left-to-right .left .lines > *:nth-child(10) {
    animation-delay: 1.8s;
}

.animation.await-incoming.right-to-left .left .swap-amount,
.animation.await-incoming.left-to-right .right .swap-amount,
.animation.create-outgoing.right-to-left .right .swap-amount,
.animation.create-outgoing.left-to-right .left .swap-amount {
    opacity: 0.5;
    animation: pulsate 2s infinite 0.2s;
}

.animation.create-outgoing.right-to-left .left .lines > *,
.animation.create-outgoing.left-to-right .right .lines > *,
.animation.await-secret.right-to-left .right .lines > *,
.animation.await-secret.left-to-right .left .lines > * {
    opacity: 0.5;
    animation: strokeColorChange 1s 1;
    animation-fill-mode: forwards !important;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(1),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(1),
.animation.await-secret.right-to-left .right .lines > *:nth-child(1),
.animation.await-secret.left-to-right .left .lines > *:nth-child(1) {
    animation-delay: 0s;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(2),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(2),
.animation.await-secret.right-to-left .right .lines > *:nth-child(2),
.animation.await-secret.left-to-right .left .lines > *:nth-child(2) {
    animation-delay: 0.2s;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(3),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(3),
.animation.await-secret.right-to-left .right .lines > *:nth-child(3),
.animation.await-secret.left-to-right .left .lines > *:nth-child(3) {
    animation-delay: 0.4s;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(4),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(4),
.animation.await-secret.right-to-left .right .lines > *:nth-child(4),
.animation.await-secret.left-to-right .left .lines > *:nth-child(4) {
    animation-delay: 0.6s;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(5),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(5),
.animation.await-secret.right-to-left .right .lines > *:nth-child(5),
.animation.await-secret.left-to-right .left .lines > *:nth-child(5) {
    animation-delay: 0.8s;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(6),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(6),
.animation.await-secret.right-to-left .right .lines > *:nth-child(6),
.animation.await-secret.left-to-right .left .lines > *:nth-child(6) {
    animation-delay: 1s;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(7),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(7),
.animation.await-secret.right-to-left .right .lines > *:nth-child(7),
.animation.await-secret.left-to-right .left .lines > *:nth-child(7) {
    animation-delay: 1.2s;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(8),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(8),
.animation.await-secret.right-to-left .right .lines > *:nth-child(8),
.animation.await-secret.left-to-right .left .lines > *:nth-child(8) {
    animation-delay: 1.4s;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(9),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(9),
.animation.await-secret.right-to-left .right .lines > *:nth-child(9),
.animation.await-secret.left-to-right .left .lines > *:nth-child(9) {
    animation-delay: 1.6s;
}

.animation.create-outgoing.right-to-left .left .lines > *:nth-child(10),
.animation.create-outgoing.left-to-right .right .lines > *:nth-child(10),
.animation.await-secret.right-to-left .right .lines > *:nth-child(10),
.animation.await-secret.left-to-right .left .lines > *:nth-child(10) {
    animation-delay: 1.8s;
}

.animation.create-outgoing.right-to-left .left .fill,
.animation.create-outgoing.left-to-right .right .fill,
.animation.await-secret .fill,
.animation.settle-incoming .fill,
.animation.complete .fill {
    transition: opacity 1s var(--nimiq-ease) 1.6s;
    opacity: 1;
}

.animation.create-outgoing.right-to-left .left .swap-amount,
.animation.create-outgoing.left-to-right .right .swap-amount,
.animation.await-secret .swap-amount,
.animation.settle-incoming .swap-amount,
.animation.complete .swap-amount {
    opacity: 0.5;
}

.animation.settle-incoming {
    transition-duration: 1.2s;
    transition-delay: 1s;
    transition-timing-function: ease;
}

.animation.settle-incoming .spinner {
    transform: rotate(-32deg);
}

.animation.settle-incoming.left-to-right .right.eur .lines,
.animation.settle-incoming.right-to-left .left.eur .lines {
    opacity: 0;
}

.animation.settle-incoming.left-to-right .right.eur .fill,
.animation.settle-incoming.right-to-left .left.eur .fill {
    animation: pulsate-opaque 1.5s ease-out infinite;
}

.animation.settle-incoming .left,
.animation.complete .left {
    animation: piece-left-in-out 1s 1 var(--nimiq-ease) forwards;
}

.animation.settle-incoming .right,
.animation.complete .right {
    animation: piece-right-in-out 1s 1 var(--nimiq-ease) forwards;
}

.animation.settle-incoming .swap-amount,
.animation.complete .swap-amount {
    opacity: 0;
    transition-duration: 0.8s;
}

.animation.complete {
    transform: scale(1.94);
}

.animation.complete .spinner,
.animation.complete .left,
.animation.complete .right {
    transition: opacity 1s var(--nimiq-ease);
    opacity: 0;
}

@keyframes spinner-rotate {
    0%   { transform: rotate(-32deg); }
    100% { transform: rotate(calc(360deg - 32deg)); }
}

@keyframes pulsate {
    0% { opacity: .25; }
    50% { opacity: .5; }
    100% { opacity: .25; }
}

@keyframes pulsate-opaque {
    0% { opacity: 1; }
    50% { opacity: .5; }
    100% { opacity: 1; }
}

@keyframes strokeColorChange {
    0% { stroke: #fff; }
    100% { stroke: currentColor; opacity: 1; }
}

@keyframes piece-left-in-out {
    0%     { transform: translate3d(-2.5rem, 0, 0); }
    to     { transform: translate3d(+7.25rem, 0, 0); }
}

@keyframes piece-right-in-out {
    0%     { transform: translate3d(+2.5rem, 0, 0); }
    to     { transform: translate3d(-7.25rem, 0, 0); }
}

.nq-card-footer {
    margin-top: 3rem;
    text-align: center;

    transition: opacity 0.5s var(--nimiq-ease);
}

.nq-card-footer .nq-h2 {
    font-weight: normal;
    margin-bottom: 2rem;
}

.nq-card-footer .dont-close-wallet-notice {
    margin: 0 auto 2rem;
    font-weight: 600;
    --nimiq-light-blue: var(--nimiq-light-blue-on-dark);
}

.nq-card-footer .dont-close-wallet-notice.nq-gray {
    opacity: 0.6;
    color: white;
}

.error {
    position: absolute;
    left: 2rem;
    right: 2rem;
    bottom: 2rem;
    border-radius: 0.5rem;
    padding: 2rem;
}

.error p.retrying {
    margin-bottom: 0;
    font-size: var(--small-size);
    font-weight: 600;
    opacity: 0.7;
    text-align: right;
}

.error .error-action {
    display: block;
    margin: 2rem auto 0;
}

/* mobile - animation downscale - starting at 500px width */
@media (max-width: 500px) {
    .animation.await-incoming,
    .animation.create-outgoing,
    .animation.await-secret {
        transform: scale(0.8);
    }
    .animation.settle-incoming {
        transform: scale(0.8);
    }
}
@media (max-width: 400px) {
    .animation.await-incoming,
    .animation.create-outgoing,
    .animation.await-secret {
        transform: scale(0.7);
    }
    .animation.settle-incoming {
        transform: scale(0.7);
    }
}
@media (max-width: 350px) {
    .animation.await-incoming,
    .animation.create-outgoing,
    .animation.await-secret {
        transform: scale(0.65);
    }
    .animation.settle-incoming {
        transform: scale(0.65);
    }
}

/* @nimiq/vue-components Amount base style (verbatim) */
.amount {
    white-space: nowrap;
}

/* wallet ShortAddress.vue scoped CSS (verbatim) */
.short-address {
    white-space: nowrap;
    align-items: center;
}

.short-address .address {
    word-spacing: -.2em;
    font-family: 'Fira Mono', monospace;
}

.short-address svg {
    margin: -.25rem .5rem 0 .75rem;
    opacity: .6;
    width: 2.125rem;
    height: .375rem;
}

/* wallet BlueLink.vue, simplified */
.blue-link {
    display: block;
    font-weight: 600;
    text-decoration: none;
}

/* wallet MessageTransition.vue scoped CSS (static excerpts, verbatim) */
.message-transition {
    --message-height: auto;
    --message-transition-duration: 500ms;
    --message-transition-timing-function: cubic-bezier(0.5, 0, 0.15, 1);

    position: relative;
    height: var(--message-height);
    display: flex;
    flex-direction: column;
    justify-content: center;

    transition-property: height;
    transition-duration: var(--message-transition-duration);
    transition-timing-function: var(--message-transition-timing-function);
}

/* @nimiq/vue-components CloseButton, simplified */
.close-button {
    font-size: 3rem;
    height: 3rem;
    width: 3rem;
    padding: 0;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
}

.close-button.top-right {
    position: absolute;
    top: 2rem;
    right: 2rem;
}

/* ============================================================
   Reduced motion: freeze on the interlocked SETTLE_INCOMING
   frame instead of animating.
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
    .swap-animation *,
    .swap-animation *::before,
    .swap-animation *::after {
        animation: none !important;
        transition: none !important;
    }

    /* hold the interlocked end frame that upstream reaches via its
       finite piece-in-out animations */
    .animation.settle-incoming .left,
    .animation.complete .left {
        transform: translate3d(+7.25rem, 0, 0);
    }

    .animation.settle-incoming .right,
    .animation.complete .right {
        transform: translate3d(-7.25rem, 0, 0);
    }
}
</style>
