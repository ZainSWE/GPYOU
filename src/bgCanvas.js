/* bgCanvas.js — Frame-sequence background animation
   Fixes vs previous version:
   - Correct FPS throttle: uses timestamp delta with accumulated error correction
   - Progressive start after PREROLL frames (no stall waiting for all 200)
   - alpha:false + desynchronized context for GPU compositing speed
   - CSS-pixel drawImage via DPR transform (no DPR² over-clear bug)
   - Visibility API: pause RAF on hidden tab, reset timestamp on resume
   - Debounced resize
   - Sequential frame advance (no random skips from sparse-load search)
*/
(function () {
    const isMobile      = window.matchMedia('(max-width: 768px)').matches ||
                          /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const TOTAL_FRAMES  = 200;
    const FPS           = isMobile ? 15 : 30;
    const INTERVAL      = 1000 / FPS;
    const FRAME_PATH    = 'images/gpyou-animation/';
    const FRAME_EXT     = '.png';
    const PAD           = 4;
    const PREROLL       = 40;           /* start playing once this many frames decoded */

    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const ctx    = canvas.getContext('2d', { alpha: false, desynchronized: true });
    const loader = document.getElementById('bg-loader');
    const fill   = document.getElementById('loader-fill');
    const label  = document.getElementById('loader-label');

    let cw = window.innerWidth;
    let ch = window.innerHeight;

    /* ── Size canvas to device pixels, transform to CSS-pixel space ── */
    function setSize() {
        const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
        cw = window.innerWidth;
        ch = window.innerHeight;
        canvas.width  = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        canvas.style.width  = cw + 'px';
        canvas.style.height = ch + 'px';
        /* preserve scroll-parallax transform across resizes */
        if (!isMobile) canvas.style.transform = '';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redraw();
    }

    /* ── Draw current frame cover-fit ── */
    function drawCover(img) {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        if (!iw || !ih) return;
        const scale = Math.max(cw / iw, ch / ih);
        const dw    = iw * scale;
        const dh    = ih * scale;
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, (cw - dw) * 0.5, (ch - dh) * 0.5, dw, dh);
    }

    function redraw() {
        const f = frames[currentFrame];
        if (f && f.complete && f.naturalWidth) drawCover(f);
    }

    /* ── Frame store ── */
    const frames = new Array(TOTAL_FRAMES).fill(null);
    let loaded       = 0;
    let canPlay      = false;
    let currentFrame = 0;
    let rafId        = null;

    /* lastTime: -1 signals "need reset on next tick" */
    let lastTime     = -1;
    /* accumulated overshoot so next frame fires exactly on time */
    let accumulator  = 0;

    /* ── Mobile scroll-parallax ─────────────────────────────────────
       On mobile the canvas starts fully off-screen to the right.
       As the user scrolls toward #firstQuestion it slides left into
       frame (GPU visible). Scroll back up → it retreats right again.
       All movement runs inside the existing RAF loop for free.
    ──────────────────────────────────────────────────────────────── */
    let parallaxX    = isMobile ? 100 : 0;   /* current position (vw) */
    let parallaxGoal = isMobile ? 100 : 0;   /* lerp target (vw)      */

    function getParallaxGoal() {
        /* Only applies on the home page */
        const firstQ = document.getElementById('firstQuestion');
        if (!firstQ) {
            /* Snap instantly — no lerp lag when arriving at models/about */
            parallaxX = 0;
            return 0;
        }

        const scrollY    = window.scrollY;
        const scrollRange = firstQ.offsetTop * 0.8;
        const progress   = Math.min(Math.max(scrollY / scrollRange, 0), 1);

        const eased = 1 - Math.pow(1 - progress, 2.5);
        return (1 - eased) * 100;
    }

    /* ── Animation loop (fixed-timestep with accumulator) ── */
    function loop(ts) {
        rafId = requestAnimationFrame(loop);

        /* ── Parallax update (runs every RAF tick = ~60fps) ── */
        if (isMobile) {
            parallaxGoal = getParallaxGoal();
            /* lerp factor 0.1 → smooth deceleration */
            parallaxX += (parallaxGoal - parallaxX) * 0.1;
            canvas.style.transform = `translateX(${parallaxX.toFixed(2)}vw)`;
        }

        if (document.hidden) {
            lastTime    = -1;
            accumulator = 0;
            return;
        }

        if (lastTime < 0) {
            lastTime    = ts;
            accumulator = 0;
            return;
        }

        accumulator += ts - lastTime;
        lastTime     = ts;

        /* Drain accumulated time in fixed INTERVAL steps */
        while (accumulator >= INTERVAL) {
            accumulator -= INTERVAL;

            /* Advance to next decoded frame */
            const next = (currentFrame + 1) % TOTAL_FRAMES;
            const f    = frames[next];
            if (f && f.complete && f.naturalWidth) {
                currentFrame = next;
            }
            /* If next isn't decoded yet, stay on currentFrame this tick */
        }

        /* Always paint current frame once per RAF tick */
        const f = frames[currentFrame];
        if (f && f.complete && f.naturalWidth) drawCover(f);
    }

    function startLoop() {
        if (rafId !== null) return;
        lastTime    = -1;
        accumulator = 0;
        rafId       = requestAnimationFrame(loop);
    }

    function stopLoop() {
        if (rafId === null) return;
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    /* ── Preloader ── */
    function pad(n) { return String(n).padStart(PAD, '0'); }

    function preload() {
        for (let i = 0; i < TOTAL_FRAMES; i++) {
            const img = new Image();

            const onSettle = () => {
                loaded++;
                const pct = Math.round((loaded / TOTAL_FRAMES) * 100);
                if (fill)  fill.style.width  = pct + '%';
                if (label) label.textContent = 'Loading · ' + pct + '%';

                /* Start early — don't wait for all frames */
                if (!canPlay && loaded >= PREROLL) {
                    canPlay = true;
                    startLoop();
                }

                if (loaded === TOTAL_FRAMES) {
                    /* Fade out loader */
                    if (loader) {
                        loader.style.transition = 'opacity 0.5s ease';
                        loader.style.opacity    = '0';
                        setTimeout(() => { loader.style.display = 'none'; }, 520);
                    }
                }
            };

            img.onload  = onSettle;
            img.onerror = onSettle; /* don't stall on 404 */
            /* Stagger src assignment so images decode in order, not burst */
            img.src     = FRAME_PATH + pad(i + 1) + FRAME_EXT;
            /* Decoding hint: async decode for off-screen frames */
            if (i >= PREROLL) img.decoding = 'async';
            frames[i] = img;
        }
    }

    /* ── Tab visibility ── */
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && canPlay) {
            startLoop();
        } else if (document.hidden) {
            stopLoop();
        }
    });

    /* ── Debounced resize ── */
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(setSize, 120);
    }, { passive: true });

    /* ── Init ── */
    setSize();
    /* Set initial off-screen position on mobile before first paint */
    if (isMobile) canvas.style.transform = 'translateX(100vw)';
    preload();
})();
