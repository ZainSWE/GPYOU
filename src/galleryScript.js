/* galleryScript.js — GPU gallery with lazy-loaded 3D models + modal.
   Exposes window.initGallery() for the SPA router.
   Auto-runs on hard load if #gallery is in the DOM.

   Key fixes:
   - Waits for model-viewer custom element to be defined before building cards
   - Modal opens at true viewport center (position:fixed + scrollTo guard)
   - IntersectionObserver threshold tuned for immediate-visible cards
*/

window.initGallery = function initGallery() {
    if (!window.gsap || !window.ScrollTrigger) {
        setTimeout(initGallery, 120);
        return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    gallery.innerHTML = '';

    /* ── Inject modal as a direct child of <body> so position:fixed
          is always relative to the true viewport — never to a
          GSAP-transformed #page-content ancestor ── */
    let existingModal = document.getElementById('gpu-modal');
    if (existingModal) existingModal.remove();

    const modalEl = document.createElement('div');
    modalEl.innerHTML = `
        <div class="gpu-modal" id="gpu-modal" style="display:none;">
            <div class="modal-backdrop" id="modal-backdrop"></div>
            <div class="modal-panel" id="modal-panel">
                <div class="modal-header">
                    <span class="modal-eyebrow">GPU Detail View</span>
                    <button class="modal-close" id="modal-close" aria-label="Close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="modal-viewer-wrap">
                        <model-viewer
                            id="modal-viewer"
                            camera-controls
                            auto-rotate
                            shadow-intensity="0"
                            exposure="1.1"
                            camera-orbit="30deg 80deg auto"
                            interaction-prompt="none"
                        ></model-viewer>
                    </div>
                    <div class="modal-info" id="modal-info"></div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalEl.firstElementChild);

    /* ── Mark body so CSS can blur the models page background ── */
    document.body.classList.add('models-active');

    let modalOpen = false;

    /* ── Wait for model-viewer to be registered, THEN build cards ── */
    const buildWhenReady = (gpus) => {
        if (window.customElements && typeof customElements.whenDefined === 'function') {
            customElements.whenDefined('model-viewer').then(() => buildCards(gpus));
        } else {
            /* Fallback: small delay */
            setTimeout(() => buildCards(gpus), 300);
        }
    };

    function buildCards(gpus) {
        gpus.forEach((gpu, i) => {
            const card = document.createElement('div');
            card.className = 'gpu-card';
            card.setAttribute('data-index', i);

            card.innerHTML = `
                <div class="card-viewer-wrap">
                    <div class="viewer-placeholder" id="placeholder-${i}"></div>
                    <model-viewer
                        data-src="models/${gpu.Name}.glb"
                        alt="${gpu.Name}"
                        camera-orbit="30deg 80deg auto"
                        camera-controls
                        disable-zoom
                        interaction-prompt="none"
                        shadow-intensity="0"
                        exposure="1.1"
                        style="background:transparent;--poster-color:transparent;"
                    ></model-viewer>
                </div>
                <div class="gpu-info">
                    <h3>${gpu.Name}</h3>
                    <div class="card-meta">
                        <span class="card-company">${gpu.Company}</span>
                        <span class="card-price">$${gpu.Price}</span>
                    </div>
                    <button class="expand-btn" data-index="${i}">
                        Details
                        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M7 17L17 7M17 7H7M17 7v10"/>
                        </svg>
                    </button>
                </div>
            `;

            gallery.appendChild(card);
        });

        /* ── Lazy-load models: trigger 400px before entering viewport ── */
        const modelObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const mv = entry.target.querySelector('model-viewer');
                if (mv && !mv.getAttribute('src') && mv.dataset.src) {
                    mv.setAttribute('src', mv.dataset.src);
                    mv.addEventListener('load', () => {
                        const ph = entry.target.querySelector('.viewer-placeholder');
                        if (ph) gsap.to(ph, { opacity: 0, duration: 0.4, onComplete: () => ph.remove() });
                    }, { once: true });
                }
                modelObserver.unobserve(entry.target);
            });
        }, {
            rootMargin: '400px 0px',  /* load well before visible */
            threshold: 0
        });

        /* ── GSAP scroll-reveal + hover ── */
        gallery.querySelectorAll('.gpu-card').forEach((card, i) => {
            modelObserver.observe(card);

            const mv = card.querySelector('model-viewer');

            card.addEventListener('mouseenter', () => {
                if (mv) mv.setAttribute('auto-rotate', '');
                gsap.to(card, { y: -6, duration: 0.28, ease: 'power2.out' });
            });
            card.addEventListener('mouseleave', () => {
                if (mv) mv.removeAttribute('auto-rotate');
                gsap.to(card, { y: 0, duration: 0.32, ease: 'power2.out' });
            });

            ScrollTrigger.create({
                trigger: card,
                start: 'top 95%',
                once: true,
                onEnter: () => {
                    gsap.fromTo(card,
                        { opacity: 0, y: 28 },
                        { opacity: 1, y: 0, duration: 0.5, delay: (i % 5) * 0.06, ease: 'power3.out' }
                    );
                }
            });

            card.querySelector('.expand-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(gpus[i]);
            });
        });

        /* ── Modal open ── */
        function openModal(gpu) {
            if (modalOpen) return;
            modalOpen = true;

            const modal    = document.getElementById('gpu-modal');
            const backdrop = document.getElementById('modal-backdrop');
            const panel    = document.getElementById('modal-panel');
            const mv       = document.getElementById('modal-viewer');
            const info     = document.getElementById('modal-info');

            /* Load model */
            mv.setAttribute('src', `models/${gpu.Name}.glb`);

            /* Populate info */
            info.innerHTML = `
                <h2 class="modal-gpu-name">${gpu.Name}</h2>
                <div class="modal-divider"></div>
                <div class="specs-grid">
                    <div class="spec-item">
                        <span class="spec-label">Price</span>
                        <span class="spec-value highlight">$${gpu.Price}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Manufacturer</span>
                        <span class="spec-value">${gpu.Company}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">VRAM</span>
                        <span class="spec-value">${gpu.Memory}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Release Date</span>
                        <span class="spec-value">${gpu.Date}</span>
                    </div>
                    <div class="spec-item full-width">
                        <span class="spec-label">Performance Overview</span>
                        <span class="spec-value" style="font-size:13px;color:rgba(200,210,230,0.6);line-height:1.65;">${gpu.Performance}</span>
                    </div>
                </div>
                <a class="modal-cta" href="index.html">
                    Get Recommended
                    <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </a>
            `;

            /* Show modal — MUST set display:flex before GSAP so flex centering works */
            modal.style.display = 'flex';

            /* Lock scroll so the modal stays centered */
            document.body.style.overflow = 'hidden';
            if (window._lenis) window._lenis.stop();

            gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' });
            gsap.fromTo(panel,
                { opacity: 0, scale: 0.95, y: 24 },
                { opacity: 1, scale: 1, y: 0, duration: 0.38, ease: 'power3.out' }
            );
        }

        /* ── Modal close ── */
        function closeModal() {
            if (!modalOpen) return;
            const modal    = document.getElementById('gpu-modal');
            const backdrop = document.getElementById('modal-backdrop');
            const panel    = document.getElementById('modal-panel');
            const mv       = document.getElementById('modal-viewer');

            gsap.to(backdrop, { opacity: 0, duration: 0.22 });
            gsap.to(panel, {
                opacity: 0, scale: 0.97, y: 12,
                duration: 0.25, ease: 'power2.in',
                onComplete: () => {
                    modal.style.display = 'none';
                    mv.setAttribute('src', '');
                    modalOpen = false;

                    /* Restore scroll */
                    document.body.style.overflow = '';
                    if (window._lenis) window._lenis.start();
                }
            });
        }

        const closeBtn = document.getElementById('modal-close');
        const bdrop    = document.getElementById('modal-backdrop');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (bdrop)    bdrop.addEventListener('click', closeModal);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    }

    /* ── Fetch GPU data ── */
    fetch('dataset/gpuData.json')
        .then(res => res.json())
        .then(gpus => buildWhenReady(gpus))
        .catch(err => console.error('[galleryScript] Failed to load GPU data:', err));
};

/* Auto-run on hard load */
(function () {
    function tryInit() {
        if (document.getElementById('gallery')) initGallery();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
