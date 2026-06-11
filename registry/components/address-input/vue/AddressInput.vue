<template>
    <div ref="root$" class="address-input" :class="{
        'display-as-nim-address': displayAsNimAddress,
        'display-as-domain': displayAsDomain,
        'invalid': invalid,
    }">
        <textarea ref="textarea$" spellcheck="false" autocomplete="off"
            :placeholder="allowNimAddresses === allowEthAddresses ? undefined : allowNimAddresses ? 'NQ' : '0x'"
            @keydown="_onKeyDown" @input="_onInput" @paste="_onPaste" @cut="_onCut" @copy="_formatClipboard"
            @click="_updateSelection" @select="_updateSelection" @blur="_updateSelection" @focus="_onFocus"
        ></textarea>

        <template v-if="displayAsNimAddress && supportsMixBlendMode">
            <template v-for="row in 3">
                <template v-for="column in 3">
                    <div class="color-overlay" :style="{
                        /* Hidden when placeholder shown. Visibility instead of v-if to avoid flickering in Firefox */
                        visibility: currentValue ? 'visible' : 'hidden',
                        left: `calc(${column - 1} * (var(--block-width) + var(--block-gap-h)) + var(--block-gap-h) - 0.25rem)`,
                        top: `calc(${row - 1} * (var(--block-height) + var(--block-gap-v)) + var(--block-gap-v) + 0.25rem)`,
                        background: `var(--nimiq-${_isBlockFocused((row - 1) * 3 + (column - 1)) ? 'light-' : ''}blue)`,
                    }" :key="`color-${row}-${column}`"></div>
                </template>
            </template>
        </template>

        <transition name="transition-fade">
            <svg v-if="!displayAsDomain" width="210" height="99" viewBox="0 0 210 99" stroke-width="1.5"
                stroke-linecap="round" fill="none" xmlns="http://www.w3.org/2000/svg" class="grid">
                <line x1="0.75" y1="30.25" x2="209.25" y2="30.25"/> <!-- 1st horizontal line -->
                <line x1="0.75" y1="68.25" x2="209.25" y2="68.25"/> <!-- 2nd horizontal line -->
                <transition name="transition-fade">
                    <g v-if="displayAsNimAddress">
                        <line x1="67.75" y1="0.75" x2="67.75" y2="22.25"/> <!-- left vertical line in 1st row -->
                        <line x1="143.75" y1="0.75" x2="143.75" y2="22.25"/> <!-- right vertical line in 1st row -->
                        <line x1="67.75" y1="37.75" x2="67.75" y2="60.25"/> <!-- left vertical line in 2nd row -->
                        <line x1="143.75" y1="37.75" x2="143.75" y2="60.25"/> <!-- right vertical line in 2nd row -->
                        <line x1="67.75" y1="75.75" x2="67.75" y2="98.25"/> <!-- left vertical line in 3rd row -->
                        <line x1="143.75" y1="75.75" x2="143.75" y2="98.25"/> <!-- right vertical line in 3rd row -->
                    </g>
                </transition>
            </svg>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
// Real npm dependency (https://github.com/catamphetamine/input-format), kept as upstream.
import {
    onChange as inputFormatOnChange,
    onPaste as inputFormatOnPaste,
    onCut as inputFormatOnCut,
    onKeyDown as inputFormatOnKeyDown,
} from 'input-format';

interface ParserFlags {
    allowNimAddresses: boolean;
    allowEthAddresses: boolean;
    allowDomains: boolean;
}

const _ADDRESS_REPLACED_CHARS: Record<string, string> = {
    O: '0',
    I: '1',
    Z: '2',
};

const NIM_ADDRESS_MAX_LENGTH = /* 9 blocks */ 9 * /* 4 chars each */ 4 + /* spaces between */ 8;
const _NIMIQ_ADDRESS_REGEX = new RegExp('^(?:'
    + 'NQ?' // NQ at the beginning
    + '|NQ\\d{1,2}' // first two characters after starting NQ must be digits
    // valid address <= max len; excluding invalid address characters I, O, W, Z which are the only characters
    // missing in Nimiq's base32 address alphabet.
    + `|NQ\\d{2}[0-9A-HJ-NP-VXY]{1,${NIM_ADDRESS_MAX_LENGTH - 4 - /* spaces */ 8}}`
    + ')$', 'i');

const ETH_ADDRESS_MAX_LENGTH = /* "0x" */ 2 + /* ETH addresses are 20 bytes, hex encoded */ 40;
const _ETH_ADDRESS_REGEX = new RegExp('^(?:'
    + '0x?' // 0x at the beginning
    + `|0x[0-9a-f]{1,${ETH_ADDRESS_MAX_LENGTH - /* "0x" */ 2}}` // valid address <= max length
    + ')$', 'i');

const _DOMAIN_REGEX = new RegExp('^'
    + '[-a-z0-9]*' // allow hyphens, Latin letters and numbers at the beginning
    + '(?:[a-z0-9]\\.[a-z]*)?' // can contain one dot before which no hyphen is allowed and after only Latin letters
    + '$', 'i');

const _WHITESPACE_REGEX = /\s|\u200B/g; // normal whitespace, tab, newline or zero-width space

// --- Inlined from @nimiq/utils (to avoid the dependency) ---

// ValidationUtils.isValidAddress: IBAN-style checksum validation of a 36-char NQ address.
function isValidNimiqAddress(address: string): boolean {
    if (!address) return false;
    const str = address.replace(/ /g, '');
    if (str.substring(0, 2).toUpperCase() !== 'NQ') return false;
    if (str.length !== 36) return false;
    return _ibanCheck(str.substring(4) + str.substring(0, 4)) === 1;
}

function _ibanCheck(str: string): number {
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

// Clipboard.copy: copy text via a temporary off-screen element preserving formatting.
function copyToClipboard(text: string): boolean {
    const element = document.createElement('textarea');
    element.value = text;
    element.style.fontSize = '12pt'; // Prevent zooming on iOS
    element.style.border = '0';
    element.style.padding = '0';
    element.style.margin = '0';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    document.body.appendChild(element);
    element.select();
    const success = document.execCommand('copy');
    element.remove();
    return success;
}

// --- input-format parse / format definitions (https://github.com/catamphetamine/input-format#usage) ---

// The _parse method is called on every change to the textarea's content, on the entire content, one character at a
// time. The parsed content is then formatted via _format and written back to the textarea.
function _parse(char: string, value: string, parserFlags: ParserFlags): string | undefined {
    if (_WHITESPACE_REGEX.test(char)) return undefined; // skip whitespace as it will be added during formatting

    const addressChar = /* enable char replacement once address prefix NQ or 0x have been typed */ value.length >= 2
        ? _ADDRESS_REPLACED_CHARS[char.toUpperCase()] || char
        : char;
    if (_willBeNimAddress(value + addressChar, parserFlags)) {
        // We return the original character without transforming it to uppercase to improve compatibility with some
        // browsers that struggle with undo/redo of manipulated input. The actual transformation to uppercase is
        // then done via CSS and when the value is exported.
        return addressChar;
    } else if (_willBeEthAddress(value + addressChar, parserFlags)) {
        if (value === '0' && addressChar === 'X') return 'x'; // Convert 0X prefix to more common 0x.
        return addressChar;
    } else if (_willBeDomain(value + char, parserFlags)) {
        return char;
    }
    return undefined; // else reject / skip character
}

function _format(value: string, parserFlags: ParserFlags): { text: string, template?: string } {
    if (_willBeNimAddress(value, parserFlags)) {
        value = _stripWhitespace(value)
            .replace(/.{4}/g, (match, offset) => `${match}${(offset + 4) % 12 ? ' ' : '\n'}`) // form blocks
            .substring(0, NIM_ADDRESS_MAX_LENGTH); // discarding the new line after last block

        if (value.endsWith(' ')) {
            // The word spacing set via css is only applied to spaces that are actually between words which is not
            // the case for an ending space and the caret after an ending space therefore gets rendered at the wrong
            // position. To avoid that we add a zero-width space as an artificial word. We do not add that to the
            // template returned to input-format though to avoid it being interpreted as a typed character which
            // would place the caret after the zero width space.
            value += '\u200B';
        }
        return {
            text: value,
            // Used by input-format to position caret. Using w as placeholder instead of default x as w is not in
            // our address alphabet.
            template: 'wwww wwww wwww\nwwww wwww wwww\nwwww wwww wwww',
        };
    } else if (_willBeEthAddress(value, parserFlags)) {
        value = _stripWhitespace(value)
            .replace(/.{14}/g, (match) => `${match}\n`) // form blocks
            .substring(0, ETH_ADDRESS_MAX_LENGTH + /* new lines */ 2); // discard new line at end

        return {
            text: value,
            template: 'wwwwwwwwwwwwww\nwwwwwwwwwwwwww\nwwwwwwwwwwwwww',
        };
    } else {
        return {
            text: value,
        };
    }
}

function _stripWhitespace(value: string): string {
    return value.replace(_WHITESPACE_REGEX, '');
}

async function _exportValue(value: string, parserFlags: ParserFlags): Promise<string> {
    if (_willBeNimAddress(value, parserFlags)) {
        return value.toUpperCase().replace(/\n/g, ' ').replace(/\u200B/g, '');
    } else if (_willBeEthAddress(value, parserFlags)) {
        // Add checksum for unformatted addresses.
        return _addEthAddressChecksumIfMissing(_stripWhitespace(value));
    } else {
        // For domains only strip formatting character.
        return value.replace(/\u200B/g, '');
    }
}

function _willBeNimAddress(value: string, parserFlags: ParserFlags): boolean {
    return parserFlags.allowNimAddresses
        && _NIMIQ_ADDRESS_REGEX.test(_stripWhitespace(value));
}

function _willBeEthAddress(value: string, parserFlags: ParserFlags): boolean {
    return parserFlags.allowEthAddresses
        && _ETH_ADDRESS_REGEX.test(_stripWhitespace(value));
}

function _willBeDomain(value: string, parserFlags: ParserFlags): boolean {
    return parserFlags.allowDomains
        && !!value.length // expect at least one char
        && _DOMAIN_REGEX.test(value)
        && !_willBeNimAddress(value, parserFlags)
        && !_willBeEthAddress(value, parserFlags);
}

// Simplified from @ethersproject/address, which we don't use directly to avoid its unnecessary dependencies.
async function _isValidEthAddress(address: string): Promise<boolean> {
    return address.length === ETH_ADDRESS_MAX_LENGTH
        && _ETH_ADDRESS_REGEX.test(address)
        && (
            !_hasEthAddressChecksum(address)
            // Recalculate address checksum and check that it matches.
            || await _addEthAddressChecksumIfMissing(address.toLowerCase()) === address
        );
}

// Add checksum to an Ethereum address, if it does not include a checksum yet. Existing checksums (regardless of
// validity) and inputs that are not ethereum addresses are preserved. Simplified from @ethersproject/address, which
// we don't use directly to avoid its unnecessary dependencies.
async function _addEthAddressChecksumIfMissing(address: string): Promise<string> {
    if (address.length !== ETH_ADDRESS_MAX_LENGTH
        || !_ETH_ADDRESS_REGEX.test(address)
        || _hasEthAddressChecksum(address)) return address;

    // Encode checksum as uppercase and lowercase characters.
    const addressHex = address.replace(/^0x/i, '');
    const addressHexCharCodes = addressHex.toLowerCase().split('').map((char) => char.charCodeAt(0));
    // External dependency which can be shared with the consuming app and which is lazy loaded only when needed.
    const { keccak_256: keccak256 } = await import('js-sha3');
    const hashHex = keccak256(addressHexCharCodes);

    let result = '0x';
    for (let i = 0; i < 40; i++) {
        // Address hex char at position i should be uppercase if the decimal value of hash hex char at position
        // i is >= 8, and lowercase otherwise.
        result += parseInt(hashHex[i], 16) >= 8 ? addressHex[i].toUpperCase() : addressHex[i].toLowerCase();
    }
    return result;
}

function _hasEthAddressChecksum(address: string): boolean {
    // If it has uppercase and lowercase chars (ignoring the x of 0x) there is a checksum encoded.
    return /[a-f]/.test(address) && /[A-F]/.test(address);
}

// --- Component ---

const props = withDefaults(defineProps<{
    /** value that can be bound to via v-model:value (emits both 'input' and 'update:value') */
    value?: string,
    autofocus?: boolean,
    allowNimAddresses?: boolean,
    allowEthAddresses?: boolean,
    allowDomains?: boolean,
}>(), {
    value: '',
    autofocus: false,
    allowNimAddresses: true,
    allowEthAddresses: false,
    allowDomains: false,
});

const emit = defineEmits<{
    (e: 'input', value: string): void,
    (e: 'update:value', value: string): void,
    (e: 'paste', event: ClipboardEvent, pastedData: string): void,
    (e: 'address', address: string): void,
}>();

const root$ = ref<HTMLDivElement | null>(null);
const textarea$ = ref<HTMLTextAreaElement | null>(null);

const currentValue = ref('');
const selectionStartBlock = ref(-1);
const selectionEndBlock = ref(-1);
const invalid = ref(false);
const supportsMixBlendMode = CSS.supports('mix-blend-mode', 'screen');

const parserFlags = computed<ParserFlags>(() => ({
    allowNimAddresses: props.allowNimAddresses,
    allowEthAddresses: !!props.allowEthAddresses,
    allowDomains: !!props.allowDomains,
}));

const displayAsNimAddress = computed(() =>
    // initially display as Nim address by default if Nim is the only allowed address type or no Eth is allowed and
    // no value is set yet.
    (props.allowNimAddresses && !props.allowEthAddresses && (!props.allowDomains || !currentValue.value))
    || _willBeNimAddress(currentValue.value, parserFlags.value));

const displayAsDomain = computed(() =>
    (props.allowDomains && !props.allowNimAddresses && !props.allowEthAddresses)
    || _willBeDomain(currentValue.value, parserFlags.value));

function focus(scrollIntoView = false) {
    if (!textarea$.value) return;
    textarea$.value.focus();
    if (scrollIntoView) textarea$.value.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

watch(() => props.value, _onExternalValueChange);

onMounted(() => {
    // trigger initial value change. Not using immediate watcher as it already fires before mounted.
    _onExternalValueChange();

    // Bind selectionchange event handler. It has to be registered on document and is unfortunately not fired for
    // selections in textareas in Firefox. Therefore we also bind the listener to focus, blur, select, click.
    document.addEventListener('selectionchange', _updateSelection);

    if (props.autofocus) focus();
});

onUnmounted(() => {
    document.removeEventListener('selectionchange', _updateSelection);
});

async function _onExternalValueChange() {
    // Note that external changes also happen if the parent component binds a v-model that feeds the values emitted
    // via the 'input' event back to the value prop. However, the following check will result in an early return in
    // these cases to avoid unnecessary processing.
    if (_stripWhitespace(currentValue.value)
        // Call _exportValue because currentValue is also exported / formatted.
        === _stripWhitespace(await _exportValue(props.value, parserFlags.value))) return;

    // could also be using format-input's parse and format helpers that preserve caret position but as we're not
    // interested in that, we calculate the formatted value manually
    const parsedValue = props.value.split('').reduce((parsed, char) =>
        parsed + (_parse(char, parsed, parserFlags.value) || ''), '');
    textarea$.value!.value = _format(parsedValue, parserFlags.value).text; // moves caret to the end

    await _afterChange(parsedValue);
}

function _onKeyDown(e: KeyboardEvent) {
    inputFormatOnKeyDown(
        e,
        textarea$.value!,
        (char: string, value: string) => _parse(char, value, parserFlags.value),
        (value: string) => _format(value, parserFlags.value),
        _afterChange,
    );
    setTimeout(() => _updateSelection(), 10); // for arrow keys in Firefox
}

function _onInput(e: Event & { inputType?: string }) {
    if (e.inputType === 'deleteByDrag') return; // we'll handle the subsequent insertFromDrop
    inputFormatOnChange(
        e,
        textarea$.value!,
        (char: string, value: string) => _parse(char, value, parserFlags.value),
        (value: string) => _format(value, parserFlags.value),
        _afterChange,
    );
}

function _onPaste(e: ClipboardEvent) {
    const clipboardData = e.clipboardData;
    const pastedData = clipboardData ? clipboardData.getData('text/plain') : '';
    emit('paste', e, pastedData);

    inputFormatOnPaste(
        e,
        textarea$.value!,
        (char: string, value: string) => _parse(char, value, parserFlags.value),
        (value: string) => _format(value, parserFlags.value),
        _afterChange,
    );
}

function _onCut(e: ClipboardEvent) {
    inputFormatOnCut(
        e,
        textarea$.value!,
        (char: string, value: string) => _parse(char, value, parserFlags.value),
        (value: string) => _format(value, parserFlags.value),
        _afterChange,
    );
    _formatClipboard();
}

function _onFocus() {
    // have to add a delay because the textarea is not focused yet at this point
    setTimeout(() => _updateSelection());
}

async function _formatClipboard() {
    // While it's possible to set the clipboard data via clipboardEvent.clipboardData.setData this requires calling
    // preventDefault() which then results in the need to reimplement the behavior for cutting text and has side
    // effects like the change not being added to the undo history. Therefore we let the browser do the default
    // behavior but overwrite the clipboard afterwards.
    const text = await _exportValue(document.getSelection()!.toString(), parserFlags.value);
    setTimeout(() => copyToClipboard(text));
}

async function _afterChange(value: string) {
    // value is the unformatted value (i.e. the concatenation of characters returned by _parse)
    const textarea = textarea$.value!;

    // if selection is a caret in front of a space or new line move caret behind it
    if (textarea.selectionStart === textarea.selectionEnd
        && (textarea.value[textarea.selectionStart] === ' ' || textarea.value[textarea.selectionStart] === '\n')) {
        textarea.selectionStart += 1; // this also moves the selectionEnd as they were equal
    }

    // Use a local variable in this method instead of currentValue.value because currentValue might
    // potentially change during this async method by a parallel invocation.
    const exportedValue = await _exportValue(textarea.value, parserFlags.value);
    currentValue.value = exportedValue;
    emit('input', exportedValue); // emit event compatible with Vue 2 v-model
    emit('update:value', exportedValue); // Vue 3 v-model:value

    if (_willBeNimAddress(value, parserFlags.value)) {
        const isValid = isValidNimiqAddress(exportedValue);
        if (isValid) emit('address', exportedValue);

        // if user entered a full address that is not valid give him a visual feedback
        invalid.value = exportedValue.length === NIM_ADDRESS_MAX_LENGTH && !isValid;
    } else if (_willBeEthAddress(value, parserFlags.value)) {
        const isValid = await _isValidEthAddress(exportedValue);
        if (isValid) {
            emit('address', exportedValue);
            // Write address with potentially added checksum back to the textarea. Note that this places the cursor
            // at the end and messes with undo, which is why we don't simply write the text back into the textarea
            // after each character. Unfortunately, we can't do the checksum formatting directly in _format because
            // it can't be async.
            textarea$.value!.value = _format(exportedValue, parserFlags.value).text;
        }

        // if user entered a full address that is not valid give him a visual feedback
        invalid.value = exportedValue.length === ETH_ADDRESS_MAX_LENGTH && !isValid;
    }
}

function _updateSelection() {
    const textarea = textarea$.value;
    if (!textarea) return;
    const focused = document.activeElement === textarea
        // If all blocks are filled and the caret is at the end display as if not focused.
        && (textarea.selectionStart !== NIM_ADDRESS_MAX_LENGTH
        || textarea.selectionEnd !== NIM_ADDRESS_MAX_LENGTH);
    selectionStartBlock.value = focused ? Math.floor(textarea.selectionStart / 5) : -1;
    selectionEndBlock.value = focused ? Math.floor(textarea.selectionEnd / 5) : -1;
}

function _isBlockFocused(blockIndex: number) {
    return selectionStartBlock.value <= blockIndex && blockIndex <= selectionEndBlock.value;
}

defineExpose({ focus });
</script>

<style scoped>
    .address-input {
        --font-size: 3rem;
        --block-height: 4.125rem;
        --block-width: 8.5rem;
        --block-gap-v: 0.75rem;
        --block-gap-h: 1rem;

        contain: size layout paint style;
        width: calc(3 * var(--block-width) + 3 * var(--block-gap-h));
        height: calc(3 * var(--block-height) + 3.5 * var(--block-gap-v));
        position: relative;
        background: white; /* Note: our text coloring with mix-blend-mode only works on white background */

        border-radius: 0.5rem;
        --border-color: rgba(31, 35, 72, 0.1); /* Based on Nimiq Blue */
        box-shadow: inset 0 0 0 1.5px var(--border-color);
        transition: box-shadow .2s ease, height 0.3s var(--nimiq-ease);
        overflow: hidden;
    }

    .address-input.display-as-domain {
        height: calc(var(--block-height) + 2 * var(--block-gap-v));
    }

    .address-input:hover {
        --border-color: rgba(31, 35, 72, 0.14); /* Based on Nimiq Blue */
    }

    .address-input:focus-within {
        --border-color: rgba(5, 130, 202, 0.4); /* Based on Nimiq Light Blue */
    }

    .address-input.invalid {
        animation: shake .4s;
    }

    /* Copied from Keyguard */
    @keyframes shake {
        from { transform: none; }
        10%  { transform: translate3d(-0.25rem, 0, 0) rotate(-0.15deg); }
        20%  { transform: translate3d(0.5rem, 0, 0) rotate(0.15deg); }
        30%  { transform: translate3d(-0.5rem, 0, 0) rotate(-0.15deg); }
        40%  { transform: translate3d(0.5rem, 0, 0) rotate(0.15deg); }
        50%  { transform: translate3d(-0.25rem, 0, 0) rotate(-0.15deg); }
        to   { transform: none; }
    }

    textarea {
        --line-height: calc(var(--block-height) + var(--block-gap-v));

        contain: size layout paint style;
        position: absolute;
        width: 100%;
        height: calc(3 * var(--line-height));
        line-height: var(--line-height);
        top: calc(var(--font-size) / 24 + var(--block-gap-v) / 2); /* -3px at default font size */
        left: calc(var(--font-size) / 24 * 5 + var(--block-gap-h) / 2); /* 5px at default font size */
        padding: 0;
        margin: 0;
        border: none;
        outline: unset !important;
        resize: none;
        overflow: hidden;
        z-index: 1;
        /* Note: if loading only a subset of Fira Mono, the whitespace character must be included for rendering of
        spaces at correct width in some browsers */
        font-family: Fira Mono, 'monospace';
        font-size: var(--font-size);
        /* the width of rendered letters may slightly differ across different browsers on different OSs. To compensate
        for that we apply a letter-spacing based on the deviation from a reference value */
        letter-spacing: calc(1.8rem - 0.6em); /* 1ch changed to 0.6em, 'ch' in 'calc' making Safari 14.5 crash */
        word-spacing: calc(var(--block-gap-h) / 2);
        color: var(--nimiq-blue);
        background: transparent;
        transition: color 0.2s ease;
    }

    textarea:focus {
        color: var(--nimiq-light-blue);
    }

    .display-as-domain textarea {
        height: var(--line-height);
        white-space: nowrap;
        width: calc(100% - 2 * var(--block-gap-h))
    }

    .display-as-nim-address textarea {
        text-transform: uppercase;
        /* Mask image to make selections visible only within blocks. Using mask image instead clip path to be able to
        click onto the textarea on the invisible areas too */
        mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 123"><rect x="-1" y="6" width="62" height="28"/><rect x="79" y="6" width="62" height="28"/><rect x="159" y="6" width="62" height="28"/><rect x="-1" y="47" width="62" height="28"/><rect x="79" y="47" width="62" height="28"/><rect x="159" y="47" width="62" height="28"/><rect x="-1" y="88" width="62" height="28"/><rect x="79" y="88" width="62" height="28"/><rect x="159" y="88" width="62" height="28"/></svg>');
    }

    @supports (mix-blend-mode: screen) {
        .display-as-nim-address textarea {
            color: black; /* the actual color will be set via mix-blend-mode */
        }

        .display-as-nim-address textarea::selection {
            color: white;
            background: #561a51; /* a color that in combination with mix-blend-mode yields a color close to the default */
        }

        .display-as-nim-address textarea::-moz-selection {
            background: #411d68; /* a color that in combination with mix-blend-mode yields a color close to the default */
        }

        .color-overlay {
            contain: size layout paint style;
            position: absolute;
            width: calc(var(--block-width) - .5rem);
            height: calc(var(--block-height) - .5rem);
            mix-blend-mode: screen;
            z-index: 1;
            pointer-events: none;
        }
    }

    ::-webkit-input-placeholder {
        opacity: .6;
        transition: color .2s var(--nimiq-ease);
    }
    ::-ms-input-placeholder {
        opacity: .6;
        transition: color .2s var(--nimiq-ease);
    }
    ::-moz-placeholder {
        opacity: .6;
        transition: color .2s var(--nimiq-ease);
    }
    ::placeholder {
        opacity: .6;
        transition: color .2s var(--nimiq-ease);
    }

    textarea:focus::-webkit-input-placeholder {
        color: var(--nimiq-light-blue);
    }
    textarea:focus::-ms-input-placeholder {
        color: var(--nimiq-light-blue);
    }
    textarea:focus::-moz-placeholder {
        color: var(--nimiq-light-blue);
    }
    textarea:focus::placeholder {
        color: var(--nimiq-light-blue);
    }

    .grid {
        contain: size layout paint style;
        position: absolute;
        top: calc(var(--font-size) / 24 * 8 + var(--block-gap-v) / 2);
        left: calc(var(--font-size) / 24 * 5 + var(--block-gap-h) / 2);
        stroke: var(--border-color);
        transition: stroke .2s ease, opacity 0.2s ease;
    }

    textarea:focus ~ .grid {
        opacity: 0.5;
    }

    .grid g {
        transition: opacity .2s ease;
    }

    /* Vue 3 transition class names (-enter-from); Vue 2's -enter kept for compatibility */
    .grid.transition-fade-enter,
    .grid.transition-fade-enter-from,
    .grid.transition-fade-leave-to,
    .grid g.transition-fade-enter,
    .grid g.transition-fade-enter-from,
    .grid g.transition-fade-leave-to {
        opacity: 0 !important;
    }
</style>
