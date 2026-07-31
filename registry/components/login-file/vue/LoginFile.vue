<template>
    <canvas ref="canvas$" class="login-file"></canvas>
</template>

<script setup lang="ts">
// Vue 3 port of keyguard src/lib/LoginFile.js (@02e7534) — the downloadable
// account access card, drawn on canvas exactly like upstream.
// Requires npm dep: qr-creator (the published build of the QrEncoder keyguard
// vendors as src/lib/QrEncoder.js).
import { ref, watch } from 'vue';
import QrCreator from 'qr-creator';

export type LoginFileColor =
    'orange' | 'red' | 'yellow' | 'indigo' | 'blue' | 'purple' | 'teal' | 'pink' | 'green' | 'brown';

const props = withDefaults(defineProps<{
    /** Base64 string encoded into the QR code — upstream: the encrypted
     * entropy (+ optional label suffix), see DownloadLoginFile.setEncryptedEntropy. */
    secret: string,
    /** Account label printed at the top. Empty: upstream default '<Color> Account'. */
    label?: string,
    /** Account color — upstream LoginFileConfig index 0-9 or name. Upstream
     * derives it from the first address (IqonHash.getBackgroundColorIndex). */
    color?: LoginFileColor | number,
    /** Date line (rotated along the right edge). Empty: today, YYYY-MM-DD. */
    date?: string,
}>(), {
    label: '',
    color: 0,
    date: '',
});

// src/lib/LoginFileConfig.js (keyguard@02e7534) — order = Iqons.backgroundColors
const LOGIN_FILE_CONFIG = [
    { name: 'orange', className: 'nq-orange-bg', color: '#FC8702', corner: '#FD6216', opacityLines: 0.15, opacityDate: 0.6 },
    { name: 'red', className: 'nq-red-bg', color: '#D94432', corner: '#CC3047', opacityLines: 0.15, opacityDate: 0.45 },
    { name: 'yellow', className: 'nq-gold-bg', color: '#E9B213', corner: '#EC991C', opacityLines: 0.2, opacityDate: 0.6 },
    { name: 'indigo', className: 'nq-blue-bg', color: '#1F2348', corner: '#260133', opacityLines: 0.1, opacityDate: 0.35 },
    { name: 'blue', className: 'nq-light-blue-bg', color: '#0582CA', corner: '#265DD7', opacityLines: 0.1, opacityDate: 0.45 },
    { name: 'purple', className: 'nq-purple-bg', color: '#5F4B8B', corner: '#4D4C96', opacityLines: 0.1, opacityDate: 0.35 },
    { name: 'teal', className: 'nq-green-bg', color: '#21BCA5', corner: '#41A38E', opacityLines: 0.15, opacityDate: 0.55 },
    { name: 'pink', className: 'nq-pink-bg', color: '#FA7268', corner: '#E0516B', opacityLines: 0.15, opacityDate: 0.6 },
    { name: 'green', className: 'nq-light-green-bg', color: '#88B04B', corner: '#70B069', opacityLines: 0.15, opacityDate: 0.55 },
    { name: 'brown', className: 'nq-brown-bg', color: '#795548', corner: '#724147', opacityLines: 0.1, opacityDate: 0.35 },
] as const;

// Geometry — LoginFile.js statics + calculateQrPosition()
const WIDTH = 630;
const HEIGHT = 1060;
const OUTER_RADIUS = 24;
const RADIUS = 16;
const QR_SIZE = 330;
const QR_PADDING = 12;
const QR_BOX_SIZE = QR_SIZE + 2 * QR_PADDING;
const BORDER_WIDTH = 12;
const QR_X = 138;
const QR_Y = 536;
// Upstream self-hosts the typeface under its legacy name 'Muli';
// modern bundles ship the same one as 'Mulish'.
const FONT_FAMILY = '\'Mulish\', \'Muli\', system-ui, sans-serif';

// Upstream artwork — data-URL strings byte-exact from LoginFile.js
// (the security waves take the per-color line opacity, like upstream).
/* eslint-disable max-len */
const WAVES = (opacityLines: number) => `data:image/svg+xml,<svg width="303" height="288" fill="none" stroke="white" opacity="${opacityLines}" xmlns="http://www.w3.org/2000/svg"><path d="M365.7-158.8c-43 43-57.1 28.8-100 71.8-43 43-29 57.1-72 100.1-43 43-57 28.9-100 71.9-43 43-29 57.1-71.9 100-43 43-57.1 29-100.1 72"/><path d="M360-164.5c-43 43-59.9 26-102.9 69-43 43-26 60-69 103s-60 26-103 69-26 60-69 103-60 26-103 69"/><path d="M354.4-170.2c-43 43-62.8 23.2-105.8 66.2S225.4-41.2 182.5 1.8c-43 43-62.8 23.2-105.8 66.2s-23.2 62.8-66.2 105.8S-52.3 197-95.3 240"/><path d="M348.8-175.8c-43 43-65.7 20.3-108.6 63.3-43 43-20.4 65.7-63.4 108.7S111.2 16.5 68.2 59.5 47.8 125.1 4.8 168.1s-65.6 20.4-108.6 63.4"/><path d="M343.1-181.5c-43 43-68.4 17.6-111.4 60.6S214-52.5 171-9.5 102.7 8 59.7 51 42.2 119.5-.8 162.5-69.3 180-112.3 223"/><path d="M337.5-187.1c-43 43-71.3 14.7-114.3 57.7s-14.7 71.2-57.7 114.2S94.2-.5 51.2 42.5 36.5 113.8-6.5 156.8s-71.3 14.7-114.3 57.7"/><path d="M331.8-192.8c-43 43-74.1 11.9-117.1 54.9s-11.9 74-54.9 117-74 12-117 55-12 74-55 117-74 12-117 55"/><path d="M326.1-198.4c-43 43-76.9 9-119.9 52s-9 77-52 120-77 9-120 52-9 76.9-52 119.9-77 9-120 52"/><path d="M320.5-204.1c-43 43-79.8 6.2-122.8 49.2S191.5-75 148.5-32 68.8-26 25.8 17s-6.3 79.7-49.3 122.7-79.7 6.3-122.7 49.3"/><path d="M314.8-209.8c-43 43-82.6 3.4-125.6 46.4S185.8-80.8 143-37.8c-43 43-82.6 3.4-125.6 46.4s-3.4 82.6-46.4 125.6-82.6 3.4-125.6 46.4"/></svg>`;
const KEY = 'data:image/svg+xml,<svg width="47" height="49" opacity="0.6" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M46.97 14.27a14 14 0 00-5.34-11.03 14.28 14.28 0 00-17.73-.03 14.12 14.12 0 00-5.38 11.01 14 14 0 001.4 6.12 1 1 0 01-.2 1.15L1.91 39.12a4.01 4.01 0 002.82 6.83 4.09 4.09 0 002.86-1.06 1.02 1.02 0 011.4.04L12 47.92a2.03 2.03 0 002.9.02 2.01 2.01 0 00-.02-2.87l-3.02-2.98a1 1 0 010-1.42l1.27-1.27a1.02 1.02 0 011.44 0l3.01 2.99a2.04 2.04 0 003.45-1.44 2 2 0 00-.57-1.41l-3.02-2.99a1 1 0 010-1.42l8.02-7.95a1.02 1.02 0 011.15-.2 14.31 14.31 0 0018.59-5.9 13.98 13.98 0 001.76-6.8zm-14.23 6.05a6.13 6.13 0 01-5.63-3.73A6 6 0 0128.43 10a6.11 6.11 0 0110.41 4.27c0 1.6-.64 3.14-1.78 4.28a6.12 6.12 0 01-4.32 1.77z"/></svg>';
const WORDMARK = 'data:image/svg+xml,<svg width="199" height="24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M26.7 10.88l-5.62-9.76A2.25 2.25 0 0 0 19.13 0H7.88c-.79 0-1.54.41-1.95 1.13L.3 10.88a2.2 2.2 0 0 0 0 2.24l5.63 9.76A2.25 2.25 0 0 0 7.88 24h11.25c.78 0 1.53-.41 1.95-1.13l5.62-9.75a2.2 2.2 0 0 0 0-2.24zM46.73 4.72h2.43v14.4h-1.91L39.49 9.04v10.08h-2.44V4.72H39l7.76 10.1V4.71h-.03zM53.96 19.12V4.72h2.63v14.4h-2.63zM73.28 4.72h2.06v14.4H73v-8.96l-3.79 8.96H67.5l-3.86-8.85v8.85H61.3V4.72h2.06l4.96 11.3 4.95-11.3zM80.14 19.12V4.72h2.62v14.4h-2.62zM98.06 20.17c.45.45.94.94 1.5 1.4l-1.76 1.42a11.6 11.6 0 0 1-3.34-3.71c-.11 0-.3.03-.6.03-1.39 0-2.58-.3-3.64-.9a5.94 5.94 0 0 1-2.4-2.59A8.7 8.7 0 0 1 87 11.9c0-1.5.26-2.82.83-3.9a6 6 0 0 1 2.36-2.55c1.05-.6 2.25-.9 3.64-.9 1.38 0 2.62.3 3.63.9a5.76 5.76 0 0 1 2.37 2.55c.56 1.12.82 2.43.82 3.9 0 1.65-.34 3.07-.98 4.23a5.99 5.99 0 0 1-2.77 2.6c.38.52.71 1 1.16 1.45zm-7.31-4.3c.75.9 1.8 1.38 3.11 1.38 1.31 0 2.36-.45 3.11-1.39.75-.9 1.13-2.25 1.13-3.94 0-1.68-.38-3-1.13-3.9a3.85 3.85 0 0 0-3.1-1.35c-1.32 0-2.37.45-3.12 1.35-.75.9-1.13 2.22-1.13 3.94a6.6 6.6 0 0 0 1.13 3.9zM112.42 19.12V4.72h1.66v13.02h7.23v1.38h-8.89zM124.91 18.64a4.7 4.7 0 0 1-1.69-1.84 6 6 0 0 1-.6-2.81c0-1.05.2-1.99.6-2.81a4.46 4.46 0 0 1 4.24-2.48c.98 0 1.8.23 2.55.64a4.7 4.7 0 0 1 1.69 1.84 6 6 0 0 1 .6 2.8 6.2 6.2 0 0 1-.6 2.82 4.46 4.46 0 0 1-4.24 2.48c-.97 0-1.83-.23-2.55-.64zm4.84-1.73c.53-.67.82-1.65.82-2.92 0-1.24-.26-2.21-.82-2.89a2.83 2.83 0 0 0-2.33-1.01c-1 0-1.76.34-2.32 1.01-.56.68-.82 1.65-.82 2.89 0 1.27.26 2.25.82 2.92a2.83 2.83 0 0 0 2.33 1.02c1 0 1.8-.34 2.32-1.02zM143.89 8.92v10.1c0 1.5-.38 2.65-1.16 3.44-.8.79-1.92 1.16-3.45 1.16a7.36 7.36 0 0 1-4.02-1.05l.3-1.35c.64.38 1.28.64 1.84.8.56.14 1.2.22 1.88.22.97 0 1.72-.27 2.2-.79.5-.53.76-1.28.76-2.33v-2.4c-.3.64-.75 1.17-1.35 1.5-.6.38-1.31.53-2.14.53-.9 0-1.69-.23-2.36-.64a3.98 3.98 0 0 1-1.61-1.8 6.04 6.04 0 0 1-.57-2.66c0-1.01.19-1.88.56-2.66.38-.79.9-1.35 1.62-1.8a4.65 4.65 0 0 1 4.46-.12c.6.34 1.05.83 1.35 1.47V8.77h1.69v.15zm-2.48 7.54c.56-.64.83-1.54.83-2.7 0-1.16-.27-2.06-.83-2.7a2.97 2.97 0 0 0-2.32-.97 3 3 0 0 0-2.37.97 3.95 3.95 0 0 0-.86 2.7c0 1.16.3 2.06.86 2.7a3 3 0 0 0 2.37.98c.97 0 1.76-.34 2.32-.98zM146.89 4.61h1.99V6.5h-2V4.6zm.15 14.51V8.92h1.65v10.2h-1.65zM160.61 12.71v6.41h-1.65v-6.3c0-.93-.19-1.65-.56-2.06-.38-.45-.97-.67-1.8-.67-.94 0-1.69.3-2.25.86a3.2 3.2 0 0 0-.86 2.36v5.81h-1.62v-7.3c0-1.06-.03-2-.15-2.86h1.58l.15 1.84c.3-.68.79-1.16 1.39-1.54a4.02 4.02 0 0 1 2.13-.52c2.4-.04 3.64 1.31 3.64 3.97zM169.2 19.12V4.72h8.93v1.4h-7.28v4.98h6.86v1.39h-6.86v6.63h-1.65zM180.22 4.61h2V6.5h-2V4.6zm.16 14.51V8.92h1.65v10.2h-1.66zM185.21 19.12V4.24h1.65v14.88h-1.65zM198.56 13.99h-7.46c0 1.31.3 2.28.9 2.92.6.68 1.43.98 2.55.98 1.2 0 2.29-.41 3.26-1.2l.56 1.2c-.44.41-1 .75-1.72.97-.71.23-1.43.38-2.14.38a5 5 0 0 1-3.75-1.43 5.33 5.33 0 0 1-1.35-3.86c0-1.05.19-1.95.6-2.77a4.8 4.8 0 0 1 1.69-1.88 4.63 4.63 0 0 1 2.48-.68c1.34 0 2.4.46 3.18 1.32a5.3 5.3 0 0 1 1.16 3.63V14h.04zm-6.41-3.27a3.81 3.81 0 0 0-1.01 2.18h5.92a3.5 3.5 0 0 0-.82-2.18 2.72 2.72 0 0 0-1.99-.75c-.86 0-1.54.27-2.1.75z"/></svg>';
/* eslint-enable max-len */

const canvas$ = ref<HTMLCanvasElement | null>(null);

function getConfig() {
    const config = typeof props.color === 'number'
        ? LOGIN_FILE_CONFIG[props.color]
        : LOGIN_FILE_CONFIG.find(c => c.name === props.color);
    if (!config) throw new Error(`Invalid Login File color: ${props.color}`);
    return config;
}

// LoginFile._getLabelForDisplay(): default label + unicode-aware truncation
function getLabel() {
    const config = getConfig();
    const label = props.label.trim()
        // Upstream default: '<Color> Account' (en.json login-file-default-account-label)
        || `${config.name.charAt(0).toUpperCase()}${config.name.slice(1)} Account`;
    const symbols = [...label.normalize()];
    if (symbols.length > 25) {
        return [...symbols.slice(0, 24), '…'].join('');
    }
    return label;
}

function getDate() {
    if (props.date) return props.date;
    const leftPad = (num: number) => `${num < 10 ? '0' : ''}${num}`;
    const now = new Date();
    return `${now.getFullYear()}-${leftPad(now.getMonth() + 1)}-${leftPad(now.getDate())}`;
}

// LoginFile._roundRect(), verbatim geometry
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number, height: number, radius: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y); // Top left
    ctx.lineTo(x + width - radius, y); // Top right
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius); // Bottom right
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height); // Bottom left
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius); // Top left
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// LoginFile._drawDataUrlImage()
function drawDataUrlImage(
    ctx: CanvasRenderingContext2D,
    dataUrl: string, x: number, y: number, w: number, h: number,
): Promise<void> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, x, y, w, h); resolve(); };
        img.src = dataUrl;
    });
}

let drawPromise: Promise<void> = Promise.resolve();

// LoginFile._draw(), verbatim sequence
async function draw() {
    if (!canvas$.value) return;
    const canvas = canvas$.value;
    const config = getConfig();

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d')!;

    // The canvas rasterizes whatever font is available at draw time —
    // make sure the brand font is in before any fillText.
    await Promise.all([
        document.fonts.load('600 36px Mulish'),
        document.fonts.load('600 28px Mulish'),
        document.fonts.load('600 24px Mulish'),
    ]).catch(() => { /* fall through to the fallback fonts */ });

    // _drawBackground(): white outer frame + account color radial gradient
    // anchored in the inner bottom-right corner
    ctx.fillStyle = 'white';
    roundRect(ctx, 0, 0, WIDTH, HEIGHT, OUTER_RADIUS);
    const gradient = ctx.createRadialGradient(
        WIDTH - BORDER_WIDTH, HEIGHT - BORDER_WIDTH, 0,
        WIDTH - BORDER_WIDTH, HEIGHT - BORDER_WIDTH,
        Math.sqrt(
            ((WIDTH - 2 * BORDER_WIDTH) ** 2)
          + ((HEIGHT - 2 * BORDER_WIDTH) ** 2),
        ),
    );
    gradient.addColorStop(0, config.corner);
    gradient.addColorStop(1, config.color);
    ctx.fillStyle = gradient;
    roundRect(ctx, BORDER_WIDTH, BORDER_WIDTH, WIDTH - BORDER_WIDTH * 2, HEIGHT - BORDER_WIDTH * 2, RADIUS);

    // _drawDecorations(): security waves + key
    await drawDataUrlImage(ctx, WAVES(config.opacityLines), BORDER_WIDTH, BORDER_WIDTH, 606, 576);
    await drawDataUrlImage(ctx, KEY, 244, 291, 150, 158);

    // _drawNimiqLogo()
    await drawDataUrlImage(ctx, WORDMARK, 116, 86, 398, 48);

    // _setFont()
    ctx.font = `600 28px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';

    // _drawDateText(): rotated -90deg along the right edge
    const dateX = WIDTH - BORDER_WIDTH * 2;
    const dateY = QR_Y + QR_PADDING + QR_BOX_SIZE / 2;
    ctx.translate(dateX, dateY);
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-dateX, -dateY);
    ctx.font = `600 24px ${FONT_FAMILY}`;
    ctx.fillStyle = `rgba(255, 255, 255, ${config.opacityDate})`;
    ctx.fillText(getDate(), dateX, dateY);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.font = `600 28px ${FONT_FAMILY}`; // reset font

    // _drawLabelText(): screen composite, like upstream
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `600 36px ${FONT_FAMILY}`;
    ctx.filter = 'grayscale(100%) brightness(160%)';
    ctx.globalCompositeOperation = 'screen';
    ctx.fillText(getLabel(), WIDTH / 2, 200, WIDTH - BORDER_WIDTH * 4);
    ctx.filter = ''; // upstream resets with the empty string
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `600 28px ${FONT_FAMILY}`;

    // _drawWarningText()
    ctx.fillStyle = 'white';
    ctx.fillText('Keep safe and confidential', WIDTH / 2, HEIGHT - 86 - 2);

    // _drawQrCode(): white rounded modules on transparent, like upstream
    const qrCanvas = document.createElement('canvas');
    QrCreator.render({
        text: props.secret,
        radius: 0.5,
        ecLevel: 'M',
        fill: 'white',
        background: 'transparent',
        size: QR_SIZE,
    }, qrCanvas);
    ctx.drawImage(qrCanvas, QR_X + QR_PADDING, QR_Y + QR_PADDING, QR_SIZE, QR_SIZE);
}

watch(
    () => [props.secret, props.label, props.color, props.date],
    () => { drawPromise = draw(); },
    { immediate: true, flush: 'post' },
);

// LoginFile.toDataUrl()
async function toDataUrl(): Promise<string> {
    await drawPromise;
    return canvas$.value!.toDataURL().replace(/#/g, '%23');
}

// LoginFile.toObjectUrl()
async function toObjectUrl(): Promise<string> {
    await drawPromise;
    return new Promise((resolve, reject) => {
        canvas$.value!.toBlob(blob => {
            if (!blob) {
                reject(new Error('Cannot generate URL'));
                return;
            }
            resolve(URL.createObjectURL(blob));
        });
    });
}

// LoginFile.filename(): 'Nimiq-Login-File-<label>.png' (en.json login-file-filename)
function filename(): string {
    // eslint-disable-next-line no-control-regex
    const sanitized = getLabel().replace(/\s+/gu, '-').replace(/[<>:"/\\|?*\x00-\x1F]/gu, '_');
    return `Nimiq-Login-File-${sanitized}.png`;
}

defineExpose({ toDataUrl, toObjectUrl, filename });
</script>

<style scoped>
/* The card is painted on the canvas; keyguard displays it capped at
   max-height 40rem (DownloadLoginFile.css). The canvas keeps its native
   630x1060 resolution, so it stays crisp and saveable at full size. */
.login-file {
    display: block;
    height: 40rem;
    width: auto;
}
</style>
