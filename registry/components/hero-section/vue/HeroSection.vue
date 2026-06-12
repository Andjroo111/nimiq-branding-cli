<script setup>
/* hero-section — nimiq.com home hero (marketing, screenshot-referenced recreation).
   Requires hero-section.css and Mulish (Google Fonts). No npm deps. */
defineProps({
    title: { type: String, default: 'Universal Money for\nIndependent Individuals' },
    subtitle: { type: String, default: 'In a centralized world, Nimiq gives independence back to you.' },
    ctaLabel: { type: String, default: 'Create Wallet' },
    ctaHref: { type: String, default: '#' },
    showPartners: { type: Boolean, default: true },
});
</script>

<template>
    <section class="nq-hero-section">
        <svg class="nq-hero-section__globe" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice"
            aria-hidden="true">
            <defs>
                <radialGradient id="nq-hs-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#8a93ff" stop-opacity="0.7"/>
                    <stop offset="55%" stop-color="#5868e8" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#5868e8" stop-opacity="0"/>
                </radialGradient>
                <pattern id="nq-hs-dots" width="7" height="7" patternUnits="userSpaceOnUse">
                    <circle cx="1.6" cy="1.6" r="1.15" fill="#c3c8d8"/>
                </pattern>
                <clipPath id="nq-hs-clip"><circle cx="600" cy="1906" r="1370"/></clipPath>
            </defs>
            <ellipse cx="600" cy="548" rx="980" ry="150" fill="url(#nq-hs-glow)"/>
            <circle cx="600" cy="1906" r="1370" fill="#ffffff"/>
            <g clip-path="url(#nq-hs-clip)" fill="url(#nq-hs-dots)">
                <!-- rough continent blobs; exact dot positions are not meaningful -->
                <path d="M96 668 Q120 612 188 596 Q252 580 312 600 Q376 620 356 660 Q332 700 296 712 Q330 740 312 776 Q290 800 240 800 L150 800 Q120 760 128 716 Q96 704 96 668 Z"/>
                <path d="M356 590 Q392 572 436 582 Q462 592 444 606 Q416 618 376 612 Q348 604 356 590 Z"/>
                <path d="M470 596 Q506 566 556 572 Q596 578 588 602 Q628 606 656 636 Q680 668 660 716 Q636 772 580 794 Q540 800 516 770 Q488 728 480 676 Q458 634 470 596 Z"/>
                <path d="M664 600 Q716 556 800 552 Q908 548 992 576 Q1062 600 1052 648 Q1040 690 968 692 Q996 716 972 736 Q940 756 904 736 Q884 716 856 706 Q800 712 760 686 Q700 660 680 632 Q660 614 664 600 Z"/>
                <path d="M948 752 Q988 728 1040 740 Q1086 754 1076 786 Q1062 800 1016 800 L960 800 Q936 772 948 752 Z"/>
                <path d="M1096 644 Q1128 630 1160 642 Q1180 654 1160 668 Q1130 678 1104 666 Q1088 654 1096 644 Z"/>
                <ellipse cx="912" cy="586" rx="14" ry="7"/>
                <ellipse cx="1078" cy="710" rx="12" ry="6"/>
                <ellipse cx="418" cy="640" rx="10" ry="5"/>
            </g>
        </svg>

        <span class="nq-hero-section__hex nq-hero-section__hex--a"></span>
        <span class="nq-hero-section__hex nq-hero-section__hex--b"></span>
        <span class="nq-hero-section__hex nq-hero-section__hex--c"></span>
        <span class="nq-hero-section__hex nq-hero-section__hex--d"></span>

        <div class="nq-hero-section__inner">
            <h1 class="nq-hero-section__title">
                <template v-for="(line, i) in title.split('\n')" :key="i">
                    <br v-if="i > 0">{{ line }}
                </template>
            </h1>
            <p class="nq-hero-section__subtitle">{{ subtitle }}</p>
            <a class="nq-hero-section__cta" :href="ctaHref">{{ ctaLabel }}
                <span class="nq-hero-section__cta-arrow">&#8599;</span></a>

            <div v-if="showPartners" class="nq-hero-section__partners">
                <span class="nq-hero-section__partners-label">Works with</span>
                <span class="nq-hero-section__partner">
                    <svg width="20" height="18" viewBox="0 0 20 18" fill="none" aria-hidden="true">
                        <path d="M19.4 8 15.5 1.2A2 2 0 0 0 13.8.2H6.2a2 2 0 0 0-1.7 1L.6 8a2 2 0 0 0 0 2l3.9 6.8a2 2 0 0 0 1.7 1h7.6a2 2 0 0 0 1.7-1l3.9-6.8a2 2 0 0 0 0-2Z" stroke="#fff" stroke-width="1.6"/>
                    </svg>
                    <span class="nq-hero-section__partner-name">CryptoPayment Link</span>
                </span>
                <span class="nq-hero-section__partner">
                    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="11" fill="#fff"/>
                        <text x="12" y="16.6" text-anchor="middle" font-family="Mulish, sans-serif" font-size="13" font-weight="800" fill="#1f2348">&#8383;</text>
                    </svg>
                </span>
                <span class="nq-hero-section__partner">
                    <span class="nq-hero-section__partner-name nq-hero-section__partner-name--mark">NAKA</span>
                </span>
                <span class="nq-hero-section__partner">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10.2" stroke="#fff" stroke-width="1.6"/>
                        <circle cx="12" cy="12" r="4.4" stroke="#fff" stroke-width="1.6"/>
                    </svg>
                </span>
            </div>
        </div>
    </section>
</template>

<style src="../html/hero-section.css"></style>
