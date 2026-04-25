/* router.js — Lightweight SPA router
   - Intercepts navbar link clicks (no full page reload)
   - Fetches target page once, caches it in memory
   - Swaps #page-content with a GSAP crossfade
   - Re-runs per-page init scripts after swap
   - Updates URL + browser history (back/forward works)
   - Navbar stays mounted the whole time
*/

(function () {

    /* ── Page cache: url → { head extras, content HTML, scripts[] } ── */
    const cache = new Map();

    /* ── Per-page init registry ── */
    /* Each page registers its own boot function here.
       router.js calls the right one after a swap. */
    const PAGE_INITS = {
        'index.html': bootIndex,
        '':           bootIndex,
        'model.html': bootModels,
        'about.html': bootAbout,
    };

    /* ── Wrapper selector ── */
    const CONTENT_SEL = '#page-content';

    /* ── Transition duration (ms) ── */
    const FADE_MS = 140;

    /* ══════════════════════════════════════════
       INTERCEPT NAVBAR CLICKS
    ══════════════════════════════════════════ */

    function init() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.navbar a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#')) return;

            /* Same page — just update active state, don't navigate */
            const current = location.pathname.split('/').pop() || 'index.html';
            if (href === current) {
                e.preventDefault();
                return;
            }

            e.preventDefault();
            navigate(href);
        });

        /* Handle browser back/forward */
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.url) {
                navigate(e.state.url, false);
            }
        });

        /* Seed cache with current page so back-nav is instant */
        const currentURL = location.pathname.split('/').pop() || 'index.html';
        const content = document.querySelector(CONTENT_SEL);
        if (content) {
            cache.set(currentURL, {
                html:    content.innerHTML,
                title:   document.title,
            });
        }

        /* Push initial state */
        history.replaceState({ url: currentURL }, '', location.href);
    }

    /* ══════════════════════════════════════════
       NAVIGATE
    ══════════════════════════════════════════ */

    async function navigate(url, pushState = true) {
        const content = document.querySelector(CONTENT_SEL);
        if (!content) return;

        /* 1. Fade out current content */
        await fadeOut(content);

        /* 2. Fetch (or retrieve from cache) */
        let page = cache.get(url);
        if (!page) {
            try {
                const res  = await fetch(url);
                const text = await res.text();
                page = parse(text);
                cache.set(url, page);
            } catch (err) {
                console.error('[router] fetch failed:', err);
                fadeIn(content);
                return;
            }
        }

        /* 3. Swap content */
        content.innerHTML = page.html;
        document.title    = page.title;

        /* 4. Update active nav link */
        setActiveLink(url);

        /* 5. Push history */
        if (pushState) {
            history.pushState({ url }, '', url);
        }

        /* 6. Scroll to top */
        window.scrollTo(0, 0);
        if (window._lenis) window._lenis.scrollTo(0, { immediate: true });

        /* 7. Run page-specific init */
        const key  = url === '' ? 'index.html' : url;
        const boot = PAGE_INITS[key];
        if (typeof boot === 'function') boot();

        /* 8. Re-bind shared animations (navbar interactions persist,
              but per-page entrance animations need re-triggering) */
        if (window.runPageAnimations) runPageAnimations();

        /* 9. Fade in */
        fadeIn(content);
    }

    /* ══════════════════════════════════════════
       PARSE FETCHED HTML
    ══════════════════════════════════════════ */

    function parse(html) {
        const doc     = new DOMParser().parseFromString(html, 'text/html');
        const content = doc.querySelector(CONTENT_SEL);
        return {
            html:  content ? content.innerHTML : '',
            title: doc.title,
        };
    }

    /* ══════════════════════════════════════════
       TRANSITIONS
    ══════════════════════════════════════════ */

    function fadeOut(el) {
        return new Promise(resolve => {
            if (window.gsap) {
                gsap.to(el, {
                    opacity: 0,
                    duration: FADE_MS / 1000,
                    ease: 'power2.in',
                    onComplete: resolve
                });
            } else {
                el.style.opacity = '0';
                setTimeout(resolve, FADE_MS);
            }
        });
    }

    function fadeIn(el) {
        if (window.gsap) {
            gsap.fromTo(el,
                { opacity: 0 },
                { opacity: 1, duration: FADE_MS / 1000 * 1.4, ease: 'power2.out' }
            );
        } else {
            el.style.opacity = '1';
        }
    }

    /* ══════════════════════════════════════════
       ACTIVE LINK
    ══════════════════════════════════════════ */

    function setActiveLink(url) {
        document.querySelectorAll('.navbar a').forEach(a => {
            const href = a.getAttribute('href') || '';
            a.classList.toggle('active', href === url || (url === '' && href === 'index.html'));
        });
    }

    /* ══════════════════════════════════════════
       PER-PAGE BOOT FUNCTIONS
       Called after content is swapped in.
    ══════════════════════════════════════════ */

    function teardownModels() {
        document.body.classList.remove('models-active');
        const m = document.getElementById('gpu-modal');
        if (m && m.parentNode === document.body) m.remove();
    }

    function bootIndex() {
        teardownModels();

        /* Reset canvas to off-screen start position on mobile */
        const bgc = document.getElementById('bg-canvas');
        if (bgc && window.matchMedia('(max-width: 768px)').matches) {
            bgc.style.transform = 'translateX(100vw)';
        }
        /* Re-build question flow */
        if (typeof buildQuestionFlow === 'function') {
            buildQuestionFlow();
        }

        /* Re-init bgCanvas if canvas exists */
        /* (canvas is inside #page-content on index, gets re-created on swap) */
        /* bgCanvas auto-inits on DOMContentLoaded; for SPA we re-run manually */
        if (typeof initBgCanvas === 'function') {
            initBgCanvas();
        }

        /* Hero entrance */
        if (window.gsap && document.querySelector('.hero-left')) {
            const tl = gsap.timeline({ delay: 0.05 });
            tl
            .fromTo('.hero-eyebrow',
                { opacity: 0, x: -22 },
                { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' }
            )
            .fromTo('.website-name',
                { opacity: 0, y: 36, skewY: 2 },
                { opacity: 1, y: 0, skewY: 0, duration: 0.7, ease: 'power3.out' },
                '-=0.25'
            )
            .fromTo('.website-sub',
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
                '-=0.35'
            )
            .fromTo('.scrollButton',
                { opacity: 0, y: 12, scale: 0.96 },
                { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.4)' },
                '-=0.3'
            );
        }

        /* Re-bind scroll button */
        const btn = document.querySelector('.scrollButton');
        if (btn) {
            btn.onclick = () => {
                const target = document.getElementById('firstQuestion');
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
        }

        /* Lazy-load model-viewer watcher for page2 */
        setupModelViewerLazyLoad();
    }

    function bootModels() {
        /* galleryScript.js exposes initGallery() */
        if (typeof initGallery === 'function') {
            initGallery();
        }

        if (window.gsap && document.querySelector('.models-header')) {
            const tl = gsap.timeline({ delay: 0.05 });
            tl
            .fromTo('.models-eyebrow',
                { opacity: 0, x: -18 },
                { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' }
            )
            .fromTo('.models-title',
                { opacity: 0, y: 28, skewY: 1 },
                { opacity: 1, y: 0, skewY: 0, duration: 0.58, ease: 'power3.out' },
                '-=0.2'
            )
            .fromTo('.models-sub',
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
                '-=0.25'
            );
        }
    }

    function bootAbout() {
        teardownModels();
        /* aboutScript.js exposes initAbout() */
        if (typeof initAbout === 'function') {
            initAbout();
        }

        if (window.gsap && document.querySelector('.about-header')) {
            const tl = gsap.timeline({ delay: 0.05 });
            tl
            .fromTo('.about-eyebrow',
                { opacity: 0, x: -18 },
                { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' }
            )
            .fromTo('.about-title',
                { opacity: 0, y: 28, skewY: 1 },
                { opacity: 1, y: 0, skewY: 0, duration: 0.58, ease: 'power3.out' },
                '-=0.2'
            );

            /* Panels */
            gsap.fromTo(['#panel-1', '#panel-2', '#panel-3'],
                { opacity: 0, y: 32 },
                {
                    opacity: 1, y: 0,
                    duration: 0.55, ease: 'power3.out',
                    stagger: 0.1, delay: 0.22,
                    scrollTrigger: { trigger: '.about-grid', start: 'top 88%', once: true }
                }
            );

            gsap.fromTo('#about-stats',
                { opacity: 0, y: 20 },
                {
                    opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
                    scrollTrigger: { trigger: '#about-stats', start: 'top 92%', once: true }
                }
            );

            gsap.fromTo('.feature-list li',
                { opacity: 0, x: -12 },
                {
                    opacity: 1, x: 0, duration: 0.38, ease: 'power2.out',
                    stagger: 0.07,
                    scrollTrigger: { trigger: '#panel-2', start: 'top 84%', once: true }
                }
            );

            /* Count-up */
            document.querySelectorAll('.stat-block-num').forEach(el => {
                const raw = el.textContent.trim();
                const num = parseInt(raw);
                if (isNaN(num)) return;
                const suffix = raw.replace(String(num), '');
                el.textContent = '0' + suffix;
                ScrollTrigger.create({
                    trigger: '#about-stats',
                    start: 'top 90%',
                    once: true,
                    onEnter: () => {
                        gsap.to({ val: 0 }, {
                            val: num, duration: 1.2, ease: 'power2.out',
                            onUpdate: function () {
                                el.textContent = Math.round(this.targets()[0].val) + suffix;
                            }
                        });
                    }
                });
            });
        }
    }

    /* ══════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════ */

    function setupModelViewerLazyLoad() {
        const page2 = document.getElementById('page2');
        if (!page2) return;
        const obs = new MutationObserver(() => {
            if (page2.classList.contains('visible')) {
                if (!document.querySelector('script[src*="model-viewer"]')) {
                    const s = document.createElement('script');
                    s.type = 'module';
                    s.src  = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
                    document.head.appendChild(s);
                }
                obs.disconnect();
            }
        });
        obs.observe(page2, { attributes: true, attributeFilter: ['class'] });
    }

    /* ── Kick off ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
