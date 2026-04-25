/* aboutScript.js — About page animations.
   Exposes window.initAbout() so router.js can call it after an SPA swap.
   Also auto-runs on hard load if .about-page is already in the DOM.
*/

window.initAbout = function initAbout() {
    if (!window.gsap) return;
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    gsap.fromTo('.about-header',
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.12 }
    );

    gsap.fromTo(['#panel-1', '#panel-2', '#panel-3'],
        { opacity: 0, y: 34 },
        {
            opacity: 1, y: 0,
            duration: 0.6, ease: 'power3.out', stagger: 0.1, delay: 0.22,
            scrollTrigger: { trigger: '.about-grid', start: 'top 88%', once: true }
        }
    );

    gsap.fromTo('#about-stats',
        { opacity: 0, y: 22 },
        {
            opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
            scrollTrigger: { trigger: '#about-stats', start: 'top 92%', once: true }
        }
    );

    gsap.fromTo('.feature-list li',
        { opacity: 0, x: -12 },
        {
            opacity: 1, x: 0, duration: 0.38, ease: 'power2.out', stagger: 0.07,
            scrollTrigger: { trigger: '#panel-2', start: 'top 84%', once: true }
        }
    );

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
};

/* Auto-run on hard load */
(function () {
    function tryInit() {
        if (document.querySelector('.about-page')) initAbout();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
