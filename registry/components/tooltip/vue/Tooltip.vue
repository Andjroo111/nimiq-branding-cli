<template>
    <span class="tooltip"
        :class="[positionCssClass, {
            shown: isShown,
            'inverse-theme': theme === 'inverse',
        }]"
        :style="background ? `--background: ${background}` : undefined"
        @mouseenter="mouseOver(true)"
        @mouseleave="mouseOver(false)"
    >
        <a href="javascript:void(0);"
            ref="tooltipTrigger$"
            @focus.stop="show()"
            @blur.stop="hide()"
            @click="onClick()"
            :tabindex="disabled || noFocus ? -1 : 0"
            class="trigger"
        >
            <slot name="trigger">
                <!-- default trigger: AlertTriangleIcon (alert-triangle.svg from @nimiq/style, inlined) -->
                <svg class="nq-icon nq-orange" width="17" height="16" viewBox="0 0 17 16"
                    xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.913 13.333L9.68 1.433a1.333 1.333 0 0 0-2.362 0l-6.232 11.9a1.333 1.333 0 0 0 1.182 1.952H14.73a1.333 1.333 0 0 0 1.182-1.952zm-8.08-7.718a.667.667 0 0 1 1.334 0v4a.667.667 0 1 1-1.334 0v-4zm.682 7.674h.018a.983.983 0 0 0 .967-1.022 1.018 1.018 0 0 0-1.016-.978h-.019a.984.984 0 0 0-.965 1.02c.02.546.468.978 1.015.98z" fill="currentColor"/></svg>
            </slot>
        </a>
        <transition name="transition-fade">
            <div ref="tooltipBox$"
                v-if="isShown"
                class="tooltip-box"
                :style="tooltipBoxStyles">
                <slot></slot>
            </div>
        </transition>
    </span>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components Tooltip.vue.
// Differences to upstream: deprecated `reference` prop and `icon` slot dropped
// (use `container` / `trigger`); otherwise the full positioning, clamping and
// hover/focus/click behavior is ported. Requires @nimiq/style (legacy
// nimiq-style.min.css) for --nimiq-blue, --nimiq-blue-bg and --nimiq-ease.
import {
    ref, computed, watch, onMounted, onBeforeUnmount, nextTick, type CSSProperties,
} from 'vue';

type VerticalPosition = 'top' | 'bottom';
type HorizontalPosition = 'left' | 'right';
type Position = VerticalPosition | HorizontalPosition;
const VERTICAL_POSITIONS: VerticalPosition[] = ['top', 'bottom'];
const HORIZONTAL_POSITIONS: HorizontalPosition[] = ['left', 'right'];

/** Container within which the tooltip should be positioned if possible. */
type Container = HTMLElement | { $el: HTMLElement };

const props = withDefaults(defineProps<{
    container?: Container,
    disabled?: boolean,
    noFocus?: boolean,
    /**
     * Preferred tooltip position as "[primary] [secondary]" or "[primary]".
     * The primary position can be either vertical or horizontal. The optional
     * secondary position should be of the opposite type. If only a primary
     * position is provided, the tooltip is centered in the opposite direction.
     */
    preferredPosition?: string,
    /**
     * Margin to maintain to container. If no container is set, this prop has no
     * effect. For omitted values, the container's padding is used as margin.
     */
    margin?: Partial<Record<Position, number>>,
    /** Sets the tooltip's width to the container's width minus margin. */
    autoWidth?: boolean,
    theme?: 'normal' | 'inverse',
    /** Background of the tooltip as a CSS value. Overrides the theme. */
    background?: string,
    /** Styles to apply on the tooltip box without deep css selectors. */
    styles?: CSSProperties,
}>(), {
    preferredPosition: 'top right',
    autoWidth: false,
    theme: 'normal',
});

const emit = defineEmits<{
    (e: 'show'): void,
    (e: 'hide'): void,
    (e: 'click'): void,
}>();

const tooltipTrigger$ = ref<HTMLAnchorElement | null>(null);
const tooltipBox$ = ref<HTMLDivElement | null>(null);

const tooltipToggled = ref(false);
const mousedOver = ref(false);
let mouseOverTimeout = -1;
let lastToggle = -1;

const height = ref(0);
const width = ref(0);
const maxWidth = ref(0);
const left = ref<number | null>(0);
const right = ref<number | null>(0);
const top = ref(0);
const positionCssClass = ref('');

const isShown = computed(() => (tooltipToggled.value || mousedOver.value) && !props.disabled);

function containerEl(): HTMLElement | null {
    if (!props.container) return null;
    return props.container instanceof HTMLElement ? props.container : props.container.$el;
}

const tooltipBoxStyles = computed<CSSProperties>(() => ({
    // note that we let the browser calculate height automatically
    ...props.styles,
    top: `${top.value}px`,
    left: left.value ? `${left.value}px` : undefined,
    right: right.value ? `${right.value}px` : undefined,
    width: containerEl() && props.autoWidth ? `${width.value}px` : (props.styles || {}).width,
    maxWidth: containerEl() ? `${maxWidth.value}px` : (props.styles || {}).maxWidth,
}));

function show() {
    if (props.disabled) return;
    tooltipToggled.value = true;
}

function hide(force = false) {
    if (props.disabled) return;
    tooltipToggled.value = false;
    tooltipTrigger$.value?.blur();
    if (!force) return;
    mousedOver.value = false;
}

function toggle(force = false) {
    if (tooltipToggled.value || mousedOver.value) {
        hide(force);
    } else {
        show();
    }
}

function getMargin(position: Position): number {
    if (props.margin && props.margin[position] !== undefined) return props.margin[position]!;
    const el = containerEl();
    if (!el) return 0;
    return parseInt(window.getComputedStyle(el, null).getPropertyValue(`padding-${position}`), 10);
}

async function update(newWatcherValue?: boolean) {
    // updates dimensions and repositions tooltip
    if (!isShown.value) {
        if (newWatcherValue === false) {
            lastToggle = Date.now();
            emit('hide');
        }
        return; // no need to update as tooltip not visible
    } else if (newWatcherValue === true) {
        lastToggle = Date.now();
        emit('show');
    }

    const container = containerEl();
    if (container) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => {
            // avoid potential forced layouting / reflow by measuring within a requestAnimationFrame
            const leftMargin = getMargin('left');
            const rightMargin = getMargin('right');
            maxWidth.value = container.offsetWidth - leftMargin - rightMargin;
            if (props.autoWidth) width.value = maxWidth.value;
            resolve();
        }));
    }

    // make sure that tooltipBox is created, then update measurements
    await nextTick();
    if (!isShown.value || !tooltipBox$.value) return; // not visible anymore?
    height.value = tooltipBox$.value.offsetHeight;
    width.value = tooltipBox$.value.offsetWidth;

    updatePosition();
}

function updatePosition() {
    if (!isShown.value || !tooltipBox$.value || !tooltipTrigger$.value) return;

    const [preferredPrimaryPosition, preferredSecondaryPosition] = props.preferredPosition.split(' ');
    const isPrimaryVertical = VERTICAL_POSITIONS.includes(preferredPrimaryPosition as VerticalPosition);
    const isPrimaryHorizontal = HORIZONTAL_POSITIONS.includes(preferredPrimaryPosition as HorizontalPosition);

    const container = containerEl();
    const triggerBoundingRect = tooltipTrigger$.value.getBoundingClientRect();
    const containerBoundingRect = container ? container.getBoundingClientRect() : null;
    const containerMargins: Record<Position, number> = {
        top: getMargin('top'),
        right: getMargin('right'),
        bottom: getMargin('bottom'),
        left: getMargin('left'),
    };

    const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

    const setPositionForPrimaryHorizontal = (
        primary: HorizontalPosition,
        secondary?: VerticalPosition, // can be undefined in which case the box is centered vertically
    ) => {
        left.value = primary === 'right' ? triggerBoundingRect.width : null;
        right.value = primary === 'left' ? triggerBoundingRect.width : null;

        const topMostTopPosition = -height.value + triggerBoundingRect.height / 2 + 25;
        const bottomMostTopPosition = triggerBoundingRect.height / 2 - 25;

        const clampedTopMostTopPosition = containerBoundingRect ? clamp(
            topMostTopPosition,
            containerBoundingRect.top + containerMargins.top
                - triggerBoundingRect.top, // expressed in trigger's coordinate system
            bottomMostTopPosition,
        ) : topMostTopPosition;

        const clampedBottomMostTopPosition = containerBoundingRect ? clamp(
            bottomMostTopPosition,
            topMostTopPosition,
            containerBoundingRect.top + containerBoundingRect.height
                - containerMargins.bottom
                - height.value
                - triggerBoundingRect.top, // expressed in trigger's coordinate system
        ) : bottomMostTopPosition;

        top.value = secondary === 'top'
            ? clampedTopMostTopPosition
            : (secondary === 'bottom'
                ? clampedBottomMostTopPosition
                : clamp(
                    triggerBoundingRect.height / 2 - height.value / 2,
                    clampedTopMostTopPosition,
                    clampedBottomMostTopPosition,
                )
            );

        positionCssClass.value = `position-${primary}-${secondary || 'center'}`;
    };

    const setPositionForPrimaryVertical = (
        primary: VerticalPosition,
        secondary?: HorizontalPosition, // can be undefined in which case the box is centered horizontally
    ) => {
        top.value = primary === 'bottom' ? triggerBoundingRect.height : -height.value;
        right.value = null;

        const leftMostLeftPosition = triggerBoundingRect.width / 2 - width.value + 25;
        const rightMostLeftPosition = triggerBoundingRect.width / 2 - 25;

        const clampedLeftMostLeftPosition = containerBoundingRect ? clamp(
            leftMostLeftPosition,
            containerBoundingRect.left + containerMargins.left
                - triggerBoundingRect.left, // expressed in trigger's coordinate system
            rightMostLeftPosition,
        ) : leftMostLeftPosition;

        const clampedRightMostLeftPosition = containerBoundingRect ? clamp(
            rightMostLeftPosition,
            leftMostLeftPosition,
            containerBoundingRect.left + containerBoundingRect.width
                - containerMargins.right
                - width.value
                - triggerBoundingRect.left, // expressed in trigger's coordinate system
        ) : rightMostLeftPosition;

        left.value = secondary === 'left'
            ? clampedLeftMostLeftPosition
            : (secondary === 'right'
                ? clampedRightMostLeftPosition
                : clamp(
                    triggerBoundingRect.width / 2 - width.value / 2,
                    clampedLeftMostLeftPosition,
                    clampedRightMostLeftPosition,
                )
            );

        positionCssClass.value = `position-${primary}-${secondary || 'center'}`;
    };

    if (container && containerBoundingRect) {
        const calculateAvailableSpace = (dir: Position) =>
            Math.abs(triggerBoundingRect[dir] - containerBoundingRect[dir]
                + (dir === 'left' || dir === 'top' ? -1 : 1) * containerMargins[dir]);

        if (isPrimaryVertical) {
            const heightNeeded = height.value + /* for the arrow */ 16;
            const fitsTop = calculateAvailableSpace('top') >= heightNeeded;
            const fitsBottom = calculateAvailableSpace('bottom') >= heightNeeded;
            setPositionForPrimaryVertical(
                (!fitsTop && fitsBottom)
                    ? 'bottom'
                    : (fitsTop && !fitsBottom)
                        ? 'top'
                        : preferredPrimaryPosition as VerticalPosition,
                preferredSecondaryPosition as HorizontalPosition | undefined,
            );
        } else if (isPrimaryHorizontal) {
            const widthNeeded = width.value + /* for the arrow */ 16;
            const fitsLeft = calculateAvailableSpace('left') >= widthNeeded;
            const fitsRight = calculateAvailableSpace('right') >= widthNeeded;
            setPositionForPrimaryHorizontal(
                (!fitsLeft && fitsRight)
                    ? 'right'
                    : (fitsLeft && !fitsRight)
                        ? 'left'
                        : preferredPrimaryPosition as HorizontalPosition,
                preferredSecondaryPosition as VerticalPosition | undefined,
            );
        }
    } else {
        if (isPrimaryVertical) {
            setPositionForPrimaryVertical(
                preferredPrimaryPosition as VerticalPosition,
                preferredSecondaryPosition as HorizontalPosition | undefined,
            );
        } else if (isPrimaryHorizontal) {
            setPositionForPrimaryHorizontal(
                preferredPrimaryPosition as HorizontalPosition,
                preferredSecondaryPosition as VerticalPosition | undefined,
            );
        }
    }
}

async function setContainer(newContainer?: Container, oldContainer?: Container) {
    const oldEl = !oldContainer ? null
        : oldContainer instanceof HTMLElement ? oldContainer : oldContainer.$el;
    if (oldEl) oldEl.removeEventListener('scroll', updatePosition);

    const newEl = !newContainer ? null
        : newContainer instanceof HTMLElement ? newContainer : newContainer.$el;
    if (newEl) {
        // In case the container is scrollable add a listener
        await new Promise<void>((resolve) => requestAnimationFrame(() => {
            if (newEl.scrollHeight !== newEl.offsetHeight) {
                newEl.addEventListener('scroll', updatePosition);
            }
            resolve();
        }));
    }

    await update();
}

function mouseOver(mouseOverTooltip: boolean) {
    if (!mouseOverTooltip) { // mouseleave
        mouseOverTimeout = window.setTimeout(() => mousedOver.value = false, 100);
    } else { // mouseenter
        window.clearTimeout(mouseOverTimeout);
        mousedOver.value = true;
    }
}

function onClick() {
    if (Date.now() - lastToggle < 200) return; // just toggled by mouseover or focus
    toggle(/* force */ true);
    emit('click');
}

watch(isShown, (newValue) => update(newValue));
watch(() => props.preferredPosition, updatePosition);
watch(() => props.container, (newContainer, oldContainer) => setContainer(newContainer, oldContainer));

onMounted(() => setContainer(props.container));
onBeforeUnmount(() => {
    const el = containerEl();
    if (el) el.removeEventListener('scroll', updatePosition);
});

defineExpose({ show, hide, toggle, update });
</script>

<style scoped>
    .tooltip {
        /* contain: layout style; */
        display: inline-block;
        position: relative;
        line-height: 1;
    }

    .trigger {
        /* contain: layout style; */
        position: relative;
        display: inline-block;
        vertical-align: bottom;
        text-decoration: none;
        outline: none;
        cursor: default;
        color: inherit;
    }

    .trigger :deep(svg:first-child:last-child),
    .trigger :deep(img:first-child:last-child) {
        display: block;
    }

    .trigger::after {
        opacity: 0;
        content: '';
        display: block;
        position: absolute;
        width: 2.25rem;
        height: 2rem;
        left: calc(50% - 1.125rem);
        mask-image: url('data:image/svg+xml,<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg"><path d="M9 7.12c-.47 0-.93.2-1.23.64L3.2 14.29A4 4 0 0 1 0 16h18a4 4 0 0 1-3.2-1.7l-4.57-6.54c-.3-.43-.76-.64-1.23-.64z" fill="white"/></svg>');
        transition: opacity .3s var(--nimiq-ease), .3s visibility;
        transition-delay: 16ms; /* delay one animation frame for better sync with tooltipBox */
        visibility: hidden;
        z-index: 1000; /* move above tooltip-box's box-shadow */
    }

    [class*='position-top'] .trigger::after {
        top: -2rem;
        transform: scaleY(-1);
    }
    [class*='position-bottom'] .trigger::after {
        top: 100%;
    }
    [class*='position-left'] .trigger::after {
        top: 50%;
        left: -2.25rem;
        transform: translateY(-50%) rotate(90deg);
    }
    [class*='position-right'] .trigger::after {
        top: 50%;
        left: 100%;
        transform: translateY(-50%) rotate(-90deg);
    }

    /* Set the arrow color. For the tooltip box's default nimiq-blue-bg background, which is a gradient, set the arrow
    color depending on the position to a color from the area of nimiq-blue-bg where the arrow touches it. */
    .position-top-left .trigger::after,
    .position-left-top .trigger::after {
        background: var(--background, #250737);
    }
    .position-top-center .trigger::after,
    .position-left-center .trigger::after {
        background: var(--background, #23123e);
    }
    .position-top-right .trigger::after,
    .position-left-bottom .trigger::after {
        background: var(--background, #211e45);
    }
    /* At the top and left edge of the tooltip box, the gradient is already fully faded away. */
    [class*='position-bottom'] .trigger::after,
    [class*='position-right'] .trigger::after {
        background: var(--background, var(--nimiq-blue));
    }

    .inverse-theme .trigger::after {
        background: var(--background, white);
    }

    .shown .trigger::after {
        opacity: 1;
        visibility: visible;
    }

    .tooltip-box {
        contain: layout paint style;
        position: absolute;
        color: white;
        background: var(--background, var(--nimiq-blue-bg));
        padding: 1.5rem;
        border-radius: .5rem;
        font-size: 1.75rem;
        line-height: 1.5;
        font-weight: 600;
        transition: opacity .3s var(--nimiq-ease);
        box-shadow: 0 1.125rem 2.275rem rgba(0, 0, 0, 0.11);
        z-index: 999;
    }

    .inverse-theme .tooltip-box {
        color: var(--nimiq-blue);
        background: white;
    }

    .tooltip-box.transition-fade-enter-from,
    .tooltip-box.transition-fade-leave-to {
        opacity: 0;
    }

    [class*='position-top'] .tooltip-box {
        transform: translateY(-2rem);
    }

    [class*='position-bottom'] .tooltip-box {
        transform: translateY(2rem);
    }

    [class*='position-left'] .tooltip-box {
        transform: translateX(-2rem);
    }

    [class*='position-right'] .tooltip-box {
        transform: translateX(2rem);
    }
</style>
