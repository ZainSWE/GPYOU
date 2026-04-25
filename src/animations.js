/* animations.js — GSAP animations + optional Lenis smooth scroll
   Mobile: Lenis and magnetic effects are skipped entirely.
   All animations run shorter and leaner.
*/

const isMobile = window.matchMedia('(max-width: 768px)').matches ||
                 /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

/* ── Lenis smooth scroll — desktop only ── */
(function initLenis() {
    if (isMobile) return;           /* native scroll is already smooth on mobile */
    if (typeof Lenis === 'undefined') return;

    const lenis = new Lenis({
        duration:        0.55,
        easing:          (t) => 1 - Math.pow(1 - t, 3),
        smoothWheel:     true,
        touchMultiplier: 1.5,
    });

    if (window.gsap) {
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    } else {
        (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
    }

    window._lenis = lenis;
})();

if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
}

/* ── Press effect — CSS class swap is faster than GSAP on mobile ── */
function addPressEffect(btn) {
    if (btn._pressInit) return;
    btn._pressInit = true;

    if (isMobile) {
        /* Use CSS transition — no JS overhead per frame */
        btn.addEventListener('touchstart', () => btn.classList.add('btn-pressed'), { passive: true });
        const release = () => btn.classList.remove('btn-pressed');
        btn.addEventListener('touchend',   release, { passive: true });
        btn.addEventListener('touchcancel',release, { passive: true });
    } else {
        btn.addEventListener('mousedown', () =>
            gsap.to(btn, { scale: 0.94, duration: 0.1, ease: 'power2.out', overwrite: 'auto' })
        );
        const release = () =>
            gsap.to(btn, { scale: 1, duration: 0.22, ease: 'back.out(2)', overwrite: 'auto' });
        btn.addEventListener('mouseup',    release);
        btn.addEventListener('mouseleave', release);
    }
}

/* ── Shared animations (re-called after every SPA swap) ── */
window.runPageAnimations = function runPageAnimations() {

    const pressSelectors = [
        '.scrollButton', '.nav-next', '.nav-back',
        '.expand-btn', '.modal-cta', '.modal-close',
    ];
    pressSelectors.forEach(sel =>
        document.querySelectorAll(sel).forEach(addPressEffect)
    );

    /* Magnetic CTA — desktop only, mobile gets a simple CSS scale */
    if (!isMobile) {
        document.querySelectorAll('.scrollButton').forEach(btn => {
            if (btn._magneticBound) return;
            btn._magneticBound = true;
            btn.addEventListener('mousemove', (e) => {
                const r = btn.getBoundingClientRect();
                gsap.to(btn, {
                    x: (e.clientX - r.left - r.width  / 2) * 0.2,
                    y: (e.clientY - r.top  - r.height / 2) * 0.2,
                    duration: 0.12, ease: 'power2.out', overwrite: 'auto'
                });
            });
            btn.addEventListener('mouseleave', () =>
                gsap.to(btn, { x: 0, y: 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
            );
        });
    }

    /* Input focus glow */
    document.querySelectorAll('.user-input').forEach(inp => {
        if (inp._glowBound) return;
        inp._glowBound = true;
        inp.addEventListener('focus', () =>
            gsap.to(inp, { boxShadow: '0 0 0 3px rgba(0,221,255,0.13)', duration: 0.2, ease: 'power2.out' })
        );
        inp.addEventListener('blur', () =>
            gsap.to(inp, { boxShadow: '0 0 0 0px rgba(0,221,255,0)', duration: 0.25, ease: 'power2.inOut' })
        );
    });

    /* Footer scroll reveal */
    if (!isMobile && window.ScrollTrigger && document.querySelector('footer')) {
        ScrollTrigger.create({
            trigger: 'footer',
            start: 'top 98%',
            once: true,
            onEnter: () => gsap.fromTo('footer',
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
            )
        });
    }
};

/* ── One-time init ── */
(function init() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', firstRun);
    } else {
        firstRun();
    }
})();

function firstRun() {

    /* Navbar reveal */
    gsap.fromTo('.navbar',
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', delay: 0.02 }
    );

    /* Navbar active link */
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar a').forEach(link => {
        const href = link.getAttribute('href') || '';
        const isHome = currentPage === '' || currentPage === 'index.html';
        if (href === currentPage || (isHome && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    /* Navbar hover — desktop only */
    if (!isMobile) {
        document.querySelectorAll('.navbar a').forEach(link => {
            link.addEventListener('mouseenter', () =>
                gsap.to(link, { letterSpacing: '0.18em', duration: 0.15, ease: 'power2.out' })
            );
            link.addEventListener('mouseleave', () =>
                gsap.to(link, { letterSpacing: '0.14em', duration: 0.2, ease: 'power2.inOut' })
            );
        });
    }

    /* MutationObserver: pick up dynamically added buttons */
    const pressObserver = new MutationObserver(() => {
        ['.nav-next', '.nav-back', '.expand-btn', '.modal-cta', '.modal-close'].forEach(sel =>
            document.querySelectorAll(sel).forEach(addPressEffect)
        );
        document.querySelectorAll('.user-input').forEach(inp => {
            if (inp._glowBound) return;
            inp._glowBound = true;
            inp.addEventListener('focus', () =>
                gsap.to(inp, { boxShadow: '0 0 0 3px rgba(0,221,255,0.13)', duration: 0.2 })
            );
            inp.addEventListener('blur', () =>
                gsap.to(inp, { boxShadow: '0 0 0 0px rgba(0,221,255,0)', duration: 0.25 })
            );
        });
    });
    pressObserver.observe(document.body, { childList: true, subtree: true });

    runPageAnimations();

    /* ── Hero entrance ── */
    if (document.querySelector('.hero-left')) {
        const dur  = isMobile ? 0.38 : 0.55;
        const tl   = gsap.timeline({ delay: isMobile ? 0.05 : 0.2 });
        tl
        .fromTo('.hero-eyebrow',
            { opacity: 0, x: -16 },
            { opacity: 1, x: 0, duration: dur, ease: 'power3.out' }
        )
        .fromTo('.website-name',
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: dur * 1.3, ease: 'power3.out' },
            '-=0.2'
        )
        .fromTo('.website-sub',
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: dur, ease: 'power2.out' },
            '-=0.3'
        )
        .fromTo('.scrollButton',
            { opacity: 0, y: 10, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: dur, ease: 'back.out(1.3)' },
            '-=0.25'
        );
    }

    /* ── Models page hard load ── */
    if (document.querySelector('.models-header')) {
        const tl = gsap.timeline({ delay: 0.05 });
        tl
        .fromTo('.models-eyebrow',
            { opacity: 0, x: -14 },
            { opacity: 1, x: 0, duration: 0.38, ease: 'power3.out' }
        )
        .fromTo('.models-title',
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 0.48, ease: 'power3.out' },
            '-=0.18'
        )
        .fromTo('.models-sub',
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
            '-=0.22'
        );
    }

    /* ── About page hard load ── */
    if (document.querySelector('.about-header')) {
        const tl = gsap.timeline({ delay: 0.05 });
        tl
        .fromTo('.about-eyebrow',
            { opacity: 0, x: -14 },
            { opacity: 1, x: 0, duration: 0.38, ease: 'power3.out' }
        )
        .fromTo('.about-title',
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 0.48, ease: 'power3.out' },
            '-=0.18'
        );
    }
}
