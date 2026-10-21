/**
 * Platforms Stage — interactive cinematic slider
 * =================================================
 * Drives the "NUESTRAS PLATAFORMAS" stage:
 *  - a glowing pill slider with a draggable thumb
 *  - 3D cards that respond to the pointer and to the scroll position
 *  - swipe / drag gestures on touch devices
 *  - parallax backdrops, light trails and accent cross-fades
 */
(function () {
  'use strict';

  function initPlatformsStage() {
    const stage = document.querySelector('[data-platforms-stage]');
    if (!stage) return;

    const viewport = stage.querySelector('[data-platforms-viewport]');
    const track = stage.querySelector('[data-platforms-track]');
    const slider = stage.querySelector('[data-platforms-slider]');
    const sliderTrack = stage.querySelector('[data-platforms-track-pill]');
    const thumb = stage.querySelector('[data-platforms-thumb]');
    const grip = stage.querySelector('[data-platforms-grip]');
    const options = Array.prototype.slice.call(stage.querySelectorAll('[data-platforms-option]'));
    const dots = Array.prototype.slice.call(stage.querySelectorAll('[data-platforms-dot]'));
    const cards = Array.prototype.slice.call(stage.querySelectorAll('[data-platform-card]'));
    const wraps = Array.prototype.slice.call(stage.querySelectorAll('[data-platform-card-wrap]'));
    const arrows = Array.prototype.slice.call(stage.querySelectorAll('[data-platforms-arrow]'));
    const hint = stage.querySelector('[data-platforms-hint]');
    const orbs = Array.prototype.slice.call(stage.querySelectorAll('[data-platforms-parallax]'));

    if (!slider || !thumb || !cards.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches;

    const LABELS = ['Travel Mexico', 'Hospitality Cancún'];
    let index = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragDelta = 0;
    let axisLocked = null;
    let pointerId = null;
    let suppressGripClick = false;
    let dragBase = null;
    let dragBaseOffset = 0;

    /* ---------------------------------------------------------
       Slider geometry — the thumb and the grip are positioned in
       pixels so the two can be driven independently while dragging
    --------------------------------------------------------- */
    function segmentMetrics() {
      const el = sliderTrack || thumb.parentElement;
      const cs = getComputedStyle(el);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      // The thumb is absolutely positioned, so its percentages resolve
      // against the pill's padding box — the segment width uses that base.
      const boxW = el.clientWidth;
      const thumbW = boxW / 2 - 8;
      return { padL, padR, boxW, thumbW, maxOffset: thumbW + 4 };
    }

    function setSliderOffset(offset) {
      slider.style.setProperty('--seg-x', offset.toFixed(2) + 'px');
      // the handle circle sits 14px inside the leading edge of the segment
      slider.style.setProperty('--grip-x', (offset - 2).toFixed(2) + 'px');
    }

    function syncSliderOffset() {
      const m = segmentMetrics();
      setSliderOffset(index === 0 ? 0 : m.maxOffset);
    }

    /* ---------------------------------------------------------
       State helpers
    --------------------------------------------------------- */
    function isMobileLayout() {
      return window.matchMedia('(max-width: 900px)').matches;
    }

    function setIndex(next, opts) {
      const o = opts || {};
      next = next === 0 ? 0 : 1;
      if (next === index && !o.force) return;

      const previous = index;
      index = next;

      stage.setAttribute('data-active', String(index));
      slider.setAttribute('data-index', String(index));

      cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
      options.forEach((opt, i) => {
        opt.classList.toggle('is-active', i === index);
        opt.setAttribute('aria-pressed', i === index ? 'true' : 'false');
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
        dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });

      grip.setAttribute('aria-valuenow', String(index + 1));
      grip.setAttribute('aria-valuetext', LABELS[index]);

      if (!dragging) syncSliderOffset();

      if (previous !== index && !prefersReducedMotion) {
        haptic(12);
        pulseTrail();
      }

      if (isMobileLayout()) applyCarouselOffset();
      if (o.announce !== false) hideHint();
    }

    function haptic(ms) {
      if (isTouch && navigator.vibrate) {
        try { navigator.vibrate(ms); } catch (e) { /* not supported */ }
      }
    }

    function pulseTrail() {
      const trail = stage.querySelector('[data-platforms-trail]');
      if (!trail || prefersReducedMotion) return;
      trail.classList.remove('is-pulsing');
      // force a reflow so the animation restarts
      void trail.offsetWidth;
      trail.classList.add('is-pulsing');
    }

    /* ---------------------------------------------------------
       Swipe hint
    --------------------------------------------------------- */
    let hintTimer = null;
    let hintShown = false;

    function showHint() {
      if (hintShown || !hint || !isMobileLayout()) return;
      hintShown = true;
      hint.classList.add('is-visible');
      hintTimer = setTimeout(hideHint, 5200);
    }

    function hideHint() {
      if (!hint) return;
      hint.classList.remove('is-visible');
      if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
    }

    /* ---------------------------------------------------------
       Mobile carousel offset
    --------------------------------------------------------- */
    function applyCarouselOffset() {
      if (!track || !isMobileLayout()) return;
      const viewportW = viewport.clientWidth;
      const ref = wraps[0] || cards[0];
      const cardW = ref ? ref.offsetWidth : viewportW;
      const gap = parseFloat(window.getComputedStyle(track).columnGap || '18') || 18;
      const step = cardW + gap;
      track.style.transform = 'translate3d(' + (-index * step) + 'px, 0, 0)';
    }

    /* ---------------------------------------------------------
       Slider grip dragging (mouse + touch)
    --------------------------------------------------------- */
    function onThumbDown(e) {
      dragging = true;
      axisLocked = null;
      pointerId = e.pointerId;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragDelta = 0;
      dragBase = segmentMetrics();
      dragBaseOffset = index === 0 ? 0 : dragBase.maxOffset;
      thumb.setAttribute('data-dragging', '1');
      thumb.classList.add('is-dragging');
      grip.classList.add('is-dragging');
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
      e.preventDefault();
    }

    function onThumbMove(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dragDelta = e.clientX - dragStartX;

      const offset = Math.min(dragBase.maxOffset, Math.max(0, dragBaseOffset + dragDelta));
      setSliderOffset(offset);

      // Preview the switch while dragging
      const preview = offset > dragBase.maxOffset / 2 ? 1 : 0;
      if (preview !== index) {
        index = preview;
        stage.setAttribute('data-active', String(index));
        cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
        options.forEach((opt, i) => {
          opt.classList.toggle('is-active', i === index);
          opt.setAttribute('aria-pressed', i === index ? 'true' : 'false');
        });
        dots.forEach((dot, i) => {
          dot.classList.toggle('is-active', i === index);
          dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
        });
      }
      e.preventDefault();
    }

    function onThumbUp(e) {
      if (!dragging) return;
      dragging = false;
      thumb.removeAttribute('data-dragging');
      thumb.classList.remove('is-dragging');
      grip.classList.remove('is-dragging');
      if (pointerId !== null) {
        try { grip.releasePointerCapture(pointerId); } catch (err) { /* not supported */ }
        pointerId = null;
      }
      const next = dragDelta > 12 ? 1 : dragDelta < -12 ? 0 : index;
      if (Math.abs(dragDelta) > 12) suppressGripClick = true;
      setIndex(next, { force: true });
      dragDelta = 0;
    }

    grip.addEventListener('pointerdown', onThumbDown);
    grip.addEventListener('pointermove', onThumbMove);
    grip.addEventListener('pointerup', onThumbUp);
    grip.addEventListener('pointercancel', onThumbUp);

    // Clicking the grip toggles between the two platforms (but not when the
    // gesture was actually a drag)
    grip.addEventListener('click', () => {
      if (suppressGripClick) { suppressGripClick = false; return; }
      setIndex(index === 0 ? 1 : 0);
    });

    // Keyboard support
    grip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        setIndex(1); e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        setIndex(0); e.preventDefault();
      } else if (e.key === 'Home') {
        setIndex(0); e.preventDefault();
      } else if (e.key === 'End') {
        setIndex(1); e.preventDefault();
      }
    });

    options.forEach((opt, i) => {
      opt.addEventListener('click', () => setIndex(i));
    });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => setIndex(i));
    });

    arrows.forEach((arrow) => {
      arrow.addEventListener('click', () => {
        setIndex(arrow.getAttribute('data-platforms-arrow') === 'next' ? 1 : 0);
      });
    });

    /* ---------------------------------------------------------
       Swipe on the stage (touch)
    --------------------------------------------------------- */
    if (viewport) {
      viewport.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        if (e.target.closest('a, button')) return;
        axisLocked = null;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragDelta = 0;
      }, { passive: true });

      viewport.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse') return;
        if (e.target.closest('a, button')) return;

        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        // Lock the gesture axis so vertical scrolling keeps working
        if (axisLocked === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
          axisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }
        if (axisLocked !== 'x') return;
        dragDelta = dx;
      }, { passive: true });

      viewport.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'mouse') return;
        if (axisLocked !== 'x') { axisLocked = null; return; }
        const threshold = Math.max(48, viewport.clientWidth * 0.14);
        if (dragDelta <= -threshold) setIndex(1);
        else if (dragDelta >= threshold) setIndex(0);
        dragDelta = 0;
        axisLocked = null;
      }, { passive: true });

      viewport.addEventListener('pointercancel', () => {
        dragDelta = 0;
        axisLocked = null;
      }, { passive: true });
    }

    /* ---------------------------------------------------------
       Cursor-reactive tilt + magnetic hover
    --------------------------------------------------------- */
    if (!isTouch && !prefersReducedMotion) {
      cards.forEach((card) => {
        card.addEventListener('pointermove', (e) => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          // dedicated variables — `--card-local-*` belongs to the shared
          // smoke-hover engine, which writes pixel values here
          card.style.setProperty('--platform-local-x', `${(px * 100).toFixed(1)}%`);
          card.style.setProperty('--platform-local-y', `${(py * 100).toFixed(1)}%`);
          card.style.setProperty('--tilt-y', `${((px - 0.5) * 9).toFixed(2)}deg`);
          card.style.setProperty('--tilt-x', `${((0.5 - py) * 7).toFixed(2)}deg`);
        }, { passive: true });

        card.addEventListener('pointerleave', () => {
          card.style.setProperty('--tilt-x', '0deg');
          card.style.setProperty('--tilt-y', '0deg');
        }, { passive: true });
      });

      // The slider thumb drifts towards the pointer (magnetic hover)
      slider.addEventListener('pointermove', (e) => {
        if (dragging) return;
        const rect = grip.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const mx = (dx * 0.16).toFixed(1) + 'px';
        const my = (dy * 0.16).toFixed(1) + 'px';
        slider.style.setProperty('--mag-x', mx);
        slider.style.setProperty('--mag-y', my);
      }, { passive: true });

      slider.addEventListener('pointerleave', () => {
        slider.style.setProperty('--mag-x', '0px');
        slider.style.setProperty('--mag-y', '0px');
      }, { passive: true });
    }

    /* ---------------------------------------------------------
       Scroll-triggered reveals + parallax
    --------------------------------------------------------- */
    const revealTweens = [];

    function forceReveal() {
      revealTweens.forEach((t) => {
        if (!t) return;
        if (t.scrollTrigger) t.scrollTrigger.kill();
        t.progress(1);
        t.kill();
      });
      wraps.forEach((w) => { w.style.opacity = '1'; w.style.transform = 'none'; });
      stage.classList.remove('is-armed');
      stage.classList.add('is-revealed');
    }

    if (window.gsap && window.ScrollTrigger && !prefersReducedMotion) {
      const reveal = stage.querySelector('[data-platforms-reveal]');
      if (reveal) {
        revealTweens.push(gsap.from(reveal, {
          scrollTrigger: { trigger: stage, start: 'top 74%' },
          opacity: 0,
          y: 44,
          duration: 1,
          ease: 'power3.out',
          onStart: () => {
            stage.classList.add('is-revealed');
            stage.classList.remove('is-armed');
          }
        }));
      }

      revealTweens.push(gsap.from(wraps, {
        scrollTrigger: { trigger: viewport, start: 'top 84%' },
        opacity: 0,
        y: 70,
        rotateX: 10,
        duration: 1.1,
        stagger: 0.12,
        ease: 'power3.out'
      }));

      revealTweens.push(gsap.from(slider, {
        scrollTrigger: { trigger: slider, start: 'top 94%' },
        opacity: 0,
        y: 30,
        duration: 0.9,
        ease: 'power2.out'
      }));

      // Parallax backdrop
      orbs.forEach((orb) => {
        const depth = parseFloat(orb.getAttribute('data-platforms-parallax')) || 0;
        gsap.to(orb, {
          scrollTrigger: {
            trigger: stage,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8
          },
          y: () => window.innerHeight * depth,
          ease: 'none'
        });
      });

      // Safety net: the stage must never stay invisible. If it is on screen
      // but the trigger never fired, reveal it by hand.
      setTimeout(() => {
        const rect = stage.getBoundingClientRect();
        const onScreen = rect.top < window.innerHeight && rect.bottom > 0;
        if (onScreen && !stage.classList.contains('is-revealed')) forceReveal();
      }, 6000);
    } else {
      stage.classList.add('is-revealed');
    }

    /* ---------------------------------------------------------
       Lifecycle
    --------------------------------------------------------- */
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        syncSliderOffset();
        applyCarouselOffset();
      }, 140);
    }, { passive: true });

    // The hint appears once the stage has been seen
    if (hint && 'IntersectionObserver' in window) {
      const hintObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            showHint();
            hintObserver.disconnect();
          }
        });
      }, { threshold: 0.4 });
      hintObserver.observe(stage);
    }

    // Initial state
    slider.setAttribute('data-index', '0');
    stage.setAttribute('data-active', '0');
    stage.classList.add('is-armed');
    cards[0].classList.add('is-active');
    setIndex(0, { force: true, announce: false });
    syncSliderOffset();
    applyCarouselOffset();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlatformsStage);
  } else {
    initPlatformsStage();
  }
})();
